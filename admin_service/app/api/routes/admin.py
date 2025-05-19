# LLM_interviewer/server/app/api/routes/admin.py

import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Body, Query
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone

# Core, models, schemas, db
from app.core.security import verify_admin_user, verify_hr_or_admin_user # Adjusted
from app.models.user import User, CandidateMappingStatus, HrStatus # Adjusted
from app.schemas.user import UserOut, HrProfileOut, CandidateProfileOut, PyObjectIdStr, AdminBasicInfo # Adjusted
# from pydantic import BaseModel, Field 
from app.schemas.application_request import HRMappingRequestOut # Adjusted
from app.schemas.search import RankedHR  # Adjusted
from app.schemas.admin import AssignHrRequest, UserActivationStatusUpdate # Adjusted (Added UserActivationStatusUpdate)

from app.db.mongodb import mongodb # Adjusted
from app.core.config import settings # Adjusted
from app.services.invitation_service import InvitationService, InvitationError # Adjusted
from app.services.search_service import SearchService  # Adjusted

# Configure logging
logger = logging.getLogger(__name__)


# --- Helper & Schema --- (No change)
def get_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(str(id_str))
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid ID format: {id_str}")


# AssignHrRequest is now imported from app.schemas.admin


# --- Router Setup --- (No change)
router = APIRouter(
    prefix="/admin", tags=["Admin"] # Removed global dependency
)


# --- Admin User/Stats Routes --- (No change)
@router.get("/users", response_model=List[UserOut], dependencies=[Depends(verify_admin_user)]) # Added specific dependency
async def get_all_users(
    admin_user: User = Depends(verify_admin_user), # This inner Depends is for param injection, not auth for the route itself
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
) -> List[UserOut]:
    logger.info(f"Admin {admin_user.username} requested list of all users (excluding other admins).")
    users_collection = db[settings.MONGODB_COLLECTION_USERS]
    # Filter out other admin users. The current admin might still see themselves if not explicitly excluded.
    # To strictly exclude ALL admins including self from this list: {"role": {"$ne": "admin"}}
    # To exclude other admins but allow self: {"$or": [{"role": {"$ne": "admin"}}, {"_id": admin_user.id}]}
    # For a general user management list, excluding all admins is usually desired.
    # Also, attempt to filter out common patterns for test user emails.
    query = {
        "$and": [
            {"role": {"$ne": "admin"}},
            {"email": {"$not": {"$regex": "test", "$options": "i"}}} # Exclude emails containing "test" (case-insensitive)
        ]
    }
    users_list = await users_collection.find(query).to_list(length=None)
    return [UserOut.model_validate(u) for u in users_list]


