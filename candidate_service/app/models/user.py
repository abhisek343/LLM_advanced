# LLM_interviewer/server/app/models/user.py

from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, Literal # Added Literal
from datetime import datetime, timezone # Ensure timezone is imported
from bson import ObjectId # Import ObjectId directly

# --- Define Literal types for statuses ---
# Candidate Mapping Statuses
CandidateMappingStatus = Literal[
    "pending_resume", # Initial state after registration
    "pending_assignment", # Resume uploaded, waiting for Admin assignment
    "assigned" # Assigned to an HR by Admin
]

# HR Statuses
HrStatus = Literal[
    "pending_profile", # Initial state after registration
    "profile_complete", # Resume/YoE uploaded, ready to apply/be requested
    "application_pending", # Applied to an Admin, waiting for acceptance
    "admin_request_pending", # An Admin has sent a mapping request, waiting for HR acceptance
    "mapped" # Accepted by/has accepted an Admin, ready for work
]
# --- End Literal types ---


# Import UserRole Literal from the primary schemas file for consistency
try:
    # Assuming UserRole is defined in your updated app/schemas/user.py
    from ..schemas.user import UserRole # Adjusted for relative import
except ImportError:
    # Fallback if the import fails (shouldn't happen if schemas/user.py is correct)
    UserRole = Literal["candidate", "hr", "admin"]


class User(BaseModel):
    """
    Represents a User document in the MongoDB database.
    This model includes all fields stored in the collection, including sensitive ones like hashed_password,
    and new fields for status tracking and relationships based on the refined workflow.
    """
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        validate_assignment=True 
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
    years_of_experience: Optional[int] = Field(
        default=None,
        ge=0, 
        description="Years of experience (primarily for HR profile)"
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
