# LLM_interviewer/server/app/schemas/application_request.py

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime

from .user import PyObjectIdStr, UserRole 

RequestMappingType = Literal["application", "request"] # 'application' = HR applies to Admin; 'request' = Admin invites HR
RequestMappingStatus = Literal[
    "pending", # Added from error message
    "accepted", # Added from error message
    "rejected", # Added from error message
    "cancelled", # Added from error message
    "pending_admin_approval",   # HR applied, Admin to review
    "admin_approved",           # Admin approved HR's application, HR to confirm
    "admin_rejected",           # Admin rejected HR's application
    "hr_confirmed_mapping",     # HR confirmed this connection (either their app or Admin's invite)
    "hr_rejected_invitation",   # HR rejected Admin's invitation
    "hr_cancelled_application", # HR cancelled their own application
    "request_pending_hr_approval", # Admin invited HR, HR to review
    "superceded"                # A different application/invitation was confirmed
]

class UserInfoBasic(BaseModel):
    id: PyObjectIdStr
    username: str
    email: str
    role: UserRole

    model_config = ConfigDict(from_attributes=True)

class HRMappingRequestBase(BaseModel):
    request_type: RequestMappingType
    requester_id: PyObjectIdStr  
    target_id: PyObjectIdStr  
    status: RequestMappingStatus

class HRMappingRequestOut(HRMappingRequestBase):
    id: PyObjectIdStr = Field(..., alias="_id")  
    created_at: datetime
    updated_at: datetime
    requester_info: Optional[UserInfoBasic] = Field(
        None, description="Basic info of the user who initiated (HR or Admin)"
    )
    target_info: Optional[UserInfoBasic] = Field(
        None, description="Basic info of the user who should respond (Admin or HR)"
    )

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,  
        arbitrary_types_allowed=True,
        json_encoders={datetime: lambda dt: dt.isoformat() if dt else None},
    )
