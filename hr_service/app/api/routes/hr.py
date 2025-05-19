# LLM_interviewer/server/app/api/routes/hr.py

import logging
from typing import List, Dict, Any, Optional
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Response,
    UploadFile,
    File,
    Body,
    Query,
)
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone
import uuid
from pathlib import Path
import aiofiles
import aiofiles.os

from app.core.security import get_current_active_user
from app.models.user import User, HrStatus
from app.schemas.user import (
    HrProfileOut, 
    HrProfileUpdate, 
    AdminBasicInfo, 
    CandidateProfileOut
)
from app.schemas.application_request import HRMappingRequestOut
from app.schemas.search import RankedCandidate
from app.schemas.message import MessageContentCreate, MessageOut, MarkReadRequest, BaseUserInfo

from app.db.mongodb import mongodb
from app.core.config import settings

from app.services.invitation_service import InvitationService, InvitationError
from app.services.search_service import SearchService
from app.services.resume_parser import parse_resume, ResumeParserError
from app.services.resume_analyzer_service import resume_analyzer_service

logger = logging.getLogger(__name__)

try:
    HR_UPLOAD_DIRECTORY = Path(settings.UPLOAD_DIR) / getattr(settings, "HR_RESUME_SUBDIR", "hr_resumes")
    HR_ALLOWED_EXTENSIONS = set(settings.ALLOWED_RESUME_EXTENSIONS)
    HR_UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
    logger.info(f"HR Resume upload directory: {HR_UPLOAD_DIRECTORY}")
except AttributeError as e:
    logger.error(f"Settings for HR uploads missing: {e}. Using defaults.")
    HR_UPLOAD_DIRECTORY = Path("uploads/hr_resumes")
    HR_ALLOWED_EXTENSIONS = {"pdf", "docx"}
    try:
        HR_UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
    except OSError as mk_e:
        logger.critical(f"Failed to create HR upload directory: {mk_e}")
except OSError as e:
    logger.critical(f"CRITICAL: Failed to create HR upload directory {HR_UPLOAD_DIRECTORY}: {e}")

def get_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(str(id_str))
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid ID format: {id_str}")

async def require_hr(current_user_from_token: User = Depends(get_current_active_user), db: AsyncIOMotorClient = Depends(mongodb.get_db)) -> User:
    if current_user_from_token.role != "hr":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operation requires HR privileges.")
    
    # Re-fetch the user from the database to ensure the most current state, especially for status fields.
    user_doc = await db[settings.MONGODB_COLLECTION_USERS].find_one({"_id": ObjectId(str(current_user_from_token.id))})
    if not user_doc:
        logger.error(f"HR user {current_user_from_token.id} (from token) not found in DB during require_hr re-fetch.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HR User not found in database.")
    
    logger.debug(f"require_hr: Refetched HR user {current_user_from_token.id} from DB. DB status: {user_doc.get('hr_status')}")
    return User.model_validate(user_doc)

router = APIRouter(prefix="/hr", tags=["HR"], dependencies=[Depends(require_hr)])

