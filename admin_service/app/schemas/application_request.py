# LLM_interviewer/server/app/schemas/application_request.py

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime

from .user import PyObjectIdStr, UserRole # This should work as user.py is in the same directory

RequestMappingType = Literal["application", "request"]
RequestMappingStatus = Literal["pending", "accepted", "rejected", "cancelled"]

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

HRMappingRequest = HRMappingRequestBase # Alias for use in service

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
