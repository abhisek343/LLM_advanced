# LLM_interviewer/server/app/schemas/user.py

from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict 
from typing import List, Optional, Literal, Any
from datetime import datetime
from bson import ObjectId

UserRole = Literal["candidate", "hr", "admin"]

class PyObjectIdStr(str):
    @classmethod
    def validate(cls, v: Any, _info) -> str: 
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str) and ObjectId.is_valid(v):
            return v
        raise ValueError(f"Not a valid ObjectId string: {v}")

    @classmethod
    def __get_pydantic_core_schema__(cls, source_type: Any, handler: Any) -> Any:
        from pydantic_core import core_schema
        return core_schema.with_info_plain_validator_function(
            cls.validate, 
             serialization=core_schema.to_string_ser_schema(), 
        )

class BaseUser(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True, 
        arbitrary_types_allowed=True, 
        from_attributes=True  
    )

    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    role: UserRole 

    @field_validator('role', mode='before')
    @classmethod
    def check_role(cls, value: str) -> str:
        allowed_roles = list(UserRole.__args__) 
        if value not in allowed_roles:
            raise ValueError(f"Invalid role '{value}'. Must be one of: {', '.join(allowed_roles)}")
        return value

class UserCreate(BaseUser):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8) 

class UserOut(BaseUser):
    id: PyObjectIdStr = Field(..., alias="_id", serialization_alias="id") 
    created_at: Optional[datetime] = None
    resume_path: Optional[str] = None 

class UserResponse(BaseModel):
    message: str
    user: Optional[UserOut] = None
    users: Optional[List[UserOut]] = None 

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None

HrStatus = Literal[
    "pending_profile", "profile_complete", "application_pending", 
    "admin_request_pending", "mapped", "suspended", "pending_mapping_approval"
]

CandidateMappingStatus = Literal[
    "pending_resume", "pending_assignment", "assigned", 
    "interview_scheduled", "interview_completed"
]

class CandidateProfileOut(UserOut): 
    resume_text: Optional[str] = None
    extracted_skills_list: Optional[List[str]] = Field(None, alias="extracted_skills_list")
    estimated_yoe: Optional[float] = Field(None, alias="estimated_yoe")
    mapping_status: Optional[str] = None 
    assigned_hr_id: Optional[PyObjectIdStr] = None 

    model_config = ConfigDict(
        populate_by_name=True, 
        arbitrary_types_allowed=True 
    )

class CandidateProfileUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        extra='ignore' 
    )

class HrProfileOut(UserOut): 
    hr_status: Optional[HrStatus] = None 
    years_of_experience: Optional[float] = Field(None, ge=0)
    company: Optional[str] = None
    specialization: Optional[str] = Field(None, max_length=100, description="HR's specialization or domain expertise.") # Added specialization
    admin_manager_id: Optional[PyObjectIdStr] = None 

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )

class HrProfileUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50) 
    email: Optional[EmailStr] = None 
    years_of_experience: Optional[int] = Field(None, ge=0, description="Years of professional experience.")
    company: Optional[str] = Field(None, max_length=100, description="Current or most recent company.")
    specialization: Optional[str] = Field(None, max_length=100, description="HR's specialization or domain expertise.") # Added specialization
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        extra='ignore' 
    )

class AdminBasicInfo(BaseModel):
    id: PyObjectIdStr = Field(..., alias="_id", serialization_alias="id") 
    username: str
    email: EmailStr

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        from_attributes=True 
    )