@router.get("/me/profile", response_model=HrProfileOut)
async def get_hr_profile_me(
    current_hr_user: User = Depends(require_hr),
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    logger.info(f"HR {current_hr_user.username} (ID: {current_hr_user.id}) requested their profile details.")
    # Re-fetch the user from the database to ensure all fields are present
    # current_hr_user from token might be a less specific model (e.g., UserOut)
    user_doc = await db[settings.MONGODB_COLLECTION_USERS].find_one({"_id": ObjectId(str(current_hr_user.id))})
    if not user_doc:
        logger.error(f"HR user {current_hr_user.id} not found in DB during /me/profile re-fetch.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HR User not found.")
    
    # Validate the full document with HrProfileOut
    # This ensures that hr_status, admin_manager_id, etc., are correctly loaded
    return HrProfileOut.model_validate(user_doc)

@router.post("/profile-details", response_model=HrProfileOut)
async def update_hr_profile_details(
    profile_data: HrProfileUpdate,
    current_hr_user: User = Depends(require_hr),
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    logger.info(f"HR {current_hr_user.username} updating profile details: {profile_data.model_dump(exclude_none=True)}")
    update_doc = profile_data.model_dump(exclude_unset=True)
    logger.info(f"HR profile update_doc: {update_doc}")
    update_doc["updated_at"] = datetime.now(timezone.utc)
    
    result = await db[settings.MONGODB_COLLECTION_USERS].update_one(
        {"_id": current_hr_user.id}, {"$set": update_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HR User not found during update.")

    updated_user_doc = await db[settings.MONGODB_COLLECTION_USERS].find_one({"_id": current_hr_user.id})
    if not updated_user_doc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve user after update.")
    
    updated_user_obj = User.model_validate(updated_user_doc)
    # Temporarily reverting to simpler condition based on user feedback for "Update HR Profile" test expectations.
    # This implies that for the purpose of this test/flow, setting YoE is sufficient.
    # A more robust "profile completeness" check might involve resume_path as well,
    # but that would require the test script to upload a resume.
    # Determine target status based on updated information
    has_yoe = updated_user_obj.years_of_experience is not None
    has_resume = bool(updated_user_obj.resume_path)
    
    target_status: HrStatus
    if has_yoe and has_resume:
        target_status = "profile_complete"
    elif has_yoe or has_resume:
        # If profile was already complete or in an active mapping state, don't downgrade to pending_profile.
        # Only upgrade from a more basic state (like None or initial 'pending_profile') to 'pending_profile'.
        if updated_user_obj.hr_status in [None, "pending_profile"]: # Assuming None is a possible initial state or if user clears all data
             target_status = "pending_profile"
        else:
             target_status = updated_user_obj.hr_status # Keep current more advanced status
    else:
        # Neither YoE nor resume. If current status is advanced, keep it. Otherwise, could be None or initial pending_profile.
        # This logic implies if a user clears YoE and resume, their status doesn't automatically revert from 'profile_complete'.
        # This might need further business logic refinement if reversion is desired.
        # For now, if not complete and not partially complete, keep existing status.
        target_status = updated_user_obj.hr_status if updated_user_obj.hr_status else "pending_profile" # Default to pending_profile if status is None

    final_return_user = updated_user_obj

    # Update hr_status if it needs to change and is allowed to change
    # (e.g., don't change if already 'mapped' or in some other advanced state unless logic dictates)
    can_change_status_from = [None, "pending_profile", "profile_complete", "application_pending", "admin_request_pending"] # Statuses that can be overwritten by this logic
    
    if updated_user_obj.hr_status in can_change_status_from and updated_user_obj.hr_status != target_status:
        logger.info(f"HR {updated_user_obj.username} status changing from '{updated_user_obj.hr_status}' to '{target_status}'. YoE: {has_yoe}, Resume: {has_resume}")
        status_update_result = await db[settings.MONGODB_COLLECTION_USERS].update_one(
            {"_id": updated_user_obj.id},
            {"$set": {"hr_status": target_status, "updated_at": datetime.now(timezone.utc)}}
        )
        if status_update_result.modified_count > 0:
            logger.info(f"HR profile for {updated_user_obj.username} status successfully updated to '{target_status}'.")
            refetched_user_doc = await db[settings.MONGODB_COLLECTION_USERS].find_one({"_id": updated_user_obj.id})
            if refetched_user_doc:
                final_return_user = User.model_validate(refetched_user_doc)
        else:
            logger.warning(f"HR profile status update to '{target_status}' reported 0 modifications. Current DB status might be stale or already '{target_status}'.")
            # Re-fetch to ensure the returned user object has the most current status from DB
            current_db_user_doc = await db[settings.MONGODB_COLLECTION_USERS].find_one({"_id": updated_user_obj.id})
            if current_db_user_doc:
                 final_return_user = User.model_validate(current_db_user_doc)

    elif updated_user_obj.hr_status == target_status:
        logger.info(f"HR {updated_user_obj.username} status '{target_status}' is already correct. No change needed. YoE: {has_yoe}, Resume: {has_resume}")
    else: # Current status is an advanced one (e.g. mapped) that this logic shouldn't override to pending_profile/profile_complete
        logger.info(f"HR {updated_user_obj.username} status '{updated_user_obj.hr_status}' not changed by profile update. Target based on completion: '{target_status}'. YoE: {has_yoe}, Resume: {has_resume}")
        
    final_user_doc_for_log = await db[settings.MONGODB_COLLECTION_USERS].find_one({"_id": current_hr_user.id}) # Re-fetch for logging
    if final_user_doc_for_log:
        logger.info(f"HR {current_hr_user.username} final status before returning from update_hr_profile_details: {final_user_doc_for_log.get('hr_status')}")
    else:
        logger.error(f"Could not re-fetch HR user {current_hr_user.username} for final status log.")


    return HrProfileOut.model_validate(final_return_user)

@router.post("/resume", response_model=HrProfileOut)
async def upload_hr_resume(
    resume: UploadFile = File(...),
    current_hr_user: User = Depends(require_hr),
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    logger.info(f"HR user {current_hr_user.username} uploading/updating resume.")
    file_extension = Path(resume.filename).suffix.lower()
    if not file_extension or file_extension.lstrip(".").lower() not in HR_ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{resume.filename}'. Allowed: {', '.join(HR_ALLOWED_EXTENSIONS)}",
        )

    user_id_str = str(current_hr_user.id)
    safe_filename = f"{user_id_str}_{uuid.uuid4().hex}{file_extension}"
    file_location = HR_UPLOAD_DIRECTORY / safe_filename
    
    parsed_content: Optional[str] = None
    analysis_result: Dict[str, Any] = {}
    file_saved = False

    try:
        async with aiofiles.open(file_location, "wb") as buffer:
            content = await resume.read()
            await buffer.write(content)
        file_saved = True
        logger.info(f"Saved HR resume: {file_location}")

        try:
            parsed_content = await parse_resume(file_location)
            logger.info(f"HR Resume Parsed: {len(parsed_content) if parsed_content else 0} chars")
            if parsed_content:
                analysis_result = await resume_analyzer_service.analyze_resume(parsed_content)
                logger.info(f"HR Resume Analysis: Skills={len(analysis_result.get('extracted_skills_list',[]))}, YoE={analysis_result.get('estimated_yoe')}")
        except ResumeParserError as e:
            logger.error(f"Parsing HR resume {file_location} failed: {e}")
        except Exception as e:
            logger.error(f"Unexpected error during resume processing for {file_location}: {e}", exc_info=True)
            
    except Exception as e:
        logger.error(f"Failed to save or process HR resume {file_location}: {e}", exc_info=True)
        if file_saved and await aiofiles.os.path.exists(file_location): # Check if file_saved is true before attempting removal
            try: await aiofiles.os.remove(file_location)
            except Exception as e_clean: logger.error(f"Cleanup failed for {file_location}: {e_clean}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error saving or processing resume file.")
    finally:
        await resume.close()

    update_fields = {
        "resume_path": str(file_location.resolve()),
        "resume_text": parsed_content,
        "updated_at": datetime.now(timezone.utc),
    }
    if analysis_result.get("extracted_skills_list") is not None:
        update_fields["extracted_skills_list"] = analysis_result["extracted_skills_list"]
    if analysis_result.get("estimated_yoe") is not None:
        update_fields["years_of_experience"] = analysis_result["estimated_yoe"]
    
    try:
        result = await db[settings.MONGODB_COLLECTION_USERS].update_one(
            {"_id": current_hr_user.id}, {"$set": update_fields}
        )
        if result.matched_count == 0:
            if file_saved: # File was saved, but DB update failed for user
                 try: await aiofiles.os.remove(file_location)
                 except Exception as e_clean: logger.error(f"Cleanup failed for {file_location} (user not found for update): {e_clean}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HR User not found during resume data update.")
        
        logger.info(f"Updated HR {current_hr_user.username} with resume details.")
        
        updated_user_doc = await db[settings.MONGODB_COLLECTION_USERS].find_one({"_id": current_hr_user.id})
        if not updated_user_doc:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve user after resume data update.")

        updated_user_obj = User.model_validate(updated_user_doc) # This is the user after resume fields are set
        
        # Determine target status based on updated information
        has_yoe = updated_user_obj.years_of_experience is not None
        has_resume = bool(updated_user_obj.resume_path) # Should be true here as resume was just uploaded

        target_status: HrStatus
        if has_yoe and has_resume: # Both present
            target_status = "profile_complete"
        elif has_yoe or has_resume: # Only one present (e.g. resume just uploaded, but YoE might be missing)
             if updated_user_obj.hr_status in [None, "pending_profile"]:
                 target_status = "pending_profile"
             else:
                 target_status = updated_user_obj.hr_status # Keep current more advanced status
        else: # Should not happen if resume was just uploaded, but as a fallback
            target_status = updated_user_obj.hr_status if updated_user_obj.hr_status else "pending_profile"

        final_user_to_return = updated_user_obj
        
        can_change_status_from = [None, "pending_profile", "profile_complete", "application_pending", "admin_request_pending"]

        if updated_user_obj.hr_status in can_change_status_from and updated_user_obj.hr_status != target_status:
            logger.info(f"HR {updated_user_obj.username} status changing from '{updated_user_obj.hr_status}' to '{target_status}' after resume upload. YoE: {has_yoe}, Resume: {has_resume}")
            status_update_result = await db[settings.MONGODB_COLLECTION_USERS].update_one(
                {"_id": updated_user_obj.id},
                {"$set": {"hr_status": target_status, "updated_at": datetime.now(timezone.utc)}}
            )
            if status_update_result.modified_count > 0:
                logger.info(f"HR profile for {updated_user_obj.username} status successfully updated to '{target_status}'.")
                refetched_user_doc_after_status = await db[settings.MONGODB_COLLECTION_USERS].find_one({"_id": updated_user_obj.id})
                if refetched_user_doc_after_status:
                    final_user_to_return = User.model_validate(refetched_user_doc_after_status)
            else:
                logger.warning(f"HR profile status update to '{target_status}' after resume upload reported 0 modifications.")
                current_db_user_doc = await db[settings.MONGODB_COLLECTION_USERS].find_one({"_id": updated_user_obj.id})
                if current_db_user_doc:
                    final_user_to_return = User.model_validate(current_db_user_doc)
        elif updated_user_obj.hr_status == target_status:
             logger.info(f"HR {updated_user_obj.username} status '{target_status}' is already correct after resume upload. No change needed. YoE: {has_yoe}, Resume: {has_resume}")
        else:
             logger.info(f"HR {updated_user_obj.username} status '{updated_user_obj.hr_status}' not changed by resume upload. Target based on completion: '{target_status}'. YoE: {has_yoe}, Resume: {has_resume}")

        return HrProfileOut.model_validate(final_user_to_return)

    except Exception as db_e:
        logger.error(f"DB error during HR resume processing or status update for {current_hr_user.username}: {db_e}", exc_info=True)
        if file_saved: # File was successfully saved before this DB block
            try: await aiofiles.os.remove(file_location)
            except Exception as e_clean: logger.error(f"Cleanup failed for {file_location} during DB exception: {e_clean}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error updating user record with resume information.")

@router.get("/admins", response_model=List[AdminBasicInfo])
async def list_admins_for_application(
    current_hr_user: User = Depends(require_hr),
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    # Allow viewing admins if profile is complete, pending_profile, or if an application is already pending.
    # The ability to send a *new* application will be controlled by other logic (e.g., not already mapped, no duplicate to same admin).
    allowed_view_statuses: List[HrStatus] = ["profile_complete", "pending_profile", "application_pending", "admin_request_pending"]
    if current_hr_user.hr_status not in allowed_view_statuses:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your profile status ({current_hr_user.hr_status}) does not permit viewing the admin list at this time. Please check your profile or pending applications.",
        )
    
    admin_query = {
        "role": "admin"
        # Removed: "email": {"$not": {"$regex": "test", "$options": "i"}}
        # This filter was preventing test admins from being listed.
        # For a real production scenario, you might want other ways to distinguish test/system accounts if needed.
    }
    logger.info(f"Querying for admins with: {admin_query}") # Added log to see the query
    admins_cursor = db[settings.MONGODB_COLLECTION_USERS].find(
        admin_query, 
        projection={"_id": 1, "username": 1, "email": 1, "is_active": 1} # Added is_active for potential filtering
    )
    admins = await admins_cursor.to_list(length=None)
    return [AdminBasicInfo.model_validate(admin) for admin in admins]

@router.post("/apply/{admin_id}", status_code=status.HTTP_202_ACCEPTED, response_model=HRMappingRequestOut)
async def apply_to_admin(
    admin_id: str,
    current_hr_user: User = Depends(require_hr),
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    target_admin_oid = get_object_id(admin_id)
    logger.info(f"HR {current_hr_user.username} applying to Admin {admin_id}")
    invitation_service = InvitationService(db=db)
    try:
        request_doc = await invitation_service.create_hr_application(current_hr_user, target_admin_oid)
        return HRMappingRequestOut.model_validate(request_doc)
    except InvitationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error applying to Admin {admin_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send application.")

@router.get("/pending-admin-requests", response_model=List[HRMappingRequestOut])
async def get_pending_admin_requests(
    current_hr_user: User = Depends(require_hr),
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    logger.info(f"HR {current_hr_user.username} fetching pending admin requests.")
    invitation_service = InvitationService(db=db)
    try:
        pending_requests_data = await invitation_service.get_pending_requests_for_hr(current_hr_user.id)
        return [HRMappingRequestOut.model_validate(req) for req in pending_requests_data]
    except Exception as e:
        logger.error(f"Error fetching pending requests: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch pending admin requests.")

@router.get("/me/applications-sent", response_model=List[HRMappingRequestOut])
async def get_my_sent_applications_to_admins(
    current_hr_user: User = Depends(require_hr),
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    logger.info(f"HR {current_hr_user.username} fetching their sent applications to Admins.")
    try:
        requests_collection = db[settings.MONGODB_COLLECTION_HR_MAPPING_REQUESTS]
        requests_collection = db[settings.MONGODB_COLLECTION_HR_MAPPING_REQUESTS]
        
        pipeline = [
            {"$match": {
                "requester_id": current_hr_user.id,
                "request_type": "application" # Ensure this matches the type set in create_hr_application
            }},
            {"$sort": {"created_at": -1}}, # Sort by most recent first
            {
                "$lookup": {
                    "from": settings.MONGODB_COLLECTION_USERS,
                    "localField": "target_id", # The Admin HR applied to
                    "foreignField": "_id",
                    "as": "target_user_info_doc"
                }
            },
            {
                "$unwind": {
                    "path": "$target_user_info_doc",
                    "preserveNullAndEmptyArrays": True # Keep app even if admin somehow deleted
                }
            },
            # Lookup for requester_info (HR themselves) - might be useful for consistency
            {
                "$lookup": {
                    "from": settings.MONGODB_COLLECTION_USERS,
                    "localField": "requester_id",
                    "foreignField": "_id",
                    "as": "requester_user_info_doc"
                }
            },
            {
                "$unwind": {
                    "path": "$requester_user_info_doc",
                    "preserveNullAndEmptyArrays": True 
                }
            },
            {"$project": {
                "_id": 1, "request_type": 1, "status": 1, "created_at": 1, "updated_at": 1,
                "requester_id": 1, "target_id": 1, "requester_role": 1, "target_role": 1, # Include roles
                "requester_info": {
                    "id": "$requester_user_info_doc._id",
                    "username": "$requester_user_info_doc.username",
                    "email": "$requester_user_info_doc.email",
                    "role": "$requester_user_info_doc.role"
                },
                "target_info": { # This is the Admin's info
                    "id": "$target_user_info_doc._id",
                    "username": "$target_user_info_doc.username",
                    "email": "$target_user_info_doc.email",
                    "role": "$target_user_info_doc.role"
                }
            }}
        ]
        sent_apps_list = await requests_collection.aggregate(pipeline).to_list(length=None)
        
        # Validate each item with HRMappingRequestOut, which expects these populated fields
        validated_apps = []
        for app_data in sent_apps_list:
            try:
                validated_apps.append(HRMappingRequestOut.model_validate(app_data))
            except Exception as val_err:
                logger.error(f"Validation error for application data {app_data.get('_id')}: {val_err}", exc_info=True)
                # Optionally skip or handle error for this specific app
        
        return validated_apps
    except Exception as e:
        logger.error(f"Error fetching HR's sent applications: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch sent applications.")

@router.post("/accept-admin-request/{request_id}", response_model=HrProfileOut)
async def accept_admin_request(
    request_id: str,
    current_hr_user: User = Depends(require_hr),
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    request_oid = get_object_id(request_id)
    logger.info(f"HR {current_hr_user.username} accepting request {request_id}")
    invitation_service = InvitationService(db=db)
    try:
        updated_request = await invitation_service.hr_respond_to_admin_invitation(
            request_id=request_oid, 
            hr_user=current_hr_user, 
            action="accept"
        )
        # After successful acceptance and mapping, the HR user's profile is updated.
        # Re-fetch the HR user to return their latest profile, including mapping status.
        updated_hr_doc = await db[settings.MONGODB_COLLECTION_USERS].find_one({"_id": current_hr_user.id})
        if not updated_hr_doc:
            # This would be unusual if the service method succeeded
            logger.error(f"Failed to re-fetch HR user {current_hr_user.id} after accepting admin invitation {request_id}.")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve HR profile after request acceptance.")
        return HrProfileOut.model_validate(updated_hr_doc)
    except InvitationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error accepting request {request_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error accepting admin request.")

@router.post("/reject-admin-request/{request_id}", response_model=Dict[str, str])
async def reject_admin_request(
    request_id: str,
    current_hr_user: User = Depends(require_hr),
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    request_oid = get_object_id(request_id)
    logger.info(f"HR {current_hr_user.username} rejecting request {request_id}")
    invitation_service = InvitationService(db=db)
    try:
        updated_request = await invitation_service.hr_respond_to_admin_invitation(
            request_id=request_oid,
            hr_user=current_hr_user,
            action="reject"
        )
        return {"message": f"Request {request_id} successfully rejected. Status: {updated_request.status}"}
    except InvitationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error rejecting request {request_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error rejecting admin request.")

@router.post("/applications/{request_id}/confirm-mapping", response_model=HrProfileOut)
async def hr_confirm_chosen_admin_application(
    request_id: str,
    current_hr_user: User = Depends(require_hr),
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    request_oid = get_object_id(request_id)
    logger.info(f"HR {current_hr_user.username} attempting to confirm mapping via application {request_id}.")
    invitation_service = InvitationService(db=db)
    try:
        await invitation_service.hr_confirm_mapping_choice(
            request_id=request_oid,
            hr_user=current_hr_user
        )
        # After successful confirmation and mapping, return the updated HR profile.
        updated_hr_doc = await db[settings.MONGODB_COLLECTION_USERS].find_one({"_id": current_hr_user.id})
        if not updated_hr_doc:
            logger.error(f"Failed to re-fetch HR user {current_hr_user.id} after confirming mapping for request {request_id}.")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve HR profile after confirming mapping.")
        return HrProfileOut.model_validate(updated_hr_doc)
    except InvitationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error confirming mapping for request {request_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error confirming mapping choice.")

@router.post("/applications/{request_id}/cancel", response_model=HRMappingRequestOut)
async def hr_cancel_own_application(
    request_id: str,
    current_hr_user: User = Depends(require_hr),
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    request_oid = get_object_id(request_id)
    logger.info(f"HR {current_hr_user.username} attempting to cancel application {request_id}.")
    invitation_service = InvitationService(db=db)
    try:
        updated_request = await invitation_service.hr_cancel_application(
            request_id=request_oid,
            hr_user=current_hr_user
        )
        return HRMappingRequestOut.model_validate(updated_request)
    except InvitationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error cancelling application {request_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error cancelling application.")

@router.get("/me/approved-applications", response_model=List[HRMappingRequestOut])
async def get_my_admin_approved_applications(
    current_hr_user: User = Depends(require_hr),
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    logger.info(f"HR {current_hr_user.username} fetching their applications approved by Admins.")
    try:
        requests_collection = db[settings.MONGODB_COLLECTION_HR_MAPPING_REQUESTS]
        # Find applications made by this HR that an Admin has approved
        approved_apps_cursor = requests_collection.find({
            "requester_id": current_hr_user.id,
            "request_type": "application", # Application from HR to Admin
            "status": "admin_approved"     # Status indicating Admin approved it
        })
        approved_apps_list = await approved_apps_cursor.to_list(length=None)
        
        # Optionally enrich with target_info (Admin info) if not already done by a pipeline
        # For simplicity, assuming HRMappingRequestOut can be directly validated
        # or that the frontend will handle fetching Admin details if needed separately.
        # The HRMappingRequestOut schema includes requester_info and target_info.
        # We might need a similar aggregation pipeline as in get_pending_applications_for_admin
        # if detailed info is not directly on the document or needs to be fresh.
        # For now, let's assume the documents are sufficient or frontend handles enrichment.
        
        # A more robust way would be to use an aggregation similar to other get request endpoints
        # to ensure requester_info and target_info are populated correctly.
        # This is a simplified version for now.
        
        # TODO: Consider adding an aggregation pipeline here to populate target_info (Admin)
        # similar to get_pending_applications_for_admin if needed.
        
        return [HRMappingRequestOut.model_validate(app) for app in approved_apps_list]
    except Exception as e:
        logger.error(f"Error fetching HR's admin-approved applications: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch admin-approved applications.")

@router.post("/unmap", response_model=HrProfileOut)
async def unmap_from_admin(
    current_hr_user: User = Depends(require_hr),
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    logger.info(f"HR {current_hr_user.username} unmapping from Admin {current_hr_user.admin_manager_id}")
    invitation_service = InvitationService(db=db)
    try:
        if await invitation_service.hr_unmap(current_hr_user):
            updated_hr_doc = await db[settings.MONGODB_COLLECTION_USERS].find_one({"_id": current_hr_user.id})
            if not updated_hr_doc:
                 raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HR user not found after unmap operation.")
            return HrProfileOut.model_validate(updated_hr_doc)
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unmap operation failed.")
    except InvitationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error during unmap: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred during the unmap process.")

@router.get("/me/assigned-candidates", response_model=List[CandidateProfileOut])
async def get_my_assigned_candidates(
    current_hr_user: User = Depends(require_hr),
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    logger.info(f"HR {current_hr_user.username} fetching their assigned candidates.")
    if current_hr_user.hr_status != "mapped":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HR user must be mapped to an Admin to view assigned candidates."
        )
    candidates_collection = db[settings.MONGODB_COLLECTION_USERS]
    assigned_candidates_cursor = candidates_collection.find({
        "role": "candidate",
        "assigned_hr_id": current_hr_user.id
    })
    assigned_candidates_list = await assigned_candidates_cursor.to_list(length=None)
    return [CandidateProfileOut.model_validate(candidate) for candidate in assigned_candidates_list]

@router.get("/search-candidates", response_model=List[RankedCandidate])
async def search_candidates(
    current_hr_user: User = Depends(require_hr),
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
    keyword: Optional[str] = Query(None),
    required_skills: Optional[List[str]] = Query(None),
    yoe_min: Optional[int] = Query(None, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    if current_hr_user.hr_status != "mapped":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Action requires HR user to be mapped.")
    logger.info(f"Mapped HR {current_hr_user.username} searching candidates...")
    search_service = SearchService(db=db)
    try:
        return await search_service.search_candidates(
            keyword=keyword,
            required_skills=required_skills,
            yoe_min=yoe_min,
            limit=limit,
        )
    except Exception as e:
        logger.error(f"Error searching candidates: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to search candidates.")

@router.get("/messages", response_model=List[MessageOut])
async def get_hr_messages(
    current_hr_user: User = Depends(require_hr),
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    logger.info(f"HR {current_hr_user.username} fetching messages. Limit: {limit}, Offset: {offset}")
    messages_collection = db[settings.MONGODB_COLLECTION_MESSAGES]
    users_collection = db[settings.MONGODB_COLLECTION_USERS]

    messages_cursor = messages_collection.find(
        {"recipient_id": current_hr_user.id}
    ).sort("sent_at", -1).skip(offset).limit(limit)
    
    messages_list = await messages_cursor.to_list(length=limit)
    
    enriched_messages = []
    for msg_doc in messages_list:
        sender_info = None
        if msg_doc.get("sender_id"):
            sender_doc = await users_collection.find_one(
                {"_id": msg_doc["sender_id"]},
                projection={"username": 1}
            )
            if sender_doc:
                sender_info = BaseUserInfo(id=str(msg_doc["sender_id"]), username=sender_doc.get("username", "Unknown Sender"))
        
        # Ensure all fields required by MessageOut are present or have defaults
        msg_out_data = {
            **msg_doc,
            "id": msg_doc.get("_id"), # alias handling
            "sender_id": msg_doc.get("sender_id"),
            "recipient_id": msg_doc.get("recipient_id"),
            "subject": msg_doc.get("subject"),
            "content": msg_doc.get("content"),
            "sent_at": msg_doc.get("sent_at"),
            "read_status": msg_doc.get("read_status", False), # Default if missing
            "read_at": msg_doc.get("read_at"),
            "sender_info": sender_info
        }
        enriched_messages.append(MessageOut.model_validate(msg_out_data))
        
    return enriched_messages

@router.post("/messages/mark-read", response_model=Dict[str, Any])
async def mark_hr_messages_as_read(
    mark_read_request: MarkReadRequest,
    current_hr_user: User = Depends(require_hr),
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    logger.info(f"HR {current_hr_user.username} marking messages as read: {mark_read_request.message_ids}")
    messages_collection = db[settings.MONGODB_COLLECTION_MESSAGES]
    
    message_object_ids = [get_object_id(msg_id) for msg_id in mark_read_request.message_ids]

    result = await messages_collection.update_many(
        {
            "_id": {"$in": message_object_ids},
            "recipient_id": current_hr_user.id, # Ensure HR can only mark their own messages
            "read_status": False 
        },
        {"$set": {"read_status": True, "read_at": datetime.now(timezone.utc)}}
    )
    
    logger.info(f"Messages marked as read. Matched: {result.matched_count}, Modified: {result.modified_count}")
    if result.modified_count > 0:
        return {"success": True, "message": f"{result.modified_count} message(s) marked as read."}
    elif result.matched_count > 0 and result.modified_count == 0:
         return {"success": True, "message": "Messages were already marked as read or no unread messages found in selection."}
    else: # matched_count == 0
        # This could mean messages don't exist, don't belong to user, or are already read (if not for read_status: False filter)
        # Given the filter, it means they don't exist, don't belong, or were already read.
        # To be more precise, if we only update if read_status is False, then 0 matched means no such unread messages for this user.
        return {"success": False, "message": "No unread messages found for the provided IDs belonging to this user."}


@router.post("/messages/send/{recipient_user_id}", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message_to_user(
    recipient_user_id: str,
    message_data: MessageContentCreate,
    current_hr_user: User = Depends(require_hr),
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    logger.info(f"HR {current_hr_user.username} (ID: {current_hr_user.id}) attempting to send message to User {recipient_user_id}")

    target_user_oid = get_object_id(recipient_user_id)

    # Check if recipient user exists
    recipient_user_doc = await db[settings.MONGODB_COLLECTION_USERS].find_one({"_id": target_user_oid})
    if not recipient_user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Recipient user {recipient_user_id} not found.")

    message_doc_data = {
        "sender_id": current_hr_user.id,
        "recipient_id": target_user_oid,
        "subject": message_data.subject,
        "content": message_data.content,
        "sent_at": datetime.now(timezone.utc),
        "read_status": False,
        "read_at": None,
    }

    messages_collection = db[settings.MONGODB_COLLECTION_MESSAGES]
    try:
        result = await messages_collection.insert_one(message_doc_data)
        if not result.inserted_id:
            logger.error(f"Message insertion failed for HR {current_hr_user.id} to {recipient_user_id}, no inserted_id returned.")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Message insertion failed, no ID returned.")

        created_message_doc = await messages_collection.find_one({"_id": result.inserted_id})
        if not created_message_doc:
            logger.error(f"Failed to retrieve message {result.inserted_id} after insertion for HR {current_hr_user.id} to {recipient_user_id}.")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve message after sending.")
        
        logger.info(f"Message {result.inserted_id} sent by HR {current_hr_user.username} to User {recipient_user_id}.")
        return MessageOut.model_validate(created_message_doc)

    except Exception as e:
        logger.error(f"Failed to send message from HR {current_hr_user.username} to User {recipient_user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send message due to an internal error.")


@router.post("/candidate-invitations/{candidate_id}", response_model=Dict[str, str])
async def send_candidate_invitation_message(
    candidate_id: str,
    message_create: MessageContentCreate,
    current_hr_user: User = Depends(require_hr),
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    if current_hr_user.hr_status != "mapped":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Action requires HR user to be mapped to an Admin.")

    target_candidate_oid = get_object_id(candidate_id)
    logger.info(f"Mapped HR {current_hr_user.username} sending invitation message to Candidate {candidate_id}.")

    candidate_doc = await db[settings.MONGODB_COLLECTION_USERS].find_one(
        {"_id": target_candidate_oid, "role": "candidate"}
    )
    if not candidate_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target candidate not found.")

    messages_collection = db[settings.MONGODB_COLLECTION_MESSAGES]
    message_doc = {
        "sender_id": current_hr_user.id,
        "recipient_id": target_candidate_oid,
        "subject": message_create.subject or f"Invitation from {current_hr_user.username}",
        "content": message_create.content,
        "sent_at": datetime.now(timezone.utc),
        "read_status": False,
        "read_at": None,
    }
    try:
        result = await messages_collection.insert_one(message_doc)
        if not result.inserted_id:
            raise Exception("Message insertion failed.")
        logger.info(f"Message {result.inserted_id} sent to candidate {candidate_id} by HR {current_hr_user.username}.")
        return {"message": f"Invitation message sent to Candidate {candidate_id}."}
    except Exception as e:
        logger.error(f"Failed to save message to candidate {candidate_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send message.")
