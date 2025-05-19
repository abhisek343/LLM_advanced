# LLM_interviewer/server/app/models/application_request.py

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime, timezone 
from bson import ObjectId

from ..schemas.user import PyObjectIdStr, UserRole # Adjusted import

RequestMappingType = Literal["application", "request"]
# Using the more comprehensive status list from the schemas file
RequestMappingStatus = Literal[
    "pending",
    "accepted",
    "rejected",
    "cancelled",
    "pending_admin_approval",
    "admin_approved",
    "admin_rejected",
    "hr_confirmed_mapping",
    "hr_rejected_invitation",
    "hr_cancelled_application",
    "request_pending_hr_approval",
    "superceded"
]


class HRMappingRequest(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,  
        arbitrary_types_allowed=True, 
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()} 
    )

    id: PyObjectIdStr = Field(..., alias="_id", description="The document's MongoDB ObjectId")
    request_type: RequestMappingType = Field(..., description="Type of interaction: 'application' (HR to Admin) or 'request' (Admin to HR)")
    requester_id: PyObjectIdStr = Field(..., description="ID of the user who initiated the request/application")
    requester_role: UserRole = Field(..., description="Role of the requester (HR or Admin)")
    target_id: PyObjectIdStr = Field(..., description="ID of the user who is the target of the request/application")
    target_role: UserRole = Field(..., description="Role of the target (Admin or HR)")
    status: RequestMappingStatus = Field(..., description="Current status of the request/application")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