@router.get("/stats", dependencies=[Depends(verify_admin_user)]) # Added specific dependency
async def get_system_stats(
    admin_user: User = Depends(verify_admin_user), # Param injection
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    logger.info(f"Admin {admin_user.username} requested system stats.")
    # ... (fetch counts) ...
    users_collection = db[settings.MONGODB_COLLECTION_USERS]
    interviews_collection = db[settings.MONGODB_COLLECTION_INTERVIEWS]

    # Refined total_users count: exclude admins and test users
    # Count all users, including admins
    total_users_query = {}
    total_users = await users_collection.count_documents(total_users_query)
    
    total_interviews_scheduled = await interviews_collection.count_documents({}) # This might also need refinement if test interviews exist
    total_interviews_completed = await interviews_collection.count_documents(
        {"status": "completed"}
    )
    total_hr_mapped = await users_collection.count_documents(
        {"role": "hr", "hr_status": "mapped"}
    )
    total_candidates_assigned = await users_collection.count_documents(
        {"role": "candidate", "mapping_status": "assigned"}
    )
    stats = {
        "total_users": total_users,
        "total_hr_mapped": total_hr_mapped,
        "total_candidates_assigned": total_candidates_assigned,
        "total_interviews_scheduled": total_interviews_scheduled,
        "total_interviews_completed": total_interviews_completed,
        "llm_service_status": "Operational (Placeholder)",
    }
    return stats

@router.get("/users/{user_id}", response_model=UserOut, dependencies=[Depends(verify_admin_user)]) # Added specific dependency
async def get_user_by_id(
    user_id: str,
    admin_user: User = Depends(verify_admin_user), # Param injection
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    logger.info(f"Admin {admin_user.username} requested user with ID: {user_id}")
    user_oid = get_object_id(user_id)
    user_doc = await db[settings.MONGODB_COLLECTION_USERS].find_one({"_id": user_oid})

    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found.")

    # Prevent admin from fetching details of another admin, unless it's themselves
    if user_doc.get("role") == "admin" and user_doc.get("_id") != admin_user.id:
        logger.warning(f"Admin {admin_user.username} attempted to fetch details of another admin {user_id}.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrators cannot view details of other administrators.")
        
    return UserOut.model_validate(user_doc)

# --- HR Application/Mapping Management Endpoints ---


@router.get("/hr-applications", response_model=List[HRMappingRequestOut], dependencies=[Depends(verify_admin_user)]) # Added specific dependency
async def get_hr_applications(
    admin_user: User = Depends(verify_admin_user), # Param injection
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    # ... (Implementation uses InvitationService) ...
    logger.info(f"Admin {admin_user.username} fetching pending HR applications.")
    invitation_service = InvitationService(db=db)
    try:
        pending_apps_data = await invitation_service.get_pending_applications_for_admin(
            admin_user.id # This method in invitation_service should already return a list
        )
        # Ensure it's always a list, even if the service method might sometimes return a single item or None
        if pending_apps_data is None:
            return []
        if not isinstance(pending_apps_data, list):
            # This case should ideally not happen if the service method is correct,
            # but as a safeguard for the response_model=List[...]
            logger.warning(f"/hr-applications endpoint received non-list from service: {type(pending_apps_data)}. Wrapping in list.")
            return [HRMappingRequestOut.model_validate(pending_apps_data)] 
        
        return [HRMappingRequestOut.model_validate(app) for app in pending_apps_data]
    except Exception as e:
        logger.error(f"Error fetching HR applications: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch HR applications.")


@router.post("/hr-applications/{application_id}/accept", response_model=Dict[str, str], dependencies=[Depends(verify_admin_user)]) # Added specific dependency
async def accept_hr_application(
    application_id: str,
    admin_user: User = Depends(verify_admin_user), # Param injection
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    # ... (Implementation uses InvitationService) ...
    logger.info(
        f"Admin {admin_user.username} accepting application ID {application_id}"
    )
    app_oid = get_object_id(application_id)
    invitation_service = InvitationService(db=db)
    try:
        if await invitation_service.accept_request_or_application(app_oid, admin_user):
            return {"message": f"Application {application_id} accepted."}
        else:
            raise HTTPException(status_code=500, detail="Acceptance failed.")
    except InvitationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(
            f"Error accepting application {application_id}: {e}", exc_info=True
        )
        raise HTTPException(status_code=500)


@router.post("/hr-applications/{application_id}/reject", response_model=Dict[str, str], dependencies=[Depends(verify_admin_user)]) # Added specific dependency
async def reject_hr_application(
    application_id: str,
    admin_user: User = Depends(verify_admin_user), # Param injection
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    # ... (Implementation uses InvitationService) ...
    logger.info(
        f"Admin {admin_user.username} rejecting application ID {application_id}"
    )
    app_oid = get_object_id(application_id)
    invitation_service = InvitationService(db=db)
    try:
        if await invitation_service.reject_request_or_application(app_oid, admin_user):
            return {"message": f"Application {application_id} rejected."}
        else:
            raise HTTPException(status_code=500, detail="Rejection failed.")
    except InvitationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(
            f"Error rejecting application {application_id}: {e}", exc_info=True
        )
        raise HTTPException(status_code=500)


# --- HR Search/Request Endpoints --- (Integration mostly done)


@router.get("/search-hr", response_model=List[RankedHR], dependencies=[Depends(verify_admin_user)]) # Added specific dependency
async def search_hr_profiles(
    admin_user: User = Depends(verify_admin_user), # Param injection
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
    status_filter: Optional[HrStatus] = Query(None),
    keyword: Optional[str] = Query(None),
    yoe_min: Optional[int] = Query(None, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    # ... (Implementation uses SearchService placeholder) ...
    logger.info(
        f"Admin {admin_user.username} searching HR profiles. Status: {status_filter}, Keyword: {keyword}, YoE Min: {yoe_min}"
    )
    search_service = SearchService(db=db)
    try:
        return await search_service.search_hr_profiles(
            keyword=keyword, yoe_min=yoe_min, status_filter=status_filter, limit=limit
        )
    except pymongo.errors.OperationFailure as op_e:
        logger.critical(f"ADMIN_ROUTE_DEBUG: Caught pymongo.errors.OperationFailure in /search-hr route for keyword: {keyword}. Error: {op_e}") # CRITICAL DEBUG LOG
        logger.error(f"MongoDB OperationFailure during HR search: {op_e}", exc_info=True)
        # Specifically check if it's a text index issue
        if "text index required" in str(op_e).lower() or op_e.code == 27:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Search functionality is currently unavailable due to a database configuration issue (missing text index). Please contact support.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="A database error occurred while searching HR profiles.")
    except Exception as e:
        logger.error(f"Unexpected error searching HR profiles: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred while searching HR profiles.")


@router.post("/hr-mapping-requests/{hr_user_id}", response_model=HRMappingRequestOut, dependencies=[Depends(verify_admin_user)]) # Added specific dependency
async def send_hr_mapping_request(
    hr_user_id: str,
    admin_user: User = Depends(verify_admin_user), # Param injection
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    # ... (Implementation uses InvitationService) ...
    logger.info(
        f"Admin {admin_user.username} sending mapping request to HR {hr_user_id}"
    )
    hr_user_oid = get_object_id(hr_user_id)
    invitation_service = InvitationService(db=db)
    try:
        return HRMappingRequestOut.model_validate(
            await invitation_service.create_admin_request(admin_user, hr_user_oid)
        )
    except InvitationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error sending mapping request: {e}", exc_info=True)
        raise HTTPException(status_code=500)

@router.get("/me/hr-mapping-requests-sent", response_model=List[HRMappingRequestOut], dependencies=[Depends(verify_admin_user)]) # Added specific dependency
async def get_my_sent_hr_mapping_requests(
    admin_user: User = Depends(verify_admin_user), # Param injection
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    """
    Retrieves a list of HR mapping requests sent by the currently authenticated Admin.
    """
    logger.info(f"Admin {admin_user.username} fetching their sent HR mapping requests.")
    try:
        # This assumes your InvitationService or a direct query can fetch these.
        # For demonstration, a direct query:
        requests_collection = db[settings.MONGODB_COLLECTION_HR_MAPPING_REQUESTS] # Ensure this collection name is correct in settings
        sent_requests_cursor = requests_collection.find({
            "requester_id": admin_user.id, # ID of the admin who sent the request
            "request_type": "admin_to_hr_invitation" # Make sure this type matches what's stored
        })
        sent_requests_list = await sent_requests_cursor.to_list(length=None)
        return [HRMappingRequestOut.model_validate(req) for req in sent_requests_list]
    except Exception as e:
        logger.error(f"Error fetching Admin's sent HR mapping requests: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch sent HR mapping requests.")


# --- Candidate Assignment Endpoint --- (No changes needed)


@router.post(
    "/candidates/{candidate_id}/assign-hr",
    response_model=CandidateProfileOut,
    openapi_extra={
        "requestBody": {
            "content": {
                "application/json": {
                    "schema": {"$ref": "#/components/schemas/AssignHrRequest"}
                }
            }
        }
    },
    dependencies=[Depends(verify_admin_user)] # Added specific dependency
)
async def assign_hr_to_candidate(
    candidate_id: str,
    assign_request: AssignHrRequest,
    admin_user: User = Depends(verify_admin_user), # Param injection
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
):
    # ... (Implementation remains the same as previous version) ...
    candidate_oid = get_object_id(candidate_id)
    hr_oid_to_assign = get_object_id(assign_request.hr_id)
    logger.info(
        f"Admin {admin_user.username} assigning HR {hr_oid_to_assign} to Candidate {candidate_oid}"
    )
    # Validation ...
    candidate_doc = await db[settings.MONGODB_COLLECTION_USERS].find_one(
        {"_id": candidate_oid, "role": "candidate"}
    )
    if not candidate_doc:
        logger.warning(f"Assign HR failed: Candidate with ID {candidate_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Candidate with ID {candidate_id} not found.")

    candidate_status = candidate_doc.get("mapping_status")
    if candidate_status != "pending_assignment":
        logger.warning(f"Assign HR failed: Candidate {candidate_id} status is '{candidate_status}', required 'pending_assignment'.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Candidate is not in the required 'pending_assignment' state (Current: {candidate_status})."
        )

    hr_doc = await db[settings.MONGODB_COLLECTION_USERS].find_one(
        {"_id": hr_oid_to_assign, "role": "hr"}
    )
    if not hr_doc:
        logger.warning(f"Assign HR failed: HR user with ID {assign_request.hr_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"HR user with ID {assign_request.hr_id} not found.")

    hr_status = hr_doc.get("hr_status")
    if hr_status != "mapped":
        logger.warning(f"Assign HR failed: HR user {assign_request.hr_id} status is '{hr_status}', required 'mapped'.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"HR user is not in the required 'mapped' state (Current: {hr_status})."
        )
    # Assignment ...
    update_data = {
        "$set": {
            "mapping_status": "assigned",
            "assigned_hr_id": hr_oid_to_assign,
            "updated_at": datetime.now(timezone.utc),
        }
    }
    update_result = await db[settings.MONGODB_COLLECTION_USERS].update_one(
        {"_id": candidate_oid}, update_data
    )
    if update_result.modified_count == 1:
        updated_candidate_doc = await db[settings.MONGODB_COLLECTION_USERS].find_one(
            {"_id": candidate_oid}
        )
        return CandidateProfileOut.model_validate(updated_candidate_doc)
    else:
        logger.error(f"Failed assign HR for candidate {candidate_id}.")
        raise HTTPException(status_code=500)


# --- Endpoint for HR to list Admin users ---
# This route should have its specific dependency, and not be affected by a global admin-only one.
@router.get("/list-admins", response_model=List[AdminBasicInfo], dependencies=[Depends(verify_hr_or_admin_user)])
async def list_admin_users_for_hr(
    current_user: User = Depends(verify_hr_or_admin_user), # Param injection
    db: AsyncIOMotorClient = Depends(mongodb.get_db),
) -> List[AdminBasicInfo]:
    """
    Provides a list of admin users with basic information.
    Accessible by HR and Admin users.
    """
    logger.info(f"User {current_user.username} (Role: {current_user.role}) requested list of admin users.")
    users_collection = db[settings.MONGODB_COLLECTION_USERS]
    
    admin_users_cursor = users_collection.find({"role": "admin"})
    admin_users_list = await admin_users_cursor.to_list(length=None) # Fetch all matching
    
    if not admin_users_list:
        return []
        
    return [AdminBasicInfo.model_validate(u) for u in admin_users_list]
