# LLM_interviewer/server/app/services/invitation_service.py

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone 
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient 

from ..db.mongodb import mongodb # Adjusted
from ..core.config import settings # Adjusted
from ..models.user import User, HrStatus # Adjusted
from ..models.application_request import HRMappingRequest, RequestMappingStatus, RequestMappingType # Adjusted

logger = logging.getLogger(__name__)

class InvitationError(Exception):
    pass

class InvitationService:
    def __init__(self, db: Optional[AsyncIOMotorClient] = None): 
        self.db = db if db is not None else mongodb.get_db() 
        if self.db is None:
             raise RuntimeError("Database not available in InvitationService.")
        self.user_collection = self.db[settings.MONGODB_COLLECTION_USERS]
        self.request_collection_name = "hr_mapping_requests" 
        self.request_collection = self.db[self.request_collection_name]

    async def _check_existing_pending(self, hr_user_id: ObjectId) -> bool:
        pending_item = await self.request_collection.find_one({
            "status": "pending",
            "$or": [
                {"requester_id": hr_user_id, "request_type": "application"},
                {"target_id": hr_user_id, "request_type": "request"}
            ]
        })
        if pending_item:
            logger.warning(f"HR User {hr_user_id} already has a pending application or request ({pending_item['_id']}).")
            return True
        return False

    async def _cleanup_pending_for_user(self, hr_user_id: ObjectId, accepted_request_id: ObjectId):
        now = datetime.now(timezone.utc)
        logger.info(f"Cleaning up other pending requests/applications for HR {hr_user_id}, excluding accepted item {accepted_request_id}")
        await self.request_collection.update_many(
             {
                 "_id": {"$ne": accepted_request_id}, 
                 "requester_id": hr_user_id,
                 "status": "pending",
                 "request_type": "application"
             },
             {"$set": {"status": "cancelled", "updated_at": now}}
        )
        await self.request_collection.update_many(
             {
                 "_id": {"$ne": accepted_request_id}, 
                 "target_id": hr_user_id,
                 "status": "pending",
                 "request_type": "request"
             },
             {"$set": {"status": "rejected", "updated_at": now}}
        )
        logger.info(f"Cleanup complete for HR {hr_user_id}.")


    async def create_hr_application(self, hr_user: User, target_admin_id: ObjectId) -> HRMappingRequest:
        if hr_user.role != "hr": raise InvitationError("Only HR users can apply.")
        
        # Prevent applying if already mapped
        if hr_user.hr_status == "mapped":
            raise InvitationError("HR user is already mapped to an Admin and cannot send new applications.")
        
        # Allow application if profile is complete, or if other applications/requests are pending but not yet mapped.
        allowed_statuses_to_apply = ["profile_complete", "application_pending", "admin_request_pending"]
        if hr_user.hr_status not in allowed_statuses_to_apply:
            raise InvitationError(f"HR user status must be one of {allowed_statuses_to_apply} to apply (is {hr_user.hr_status}).")

        # Removed: if await self._check_existing_pending(hr_user.id): raise InvitationError("HR user already has a pending application or request.")

        target_admin = await self.user_collection.find_one({"_id": target_admin_id, "role": "admin"})
        if not target_admin: raise InvitationError(f"Target Admin {target_admin_id} not found or is not an Admin.")

        logger.info(f"Creating application from HR {hr_user.id} to Admin {target_admin_id}")
        now = datetime.now(timezone.utc)
        application_doc = {
            "request_type": "application", "requester_id": hr_user.id, "requester_role": "hr",
            "target_id": target_admin_id, "target_role": "admin", "status": "pending",
            "created_at": now, "updated_at": now
        }
        insert_result = await self.request_collection.insert_one(application_doc)
        if not insert_result.acknowledged:
            raise InvitationError("Failed to create application record in database.")
        created_doc = await self.request_collection.find_one({"_id": insert_result.inserted_id})
        if not created_doc:
             raise InvitationError("Failed to retrieve created application record.")

        # Ensure HR status is set to "application_pending"
        # This is safe even if it's already "application_pending" or "admin_request_pending"
        # as "application_pending" signifies they have at least one outgoing application.
        update_result = await self.user_collection.update_one(
            {"_id": hr_user.id}, # Update regardless of current pending status, as long as not mapped.
            {"$set": {"hr_status": "application_pending", "updated_at": now}}
        )
        if update_result.modified_count == 0 and hr_user.hr_status != "application_pending":
             # If status wasn't already application_pending and update failed, it's an issue.
             logger.error(f"Failed to update HR user {hr_user.id} status to 'application_pending' after creating application {insert_result.inserted_id}. Current status: {hr_user.hr_status}")
             await self.request_collection.delete_one({"_id": insert_result.inserted_id})
             raise InvitationError("Failed to update HR user status.")
        return HRMappingRequest.model_validate(created_doc)


    async def create_admin_request(self, admin_user: User, target_hr_id: ObjectId) -> HRMappingRequest:
        if admin_user.role != "admin": raise InvitationError("Only Admin users can send requests.")
        target_hr_doc_initial_fetch = await self.user_collection.find_one({"_id": target_hr_id, "role": "hr"})
        if not target_hr_doc_initial_fetch: raise InvitationError(f"Target HR {target_hr_id} not found or is not an HR user.")

        if "admin_manager_id" in target_hr_doc_initial_fetch and isinstance(target_hr_doc_initial_fetch["admin_manager_id"], str):
            try: target_hr_doc_initial_fetch["admin_manager_id"] = ObjectId(target_hr_doc_initial_fetch["admin_manager_id"])
            except Exception: pass 
        if "assigned_hr_id" in target_hr_doc_initial_fetch and isinstance(target_hr_doc_initial_fetch["assigned_hr_id"], str):
            try: target_hr_doc_initial_fetch["assigned_hr_id"] = ObjectId(target_hr_doc_initial_fetch["assigned_hr_id"])
            except Exception: pass

        target_hr_model = User.model_validate(target_hr_doc_initial_fetch) 
        if target_hr_model.hr_status == "mapped": 
            raise InvitationError(f"Target HR {target_hr_id} is already mapped to an admin.")
        if target_hr_model.hr_status != "profile_complete": raise InvitationError(f"Target HR status must be 'profile_complete' to receive request (is {target_hr_model.hr_status}).")
        if await self._check_existing_pending(target_hr_id): raise InvitationError("Target HR user already has a pending application or request.")

        logger.info(f"Creating mapping request from Admin {admin_user.id} to HR {target_hr_id}")
        now = datetime.now(timezone.utc)
        request_doc = {
            "request_type": "request", "requester_id": admin_user.id, "requester_role": "admin",
            "target_id": target_hr_id, "target_role": "hr", "status": "pending",
            "created_at": now, "updated_at": now
        }
        insert_result = await self.request_collection.insert_one(request_doc)
        if not insert_result.acknowledged:
            raise InvitationError("Failed to create request record in database.")
        created_doc = await self.request_collection.find_one({"_id": insert_result.inserted_id})
        if not created_doc:
             raise InvitationError("Failed to retrieve created request record.")
        
        update_result = await self.user_collection.update_one(
            {"_id": target_hr_id, "hr_status": "profile_complete"},
            {"$set": {"hr_status": "admin_request_pending", "updated_at": now}}
        )
        if update_result.modified_count == 0: 
            logger.error(f"Failed to update HR user {target_hr_id} from 'profile_complete' to 'admin_request_pending'.")
            await self.request_collection.delete_one({"_id": insert_result.inserted_id}) 
            raise InvitationError("Failed to update HR user status.")
        return HRMappingRequest.model_validate(created_doc)

    async def accept_request_or_application(self, request_id: ObjectId, accepting_user: User) -> bool:
        logger.info(f"User {accepting_user.id} attempting to accept request/application {request_id}")
        now = datetime.now(timezone.utc)
        request_doc = await self.request_collection.find_one({
            "_id": request_id, "target_id": ObjectId(str(accepting_user.id)), "status": "pending"
        })
        if not request_doc:
            logger.error(f"Pending request/application {request_id} not found for target user {accepting_user.id}.")
            raise InvitationError("Request/Application not found or already actioned.")
        hr_map_request = HRMappingRequest.model_validate(request_doc)

        if hr_map_request.request_type == "application":
            if accepting_user.role != "admin": raise InvitationError("Only Admins can accept applications.")
            admin_oid_for_db = ObjectId(str(accepting_user.id))
            hr_oid_for_db = ObjectId(str(hr_map_request.requester_id))
        elif hr_map_request.request_type == "request":
            if accepting_user.role != "hr": raise InvitationError("Only HR can accept admin requests.")
            hr_oid_for_db = ObjectId(str(accepting_user.id))
            admin_oid_for_db = ObjectId(str(hr_map_request.requester_id))
        else:
            raise InvitationError("Invalid request type.")

        hr_user_to_update = await self.user_collection.find_one({"_id": hr_oid_for_db})
        if not hr_user_to_update:
            raise InvitationError(f"HR user {hr_oid_for_db} not found during acceptance process.")
        
        expected_pending_statuses = ["application_pending", "admin_request_pending"]
        if hr_user_to_update.get("hr_status") not in expected_pending_statuses:
            logger.error(f"HR user {hr_oid_for_db} status is '{hr_user_to_update.get('hr_status')}', not in {expected_pending_statuses}.")

        hr_update_result = await self.user_collection.update_one(
            {"_id": hr_oid_for_db, "hr_status": {"$in": expected_pending_statuses}}, 
            {"$set": {"hr_status": "mapped", "admin_manager_id": admin_oid_for_db, "updated_at": now}}
        )
        if hr_update_result.matched_count == 0:
            logger.error(f"HR user {hr_oid_for_db} not found or not in correct pending state for update. Current status: {hr_user_to_update.get('hr_status')}")
            raise InvitationError("HR user not found or not in correct pending state for mapping.")

        req_update_result = await self.request_collection.update_one(
            {"_id": request_id, "status": "pending"}, 
            {"$set": {"status": "accepted", "updated_at": now}}
        )
        if req_update_result.modified_count == 1:
             logger.info(f"Request/Application {request_id} successfully accepted. Cleaning up other items for HR {hr_oid_for_db}.")
             await self._cleanup_pending_for_user(hr_oid_for_db, accepted_request_id=request_id)
             return True
        else:
             logger.error(f"Failed to update status for request/application {request_id} to accepted. HR status might have been updated. Manual check needed.")
             await self.user_collection.update_one(
                 {"_id": hr_oid_for_db, "admin_manager_id": admin_oid_for_db, "hr_status": "mapped"}, 
                 {"$set": {"hr_status": hr_user_to_update.get("hr_status"), "admin_manager_id": hr_user_to_update.get("admin_manager_id"), "updated_at": now}}
             )
             raise InvitationError("Failed to finalize request acceptance status update after HR mapping.")

    async def reject_request_or_application(self, request_id: ObjectId, rejecting_user: User) -> bool:
        logger.info(f"User {rejecting_user.id} attempting to reject request/application {request_id}")
        now = datetime.now(timezone.utc)
        request_doc = await self.request_collection.find_one({
            "_id": request_id, "target_id": ObjectId(str(rejecting_user.id)), "status": "pending"
        })
        if not request_doc:
            logger.error(f"Pending request/application {request_id} not found for target user {rejecting_user.id}.")
            raise InvitationError("Request/Application not found or already actioned.")
        hr_map_request = HRMappingRequest.model_validate(request_doc)
        hr_oid_for_status_reset = ObjectId(str(hr_map_request.requester_id)) if hr_map_request.request_type == "application" else ObjectId(str(hr_map_request.target_id))
        
        req_update_result = await self.request_collection.update_one(
            {"_id": request_id, "status": "pending"}, 
            {"$set": {"status": "rejected", "updated_at": now}}
        )
        if req_update_result.modified_count == 0:
            logger.error(f"Failed to update status for request/application {request_id} to rejected.")
            raise InvitationError("Failed to update request/application status to rejected.")
        
        if not await self._check_existing_pending(hr_oid_for_status_reset): 
            hr_user_doc_before_reset = await self.user_collection.find_one({"_id": hr_oid_for_status_reset})
            original_status = hr_user_doc_before_reset.get("hr_status") if hr_user_doc_before_reset else "unknown"
            
            hr_update_result = await self.user_collection.update_one(
                {"_id": hr_oid_for_status_reset, "hr_status": {"$in": ["application_pending", "admin_request_pending"]}},
                {"$set": {"hr_status": "profile_complete", "updated_at": now}}
            )
            if hr_update_result.matched_count == 0:
                logger.warning(f"HR user {hr_oid_for_status_reset} not found or status was not pending ('{original_status}') during rejection cleanup.")
            else:
                 logger.info(f"Reset HR user {hr_oid_for_status_reset} status from '{original_status}' to 'profile_complete'.")
        else:
            logger.info(f"HR user {hr_oid_for_status_reset} still has other pending items, status not reset.")
        logger.info(f"Request/Application {request_id} successfully rejected.")
        return True

    async def get_pending_applications_for_admin(self, admin_id_str: str) -> List[Dict[str, Any]]:
         logger.debug(f"Fetching pending applications for Admin {admin_id_str}")
         admin_oid = ObjectId(admin_id_str)
         pipeline = [
             {"$match": {"target_id": admin_oid, "request_type": "application", "status": "pending"}},
             {"$sort": {"created_at": 1}},
             {"$lookup": { "from": settings.MONGODB_COLLECTION_USERS, "localField": "requester_id", "foreignField": "_id", "as": "requester_info_doc"}},
             {"$unwind": { "path": "$requester_info_doc", "preserveNullAndEmptyArrays": True }},
             {"$project": { 
                 "_id": 1, "request_type": 1, "status": 1, "created_at": 1, "updated_at": 1,
                 "requester_id": 1, "target_id": 1, 
                 "requester_info": { "id": "$requester_info_doc._id", "username": "$requester_info_doc.username", "email": "$requester_info_doc.email", "role": "$requester_info_doc.role", "created_at": "$requester_info_doc.created_at", "hr_status": "$requester_info_doc.hr_status", "years_of_experience": "$requester_info_doc.years_of_experience", "company": "$requester_info_doc.company", "resume_path": "$requester_info_doc.resume_path", "admin_manager_id": "$requester_info_doc.admin_manager_id"}
             }}
         ]
         apps = await self.request_collection.aggregate(pipeline).to_list(length=None)
         return apps

    async def get_pending_requests_for_hr(self, hr_id_str: str) -> List[Dict[str, Any]]:
         logger.debug(f"Fetching pending requests for HR {hr_id_str}")
         hr_oid = ObjectId(hr_id_str)
         pipeline = [
             {"$match": {"target_id": hr_oid, "request_type": "request", "status": "pending"}},
             {"$sort": {"created_at": 1}},
             {"$lookup": { "from": settings.MONGODB_COLLECTION_USERS, "localField": "requester_id", "foreignField": "_id", "as": "requester_info_doc"}},
             {"$unwind": { "path": "$requester_info_doc", "preserveNullAndEmptyArrays": True }},
             {"$project": { 
                 "_id": 1, "request_type": 1, "status": 1, "created_at": 1, "updated_at": 1,
                 "requester_id": 1, "target_id": 1,
                 "requester_info": {"id": "$requester_info_doc._id", "username": "$requester_info_doc.username", "email": "$requester_info_doc.email", "role": "$requester_info_doc.role", "created_at": "$requester_info_doc.created_at" }
             }}
         ]
         reqs = await self.request_collection.aggregate(pipeline).to_list(length=None)
         return reqs

    async def hr_unmap(self, hr_user: User) -> bool:
        if hr_user.role != "hr": raise InvitationError("Only HR users can unmap.")
        if hr_user.hr_status != "mapped": raise InvitationError(f"HR user status must be 'mapped' to unmap (is {hr_user.hr_status}).")
        if not hr_user.admin_manager_id: raise InvitationError("Cannot unmap, no admin_manager_id found.")
        logger.info(f"HR {hr_user.id} unmapping from Admin {hr_user.admin_manager_id}")
        now = datetime.now(timezone.utc)
        update_result = await self.user_collection.update_one(
            {"_id": hr_user.id, "hr_status": "mapped"},
            {"$set": {"hr_status": "profile_complete", "admin_manager_id": None, "updated_at": now}}
        )
        if update_result.modified_count == 1:
            logger.info(f"HR {hr_user.id} successfully unmapped.")
            return True
        else:
            logger.error(f"Failed to unmap HR {hr_user.id}. Matched count: {update_result.matched_count}")
            return False
