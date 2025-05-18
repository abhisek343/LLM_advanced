# interview_service/app/services/interview_creation_service.py

# interview_service/app/services/interview_creation_service.py

import logging
import uuid
from typing import Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import ValidationError
from bson import ObjectId
import httpx # Import httpx for service-to-service communication

from app.models.interview import Interview, InterviewStatus, InterviewType
from app.schemas.interview import InterviewCreate, InterviewInDB, QuestionBase
from app.core.config import settings # Import settings
from .gemini_service import GeminiService, gemini_service # Import GeminiService

logger = logging.getLogger(__name__)

class InterviewCreationService:
    def __init__(self, db_client: AsyncIOMotorClient):
        self.db_client = db_client
        self.collection = db_client.get_database().get_collection("interviews")
        self.gemini_service: GeminiService = gemini_service # Use the initialized instance
        self.candidate_service_url = settings.CANDIDATE_SERVICE_URL

    async def _fetch_candidate_details(self, candidate_id: str) -> Optional[Dict[str, Any]]:
        """Fetches candidate details (including resume text) from the Candidate Service."""
        try:
            # Assuming an endpoint in candidate_service to get user details by ID
            # This endpoint would need to be implemented in candidate_service
            url = f"{self.candidate_service_url}/api/v1/candidate/{candidate_id}"
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                response.raise_for_status() # Raise an exception for bad status codes
                return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching candidate {candidate_id}: {e}")
            return None
        except httpx.RequestError as e:
            logger.error(f"Request error fetching candidate {candidate_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching candidate {candidate_id}: {e}", exc_info=True)
            return None

    async def _generate_interview_questions(
        self,
        job_title: str,
        job_description: Optional[str],
        tech_stack: List[str],
        resume_text: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Generates interview questions using the Gemini service."""
        num_questions = 10 # As requested
        questions: List[Dict[str, Any]] = []

        # Combine tech stack and resume text for a more informed prompt
        context = f"Tech Stack: {', '.join(tech_stack)}"
        if resume_text:
            context += f"\nCandidate Resume Snippet:\n{resume_text[:1000]}..." # Limit resume text length

        try:
            generated_questions = await self.gemini_service.generate_questions(
                job_title=job_title,
                job_description=job_description,
                num_questions=num_questions,
                category="Technical/Behavioral", # Can refine categories
                difficulty="Medium", # Can refine difficulty
                resume_text=context # Pass combined context
            )
            if generated_questions:
                # Add unique IDs to each question
                for q in generated_questions:
                    q['question_id'] = str(uuid.uuid4())
                questions.extend(generated_questions)
                logger.info(f"Generated {len(generated_questions)} questions via Gemini.")
            else:
                logger.warning("GeminiService returned no questions.")

        except Exception as e:
            logger.error(f"Failed to generate questions using Gemini: {e}", exc_info=True)
            # Optionally, add some default fallback questions here if generation fails
            fallback_questions = [
                {"text": f"Tell me about your experience with {job_title}.", "category": "General", "difficulty": "Easy", "question_id": str(uuid.uuid4())},
                {"text": "Describe a challenging project you worked on.", "category": "Behavioral", "difficulty": "Medium", "question_id": str(uuid.uuid4())},
            ]
            questions.extend(fallback_questions)
            logger.info(f"Added {len(fallback_questions)} fallback questions.")

        return questions

    async def create_interview(self, interview_data: InterviewCreate) -> Optional[InterviewInDB]:
        """
        Creates a new interview record in the database, including generating questions.

        Args:
            interview_data: Pydantic model containing the interview details.

        Returns:
            The created InterviewInDB object if successful, None otherwise.
        """
        try:
            # Fetch candidate details to get resume text and potentially other info
            candidate_details = await self._fetch_candidate_details(str(interview_data.candidate_id))
            resume_text = candidate_details.get("resume_text") if candidate_details else None
            # Assuming tech_stack might also be stored on the candidate profile or derived
            # For now, use the tech_stack provided in InterviewCreate
            tech_stack = interview_data.tech_stack

            # Generate questions
            generated_questions = await self._generate_interview_questions(
                job_title=interview_data.job_title,
                job_description=interview_data.job_description,
                tech_stack=tech_stack,
                resume_text=resume_text
            )

            # Convert Pydantic model to dictionary, excluding unset fields
            interview_dict = interview_data.model_dump(exclude_unset=True)

            # Add generated questions, default status, unique interview_id, and timestamps
            interview_dict["questions"] = generated_questions
            interview_dict["status"] = InterviewStatus.SCHEDULED.value
            interview_dict["interview_id"] = str(uuid.uuid4()) # Generate unique interview ID
            # MongoDB will add _id and potentially creation timestamp if configured

            # Insert the new interview document into the collection
            insert_result = await self.collection.insert_one(interview_dict)

            if insert_result.inserted_id:
                # Retrieve the created document to return the full object with _id and timestamps
                created_interview = await self.collection.find_one({"_id": insert_result.inserted_id})
                if created_interview:
                    # Convert MongoDB document to Pydantic model
                    return InterviewInDB(**created_interview)

        except ValidationError as e:
            logger.error(f"Validation error creating interview: {e}")
            return None
        except Exception as e:
            logger.error(f"Error creating interview: {e}", exc_info=True)
            return None

        return None

    # Add other interview-related service methods here as needed,
    # e.g., get_interview, update_interview, delete_interview, handle_answer_submission, etc.
    # The logic for handling chat-like interaction, answer submission, and evaluation
    # would likely go into new methods here or in a separate service class.
    # This would involve:
    # 1. Receiving candidate answers (likely one by one or in batches).
    # 2. Storing answers, potentially in a separate 'responses' collection or embedded.
    # 3. Using GeminiService.evaluate_answer for each response.
    # 4. Updating the interview/response document with scores and feedback.
    # 5. Calculating overall score/feedback.
    # 6. Providing endpoints for HR/Admin to view the evaluated interview.
