# LLM_interviewer/server/app/models/user.py

from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, Literal 
from datetime import datetime, timezone 
from bson import ObjectId 

CandidateMappingStatus = Literal[
    "pending_resume", 
    "pending_assignment", 
    "assigned" 
]

HrStatus = Literal[
    "pending_profile", 
    "profile_complete", 
    "application_pending", 
    "admin_request_pending", 
    "mapped",
    "pending_mapping_approval", # Added to align with potential frontend/DB values
    "suspended" # Added to align with schemas/user.py
]

try:
    from ..schemas.user import UserRole # Adjusted for relative import
except ImportError:
    UserRole = Literal["candidate", "hr", "admin"]


class User(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        validate_assignment=True,
        extra='ignore'  # Add this line
    )

    id: Optional[ObjectId] = Field(default=None, alias="_id", description="MongoDB document ObjectID")
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    hashed_password: str = Field(...) 
    role: UserRole 

    mapping_status: Optional[CandidateMappingStatus] = Field(
        default=None, 
        description="Candidate's status in the HR mapping workflow"
    )
    assigned_hr_id: Optional[ObjectId] = Field(
        default=None,
        description="ObjectId of the HR user assigned to this Candidate by an Admin"
    )

    hr_status: Optional[HrStatus] = Field(
        default=None, 
        description="HR user's status in the Admin mapping/application workflow"
    )
    admin_manager_id: Optional[ObjectId] = Field(
        default=None,
        description="ObjectId of the Admin this HR user is currently mapped to"
    )
    years_of_experience: Optional[float] = Field(  # Changed int to float
        default=None,
        ge=0,
        description="Years of experience (primarily for HR profile)"
    )
    company: Optional[str] = Field(
        default=None,
        description="Current or most recent company (primarily for HR profile)"
    )
    specialization: Optional[str] = Field(
        default=None,
        max_length=150, # Added a sensible max_length
        description="HR user's specialization or domain"
    )
    
    resume_path: Optional[str] = Field(
        default=None,
        description="Path to the uploaded resume file (applies to Candidate and HR)"
    )
    resume_text: Optional[str] = Field(
        default=None,
        description="Parsed text content of the resume (applies to Candidate and HR)"
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
