# LLM_interviewer/server/app/services/invitation_service.py

import logging
from typing import List, Optional, Dict, Any, Literal # Import Literal
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

    async def _check_hr_has_active_requests(self, hr_user_id: ObjectId) -> bool:
        """Checks if an HR user has any active (non-finalized) applications or invitations."""
        active_statuses: List[RequestMappingStatus] = [
            "pending_admin_approval",
            "admin_approved",
            "request_pending_hr_approval"
        ]
        active_request = await self.request_collection.find_one({
            "$or": [
                {"requester_id": hr_user_id, "request_type": "application", "status": {"$in": active_statuses}},
                {"target_id": hr_user_id, "request_type": "request", "status": {"$in": active_statuses}}
            ]
        })
        if active_request:
            logger.info(f"HR User {hr_user_id} has an active request/application: ID {active_request['_id']}, Status {active_request['status']}.")
            return True
        return False

    async def _supersede_other_requests_for_hr(self, hr_user_id: ObjectId, confirmed_request_id: ObjectId):
        """Sets other active requests for an HR to 'superceded' once one is confirmed."""
        now = datetime.now(timezone.utc)
        active_statuses_to_supersede: List[RequestMappingStatus] = [
            "pending_admin_approval",
            "admin_approved",
            "request_pending_hr_approval"
        ]
        logger.info(f"Superseding other active requests for HR {hr_user_id}, due to confirmation of {confirmed_request_id}")
        
        # Supersede HR's outgoing applications
        await self.request_collection.update_many(
             {
                 "_id": {"$ne": confirmed_request_id},
                 "requester_id": hr_user_id,
                 "request_type": "application",
                 "status": {"$in": active_statuses_to_supersede}
             },
             {"$set": {"status": "superceded", "updated_at": now}}
        )
        # Supersede Admin's incoming invitations to this HR
        await self.request_collection.update_many(
             {
                 "_id": {"$ne": confirmed_request_id},
                 "target_id": hr_user_id,
                 "request_type": "request",
                 "status": {"$in": active_statuses_to_supersede}
             },
             {"$set": {"status": "superceded", "updated_at": now}}
        )
        logger.info(f"Superseding complete for HR {hr_user_id}.")


    async def create_hr_application(self, hr_user: User, target_admin_id: ObjectId) -> HRMappingRequest:
        if hr_user.role != "hr": raise InvitationError("Only HR users can apply.")
        
        # Prevent applying if already mapped
        if hr_user.hr_status == "mapped":
            raise InvitationError("HR user is already mapped to an Admin and cannot send new applications.")
        
        # Allow application if profile is complete, pending_profile, or if other applications/requests are pending but not yet mapped.
        # "pending_profile" means they've started but not fully completed (e.g., YoE set, but no resume yet, or vice-versa).
        allowed_statuses_to_apply: List[HrStatus] = ["profile_complete", "pending_profile", "application_pending", "admin_request_pending"]
        if hr_user.hr_status not in allowed_statuses_to_apply:
            raise InvitationError(f"HR user status must be one of {allowed_statuses_to_apply} to apply (is {hr_user.hr_status}).")

        # Removed: if await self._check_existing_pending(hr_user.id): raise InvitationError("HR user already has a pending application or request.")

        target_admin = await self.user_collection.find_one({"_id": target_admin_id, "role": "admin"})
        if not target_admin: raise InvitationError(f"Target Admin {target_admin_id} not found or is not an Admin.")

        # Check for existing pending application to the SAME admin
        existing_pending_application_to_same_admin = await self.request_collection.find_one({
            "requester_id": hr_user.id,
            "target_id": target_admin_id,
            "request_type": "application",
            "status": "pending_admin_approval"
        })
        if existing_pending_application_to_same_admin:
            logger.warning(f"HR user {hr_user.id} attempted to send a duplicate application to Admin {target_admin_id}.")
            raise InvitationError(f"You already have a pending application to this Admin.")

        logger.info(f"Creating application from HR {hr_user.id} to Admin {target_admin_id}")
        now = datetime.now(timezone.utc)
        application_doc = {
            "request_type": "application", "requester_id": hr_user.id, "requester_role": "hr",
            "target_id": target_admin_id, "target_role": "admin", "status": "pending_admin_approval", # Updated status
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
        # For Admin inviting HR, we might be stricter: HR should have NO active requests at all.
        if await self._check_hr_has_active_requests(target_hr_id): 
            raise InvitationError("Target HR user already has an active application or request and cannot receive new invitations at this time.")

        logger.info(f"Creating mapping request from Admin {admin_user.id} to HR {target_hr_id}")
        now = datetime.now(timezone.utc)
        request_doc = {
            "request_type": "request", "requester_id": admin_user.id, "requester_role": "admin",
            "target_id": target_hr_id, "target_role": "hr", "status": "request_pending_hr_approval", # Updated status
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
        # This method will be refactored and split.
        # For now, commenting out its body to prevent usage with old logic.
        # TODO: Refactor this method into admin_approve_hr_application, hr_accept_admin_invitation, etc.
        logger.critical("accept_request_or_application is DEPRECATED and needs refactoring for new status flow.")
        raise NotImplementedError("accept_request_or_application is deprecated.")
        # Original body commented out:
        # logger.info(f"User {accepting_user.id} attempting to accept request/application {request_id}")
        # now = datetime.now(timezone.utc)
        # request_doc = await self.request_collection.find_one({
        #     "_id": request_id, "target_id": ObjectId(str(accepting_user.id)), 
        #     "status": {"$in": ["pending_admin_approval", "request_pending_hr_approval"]} # Check against new pending statuses
        # })
        # if not request_doc:
        #     logger.error(f"Pending request/application {request_id} not found for target user {accepting_user.id} with appropriate status.")
        #     raise InvitationError("Request/Application not found or already actioned or not in a pending state.")
        # hr_map_request = HRMappingRequest.model_validate(request_doc)

        # # ... rest of the old logic needs to be adapted to new functions ...
        return False # Placeholder

    async def admin_process_hr_application(self, request_id: ObjectId, admin_user: User, action: Literal["approve", "reject"]) -> HRMappingRequest:
        logger.info(f"Admin {admin_user.id} attempting to '{action}' HR application {request_id}")
        now = datetime.now(timezone.utc)

        request_doc = await self.request_collection.find_one({
            "_id": request_id,
            "target_id": admin_user.id, # Admin is the target of an HR's application
            "request_type": "application",
            "status": "pending_admin_approval"
        })

        if not request_doc:
            raise InvitationError(f"Application {request_id} not found for Admin {admin_user.id} or not in 'pending_admin_approval' state.")
        
        hr_applicant_id = request_doc["requester_id"]
        new_status: RequestMappingStatus

        if action == "approve":
            new_status = "admin_approved"
            # HR user status is not changed here, HR needs to confirm.
            # HR's hr_status should remain 'application_pending' or similar.
        elif action == "reject":
            new_status = "admin_rejected"
        else:
            raise InvitationError("Invalid action for processing HR application.")

        update_result = await self.request_collection.update_one(
            {"_id": request_id},
            {"$set": {"status": new_status, "updated_at": now}}
        )

        if update_result.modified_count == 0:
            raise InvitationError(f"Failed to update application {request_id} status to {new_status}.")

        if new_status == "admin_rejected":
            # If rejected, check if the HR has other active requests. If not, reset their status.
            if not await self._check_hr_has_active_requests(hr_applicant_id):
                hr_user_doc = await self.user_collection.find_one({"_id": hr_applicant_id})
                if hr_user_doc and hr_user_doc.get("hr_status") == "application_pending":
                    await self.user_collection.update_one(
                        {"_id": hr_applicant_id},
                        {"$set": {"hr_status": "profile_complete", "updated_at": now}}
                    )
                    logger.info(f"HR {hr_applicant_id} status reset to 'profile_complete' after application rejection.")
        
        updated_request_doc = await self.request_collection.find_one({"_id": request_id})
        if not updated_request_doc:
            # This should not happen if update was successful
            logger.error(f"CRITICAL: Failed to re-fetch request {request_id} after admin action.")
            raise InvitationError("Failed to retrieve request after update.")
        return HRMappingRequest.model_validate(updated_request_doc)

    async def hr_respond_to_admin_invitation(self, request_id: ObjectId, hr_user: User, action: Literal["accept", "reject"]) -> HRMappingRequest:
        logger.info(f"HR {hr_user.id} attempting to '{action}' Admin invitation {request_id}")
        now = datetime.now(timezone.utc)

        request_doc = await self.request_collection.find_one({
            "_id": request_id,
            "target_id": hr_user.id, # HR is the target of an Admin's invitation
            "request_type": "request",
            "status": "request_pending_hr_approval"
        })

        if not request_doc:
            raise InvitationError(f"Invitation {request_id} not found for HR {hr_user.id} or not in 'request_pending_hr_approval' state.")

        admin_inviter_id = request_doc["requester_id"]
        new_request_status: RequestMappingStatus

        if action == "accept":
            if hr_user.hr_status == "mapped":
                 raise InvitationError(f"HR {hr_user.id} is already mapped and cannot accept new invitations without unmapping first.")
            
            new_request_status = "hr_confirmed_mapping"
            
            # Map the HR
            hr_update_result = await self.user_collection.update_one(
                {"_id": hr_user.id, "hr_status": {"ne": "mapped"}}, # Ensure not already mapped by some race condition
                {"$set": {"hr_status": "mapped", "admin_manager_id": admin_inviter_id, "updated_at": now}}
            )
            if hr_update_result.matched_count == 0:
                # This could happen if HR status changed to mapped between check and update
                logger.error(f"HR {hr_user.id} could not be mapped. Status might have changed or user not found.")
                raise InvitationError("Failed to map HR user. User may already be mapped or state is inconsistent.")
            
            logger.info(f"HR {hr_user.id} successfully mapped to Admin {admin_inviter_id} by accepting invitation {request_id}.")
            await self._supersede_other_requests_for_hr(hr_user.id, request_id)

        elif action == "reject":
            new_request_status = "hr_rejected_invitation"
        else:
            raise InvitationError("Invalid action for responding to Admin invitation.")

        update_result = await self.request_collection.update_one(
            {"_id": request_id},
            {"$set": {"status": new_request_status, "updated_at": now}}
        )
        if update_result.modified_count == 0:
            # If mapping happened but request status update failed, this is problematic.
            # For now, we'll rely on the HR status update being the critical part for "accept".
            raise InvitationError(f"Failed to update invitation {request_id} status to {new_request_status}.")

        if new_request_status == "hr_rejected_invitation":
            if not await self._check_hr_has_active_requests(hr_user.id):
                hr_user_doc = await self.user_collection.find_one({"_id": hr_user.id})
                if hr_user_doc and hr_user_doc.get("hr_status") == "admin_request_pending": # Status before this rejection
                    await self.user_collection.update_one(
                        {"_id": hr_user.id},
                        {"$set": {"hr_status": "profile_complete", "updated_at": now}}
                    )
                    logger.info(f"HR {hr_user.id} status reset to 'profile_complete' after rejecting admin invitation.")
        
        updated_request_doc = await self.request_collection.find_one({"_id": request_id})
        if not updated_request_doc:
            logger.error(f"CRITICAL: Failed to re-fetch request {request_id} after HR response.")
            raise InvitationError("Failed to retrieve request after update.")
        return HRMappingRequest.model_validate(updated_request_doc)

    async def hr_confirm_mapping_choice(self, request_id: ObjectId, hr_user: User) -> HRMappingRequest:
        logger.info(f"HR {hr_user.id} attempting to confirm mapping with Admin via application {request_id}")
        now = datetime.now(timezone.utc)

        if hr_user.hr_status == "mapped":
            raise InvitationError(f"HR {hr_user.id} is already mapped and cannot confirm a new mapping without unmapping first.")

        request_doc = await self.request_collection.find_one({
            "_id": request_id,
            "requester_id": hr_user.id, # HR is the requester of this application
            "request_type": "application",
            "status": "admin_approved" # Admin must have approved this application
        })

        if not request_doc:
            raise InvitationError(f"Application {request_id} by HR {hr_user.id} not found or not in 'admin_approved' state.")

        admin_to_map_with_id = request_doc["target_id"]
        
        # Map the HR
        hr_update_result = await self.user_collection.update_one(
            {"_id": hr_user.id, "hr_status": {"ne": "mapped"}}, # Ensure not already mapped
            {"$set": {"hr_status": "mapped", "admin_manager_id": admin_to_map_with_id, "updated_at": now}}
        )
        if hr_update_result.matched_count == 0:
            logger.error(f"HR {hr_user.id} could not be mapped. Status might have changed or user not found.")
            raise InvitationError("Failed to map HR user. User may already be mapped or state is inconsistent.")
        
        logger.info(f"HR {hr_user.id} successfully mapped to Admin {admin_to_map_with_id} by confirming application {request_id}.")
        
        # Update the chosen request status
        update_chosen_request = await self.request_collection.update_one(
            {"_id": request_id},
            {"$set": {"status": "hr_confirmed_mapping", "updated_at": now}}
        )
        if update_chosen_request.modified_count == 0:
            # This is a critical inconsistency if mapping succeeded but request status didn't update.
            # Potentially try to revert HR mapping or log for manual intervention.
            logger.error(f"CRITICAL: Failed to update chosen request {request_id} to 'hr_confirmed_mapping' after HR was mapped.")
            # For now, we proceed assuming HR mapping is the primary success indicator.
            # A more robust solution might involve transactions if the DB supports them.

        await self._supersede_other_requests_for_hr(hr_user.id, request_id)
        
        updated_request_doc = await self.request_collection.find_one({"_id": request_id})
        if not updated_request_doc: # Should ideally not happen
            raise InvitationError("Failed to retrieve the confirmed request after update.")
        return HRMappingRequest.model_validate(updated_request_doc)

    async def hr_cancel_application(self, request_id: ObjectId, hr_user: User) -> HRMappingRequest:
        logger.info(f"HR {hr_user.id} attempting to cancel their application {request_id}")
        now = datetime.now(timezone.utc)

        request_doc = await self.request_collection.find_one({
            "_id": request_id,
            "requester_id": hr_user.id, # HR is the requester
            "request_type": "application",
            "status": "pending_admin_approval"
        })

        if not request_doc:
            raise InvitationError(f"Application {request_id} by HR {hr_user.id} not found or not in 'pending_admin_approval' state to be cancelled.")

        update_result = await self.request_collection.update_one(
            {"_id": request_id},
            {"$set": {"status": "hr_cancelled_application", "updated_at": now}}
        )

        if update_result.modified_count == 0:
            raise InvitationError(f"Failed to update application {request_id} status to 'hr_cancelled_application'.")

        # Check if HR has other active requests. If not, reset their overall status.
        if not await self._check_hr_has_active_requests(hr_user.id):
            # Ensure the current status is one that implies pending actions before resetting
            relevant_hr_statuses: List[HrStatus] = ["application_pending", "admin_request_pending"] # Could also include 'pending_mapping_approval' if that's used
            if hr_user.hr_status in relevant_hr_statuses:
                 await self.user_collection.update_one(
                    {"_id": hr_user.id},
                    {"$set": {"hr_status": "profile_complete", "updated_at": now}}
                )
                 logger.info(f"HR {hr_user.id} status reset to 'profile_complete' after cancelling application and no other active requests.")
            else:
                logger.info(f"HR {hr_user.id} cancelled application, but status '{hr_user.hr_status}' not reset as it's not a pending one or no other active requests found.")


        updated_request_doc = await self.request_collection.find_one({"_id": request_id})
        if not updated_request_doc:
             raise InvitationError("Failed to retrieve the cancelled application after update.")
        return HRMappingRequest.model_validate(updated_request_doc)

    async def reject_request_or_application(self, request_id: ObjectId, rejecting_user: User) -> bool:
        # This method will also be refactored and split.
        # TODO: Refactor this method.
        logger.critical("reject_request_or_application is DEPRECATED and needs refactoring for new status flow.")
        raise NotImplementedError("reject_request_or_application is deprecated.")
        # Original body commented out:
        # logger.info(f"User {rejecting_user.id} attempting to reject request/application {request_id}")
        # now = datetime.now(timezone.utc)
        # request_doc = await self.request_collection.find_one({
        #     "_id": request_id, "target_id": ObjectId(str(rejecting_user.id)), "status": "pending" # Should check new pending statuses
        # })
        # if not request_doc:
        #     logger.error(f"Pending request/application {request_id} not found for target user {rejecting_user.id}.")
        #     raise InvitationError("Request/Application not found or already actioned.")
        # hr_map_request = HRMappingRequest.model_validate(request_doc)
        # hr_oid_for_status_reset = ObjectId(str(hr_map_request.requester_id)) if hr_map_request.request_type == "application" else ObjectId(str(hr_map_request.target_id))
        
        # # ... rest of the old logic needs to be adapted ...
        return False # Placeholder


    async def get_pending_applications_for_admin(self, admin_id_str: str) -> List[Dict[str, Any]]:
         logger.debug(f"Fetching 'pending_admin_approval' applications for Admin {admin_id_str}")
         admin_oid = ObjectId(admin_id_str)
         pipeline = [
             {"$match": {"target_id": admin_oid, "request_type": "application", "status": "pending_admin_approval"}}, # Updated status
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
         logger.debug(f"Fetching 'request_pending_hr_approval' requests for HR {hr_id_str}")
         hr_oid = ObjectId(hr_id_str)
         pipeline = [
             {"$match": {"target_id": hr_oid, "request_type": "request", "status": "request_pending_hr_approval"}}, # Updated status
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
