import pytest
from httpx import AsyncClient
from typing import Any, Dict
from fastapi import status
from app.main import app # The FastAPI app instance
from app.core.security import get_current_active_user # Assuming this is the dependency
# Corrected imports: Schemas are in app.schemas.user
from app.schemas.user import UserOut, CandidateProfileUpdate, CandidateProfileOut 
from bson import ObjectId # For creating mock ObjectIds
from datetime import datetime

# Mock user data
MOCK_CANDIDATE_USER_ID = str(ObjectId())
MOCK_CANDIDATE_EMAIL = "test.candidate@example.com"
MOCK_CANDIDATE_USERNAME = "testcandidate"

# This function will be used to override the actual dependency
async def override_get_current_active_user_candidate() -> UserOut:
    return UserOut(
        id=MOCK_CANDIDATE_USER_ID, 
        username=MOCK_CANDIDATE_USERNAME, 
        email=MOCK_CANDIDATE_EMAIL, 
        role="candidate",
        created_at=datetime.utcnow() 
    )

@pytest.mark.asyncio
async def test_get_candidate_profile_after_creation(client_candidate: AsyncClient, test_db_client_candidate: Any):
    app.dependency_overrides[get_current_active_user] = override_get_current_active_user_candidate

    # First, create/update a profile so there's something to GET
    profile_payload = {
        "full_name": "Initial Candidate Name",
        "phone_number": "1112223333",
        "skills": ["initial_skill"]
    }
    put_response = await client_candidate.put("/profile", json=profile_payload)
    assert put_response.status_code == status.HTTP_200_OK

    # Now, get the profile
    response = await client_candidate.get("/profile")
    assert response.status_code == status.HTTP_200_OK
    profile_data = response.json()
    assert profile_data["full_name"] == "Initial Candidate Name"
    assert profile_data["user_id"] == MOCK_CANDIDATE_USER_ID
    assert "initial_skill" in profile_data["skills"]

    app.dependency_overrides = {} # Clear overrides

@pytest.mark.asyncio
async def test_update_candidate_profile(client_candidate: AsyncClient, test_db_client_candidate: Any):
    app.dependency_overrides[get_current_active_user] = override_get_current_active_user_candidate

    # Initial profile creation
    initial_payload = {
        "full_name": "Original Name",
        "phone_number": "1234567890",
        "linkedin_profile": "https://linkedin.com/in/original",
        "professional_summary": "Original summary.",
        "education": [{"degree": "BA", "institution": "Old Uni", "year": 2018}],
        "experience": [{"title": "Junior Dev", "company": "StartOld", "years": 1, "description": "Old work."}],
        "skills": ["original_skill"]
    }
    response_put_initial = await client_candidate.put("/profile", json=initial_payload)
    assert response_put_initial.status_code == status.HTTP_200_OK

    # Update Profile
    update_payload = {
        "full_name": "Updated Candidate Name",
        "phone_number": "9876543210",
        "linkedin_profile": "https://linkedin.com/in/updatedcandidate",
        "professional_summary": "An updated dedicated professional.",
        "education": [{"degree": "BSc", "institution": "Test University", "year": 2020}],
        "experience": [{"title": "Dev", "company": "TestCo", "years": 2, "description": "New work."}],
        "skills": ["python", "fastapi"] # This should replace existing skills
    }
    response_put_update = await client_candidate.put("/profile", json=update_payload)
    assert response_put_update.status_code == status.HTTP_200_OK
    updated_profile = response_put_update.json()
    
    assert updated_profile["full_name"] == update_payload["full_name"]
    assert updated_profile["phone_number"] == update_payload["phone_number"]
    assert updated_profile["user_id"] == MOCK_CANDIDATE_USER_ID
    assert updated_profile["profile_status"] == "profile_complete" 
    assert len(updated_profile["skills"]) == 2
    assert "python" in updated_profile["skills"]
    assert "original_skill" not in updated_profile["skills"] # Verifying overwrite

    # Get Profile to verify the update persisted
    response_get = await client_candidate.get("/profile")
    assert response_get.status_code == status.HTTP_200_OK
    fetched_profile = response_get.json()

    assert fetched_profile["full_name"] == update_payload["full_name"]
    assert fetched_profile["phone_number"] == update_payload["phone_number"]
    assert "fastapi" in fetched_profile["skills"]

    app.dependency_overrides = {} # Clear overrides
