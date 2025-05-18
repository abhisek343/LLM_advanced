# LLM_interviewer/server/app/schemas/admin.py
from pydantic import BaseModel, Field, ConfigDict
from .user import PyObjectIdStr # Adjusted import
from ..core.schema_utils import clean_model_title # Adjusted import

class AssignHrRequest(BaseModel):
    hr_id: PyObjectIdStr = Field(..., description="The MongoDB ObjectId of the HR user to assign.")

    model_config = ConfigDict(
        json_schema_extra = {
            "example": {
                "hr_id": "60d5ec49f72f3b5e9f1d0a1b"
            }
        }
    )

# Add other Admin-specific request/response schemas here as needed

class UserActivationStatusUpdate(BaseModel):
    is_active: bool = Field(..., description="The desired activation status for the user.")

    model_config = ConfigDict(
        json_schema_extra = {
            "example": {
                "is_active": True
            }
        }
    )
