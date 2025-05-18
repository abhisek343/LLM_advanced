# LLM_interviewer/server/app/services/search_service.py

import logging
from typing import List, Dict, Optional, Any, Literal, Tuple
from bson import ObjectId
from pydantic import BaseModel, Field, ConfigDict
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import HTTPException, status
import pymongo # Added import

from ..db.mongodb import mongodb # Adjusted
from ..core.config import settings # Adjusted
from ..models.user import User, CandidateMappingStatus, HrStatus # Adjusted

from .resume_analyzer_service import ResumeAnalyzerService # Assuming this will be in the same services folder

from ..schemas.search import RankedHR, RankedCandidate # Adjusted
from ..schemas.user import CandidateProfileOut, HrProfileOut # Adjusted (HrProfileOut was missing)

logger = logging.getLogger(__name__)

class SearchService:
    def __init__(self, db: Optional[AsyncIOMotorClient] = None):
        self.db = db if db is not None else mongodb.get_db()
        if self.db is None:
            raise RuntimeError("Database not available in SearchService.")
        self.user_collection = self.db[settings.MONGODB_COLLECTION_USERS]

    def _get_stored_analysis_data(self, user_doc: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "extracted_skills": user_doc.get("extracted_skills_list", []),
            "estimated_experience_years": user_doc.get("estimated_yoe", 0.0) or 0.0,
        }

    def _calculate_tech_match(
        self, candidate_skills: List[str], required_skills: List[str]
    ) -> float:
        if not required_skills: return 1.0
        if not candidate_skills: return 0.0
        set_candidate = set(s.lower().strip() for s in candidate_skills if s)
        set_required = set(s.lower().strip() for s in required_skills if s)
        intersection = len(set_candidate.intersection(set_required))
        union = len(set_candidate.union(set_required))
        return float(intersection / union) if union > 0 else 0.0

    def _calculate_ranking_score(
        self,
        user_doc: Dict[str, Any],
        extracted_data: Dict[str, Any],
        search_skills: Optional[List[str]] = None,
        mongo_text_score: float = 0.0,
    ) -> float:
        WEIGHT_TECH = 0.70
        WEIGHT_MONGO = 0.30
        extracted_skills = extracted_data.get("extracted_skills", [])
        yoe = extracted_data.get("estimated_experience_years", 0.0)
        tech_match_score = 1.0
        if search_skills:
            tech_match_score = self._calculate_tech_match(extracted_skills, search_skills)
        experience_multiplier = max(1.0, yoe)
        base_score = tech_match_score * experience_multiplier
        combined_score = (WEIGHT_TECH * base_score) + (WEIGHT_MONGO * mongo_text_score)
        return round(combined_score, 4)

    async def search_candidates(
        self,
        keyword: Optional[str] = None,
        required_skills: Optional[List[str]] = None,
        yoe_min: Optional[int] = None,
        limit: int = 20,
    ) -> List[RankedCandidate]:
        logger.info(f"Searching candidates. Keywords: {keyword}, Skills: {required_skills}, YoE Min: {yoe_min}")
        query: Dict[str, Any] = {
            "role": "candidate", "mapping_status": "pending_assignment",
            "estimated_yoe": {"$exists": True}, "extracted_skills_list": {"$exists": True},
            "resume_text": {"$ne": None},
        }
        projection: Optional[Dict[str, Any]] = None
        sort_criteria: List[Tuple[str, Any]] = [("updated_at", -1)]

        if keyword:
            query["$text"] = {"$search": keyword}
            projection = {"mongo_score": {"$meta": "textScore"}}
            sort_criteria = [("mongo_score", {"$meta": "textScore"})]

        if yoe_min is not None:
            yoe_filter = {"estimated_yoe": {"$gte": float(yoe_min)}}
            if "$text" in query or "$and" in query : query.setdefault("$and", []).append(yoe_filter)
            else: query.update(yoe_filter)
            
        if required_skills:
            skills_lower = [skill.lower().strip() for skill in required_skills]
            skill_filter = {"extracted_skills_list": {"$in": skills_lower}}
            if "$text" in query or "$and" in query : query.setdefault("$and", []).append(skill_filter)
            else: query.update(skill_filter)

        try:
            find_query = self.user_collection.find(query, projection=projection if projection else None)
            cursor = find_query.sort(sort_criteria).limit(limit * 3)
            candidates_to_rank = await cursor.to_list(length=None)
        except Exception as e:
            logger.error(f"DB query failed during candidate search: {e}", exc_info=True)
            if isinstance(e, Exception) and "text index required" in str(e).lower():
                if keyword: return []
            raise HTTPException(status_code=500, detail="Database error during candidate search.")

        if not candidates_to_rank: return []
        ranked_list = []
        for cand_doc in candidates_to_rank:
            extracted_data = self._get_stored_analysis_data(cand_doc)
            mongo_score = cand_doc.get("mongo_score", 0.0)
            final_score = self._calculate_ranking_score(
                cand_doc, extracted_data, search_skills=required_skills, mongo_text_score=mongo_score
            )
            try:
                candidate_profile_data = {
                    **cand_doc, "id": str(cand_doc["_id"]),
                    "extracted_skills_list": extracted_data.get("extracted_skills", []),
                    "estimated_yoe": extracted_data.get("estimated_experience_years"),
                }
                ranked_candidate_specific_data = {
                    "relevance_score": final_score,
                    "match_details": {"mongo_text_score": mongo_score}
                }
                final_candidate_data = {**candidate_profile_data, **ranked_candidate_specific_data}
                ranked_list.append(RankedCandidate.model_validate(final_candidate_data))
            except Exception as e:
                logger.error(f"Pydantic validation failed for candidate {cand_doc.get('_id')}: {e}", exc_info=True)
        
        ranked_list.sort(key=lambda x: x.relevance_score if x.relevance_score is not None else 0, reverse=True)
        return ranked_list[:limit]

    async def search_hr_profiles(
        self,
        keyword: Optional[str] = None,
        yoe_min: Optional[int] = None,
        status_filter: Optional[HrStatus] = "profile_complete", # type: ignore
        limit: int = 20,
    ) -> List[RankedHR]:
        logger.info(f"Searching HR profiles. Status: {status_filter}, Keyword: {keyword}, YoE Min: {yoe_min}")
        query: Dict[str, Any] = {"role": "hr"}
        if status_filter: query["hr_status"] = status_filter
        if yoe_min is not None: query["years_of_experience"] = {"$gte": yoe_min}
        
        projection = None
        sort_criteria: List[Tuple[str, Any]] = [("updated_at", -1)]
        if keyword:
            query["resume_text"] = {"$ne": None}
            query["$text"] = {"$search": keyword}
            projection = {"mongo_score": {"$meta": "textScore"}}
            sort_criteria = [("mongo_score", {"$meta": "textScore"})]

        hr_list_docs = [] # Initialize
        try:
            find_query = self.user_collection.find(query, projection=projection if projection else None)
            cursor = find_query.sort(sort_criteria).limit(limit)
            hr_list_docs = await cursor.to_list(length=None) # This line can raise OperationFailure
        
        except pymongo.errors.OperationFailure as op_e:
            logger.error(f"MongoDB OperationFailure during HR search (service layer): {op_e}", exc_info=True)
            # Re-raise the OperationFailure. The route handler is expected to catch this.
            # If this exception is raised, the lines below (like 'if not hr_list_docs: return []') will not be executed.
            raise op_e 
        
        except Exception as e: # Catch other potential errors
            logger.error(f"Unexpected error during HR search DB query (service layer): {e}", exc_info=True)
            # For other types of errors, wrap in a generic HTTPException
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected database error occurred during HR search.")

        # This part is reached only if no exception was raised above.
        if not hr_list_docs: 
            logger.info("HR search query executed successfully but found no matching documents.")
            return []
        results = []
        for hr_doc in hr_list_docs:
            try:
                extracted_data = self._get_stored_analysis_data(hr_doc)
                mongo_score = hr_doc.get("mongo_score", 0.0)
                mapped_data = {
                    "id": str(hr_doc["_id"]), "username": hr_doc.get("username"), "email": hr_doc.get("email"),
                    "role": hr_doc.get("role"), "created_at": hr_doc.get("created_at"),
                    "resume_path": hr_doc.get("resume_path"), "hr_status": hr_doc.get("hr_status"),
                    "years_of_experience": hr_doc.get("years_of_experience"), "company": hr_doc.get("company"),
                    "admin_manager_id": hr_doc.get("admin_manager_id"),
                    "relevance_score": round(mongo_score, 4),
                    "match_details": {"text_search_score": round(mongo_score, 4)},
                    "extracted_skills_list": extracted_data.get("extracted_skills", [])
                }
                results.append(RankedHR.model_validate(mapped_data))
            except Exception as e:
                logger.error(f"Pydantic validation failed for HR profile {hr_doc.get('_id')}: {e}", exc_info=True)
        
        results.sort(key=lambda x: x.relevance_score if x.relevance_score is not None else 0, reverse=True)
        return results
