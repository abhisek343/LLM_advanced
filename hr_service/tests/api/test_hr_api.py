import pytest
from httpx import AsyncClient
from typing import Any, Dict
from fastapi import status
from app.main import app # The FastAPI app instance
from app.core.security import get_current_active_user # Assuming this is the dependency
# Corrected imports: Schemas are in app.schemas.user
from app.schemas.user import UserOut, HrProfileUpdate, HrProfileOut 
from bson import ObjectId
from datetime import datetime

# Mock HR user data
MOCK_HR_USER_ID = str(ObjectId())
MOCK_HR_EMAIL = "test.hr@example.com"
MOCK_HR_USERNAME = "testhr"

async def override_get_current_active_user_hr() -> UserOut:
    return UserOut(
        id=MOCK_HR_USER_ID, 
        username=MOCK_HR_USERNAME, 
        email=MOCK_HR_EMAIL, 
        role="hr",
        created_at=datetime.utcnow()
    )

@pytest.mark.asyncio
async def test_update_and_get_hr_profile(client_hr: AsyncClient, test_db_client_hr: Any):
    app.dependency_overrides[get_current_active_user] = override_get_current_active_user_hr

    profile_payload = {
        "company": "Innovate HR Solutions",
        "years_of_experience": 5,
        "specialization": "Tech Recruitment"
    }
    
    # Update (Create/Replace) HR Profile Details
    response_post = await client_hr.post("/profile-details", json=profile_payload)
    assert response_post.status_code == status.HTTP_200_OK
    updated_profile = response_post.json()
    
    assert updated_profile["company"] == profile_payload["company"]
    assert updated_profile["years_of_experience"] == profile_payload["years_of_experience"]
    assert updated_profile["user_id"] == MOCK_HR_USER_ID
    # Email in HrProfileOut comes from the linked UserOut.
    # assert updated_profile["email"] == MOCK_HR_EMAIL 
    assert updated_profile["hr_status"] == "profile_complete" 

    # Get HR Profile Details to verify
    response_get = await client_hr.get("/profile-details")
    assert response_get.status_code == status.HTTP_200_OK
    fetched_profile = response_get.json()

    assert fetched_profile["company"] == profile_payload["company"]
    assert fetched_profile["specialization"] == profile_payload["specialization"]

    app.dependency_overrides = {} # Clear overrides

@pytest.mark.asyncio
async def test_hr_list_admins(client_hr: AsyncClient, test_db_client_hr: Any):
    app.dependency_overrides[get_current_active_user] = override_get_current_active_user_hr
    
    response = await client_hr.get("/admins")
    assert response.status_code == status.HTTP_200_OK
    assert isinstance(response.json(), list)

    app.dependency_overrides = {} # Clear overrides
