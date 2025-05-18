import pytest
from httpx import AsyncClient
from typing import Any, Dict
from fastapi import status
from app.main import app # The FastAPI app instance
from app.core.security import get_current_active_user # Assuming this is the dependency
from app.schemas.user import UserOut 
from app.schemas.interview import InterviewCreate, InterviewOut # Corrected import
from bson import ObjectId
from datetime import datetime

# Mock HR user data for scheduling
MOCK_SCHEDULER_USER_ID = str(ObjectId()) # Can be HR or Admin
MOCK_SCHEDULER_EMAIL = "scheduler.hr@example.com"
MOCK_SCHEDULER_USERNAME = "schedulerhr"

async def override_get_current_active_user_scheduler() -> UserOut: # Corrected return type
    return UserOut(
        id=MOCK_SCHEDULER_USER_ID, 
        username=MOCK_SCHEDULER_USERNAME, 
        email=MOCK_SCHEDULER_EMAIL, 
        role="hr", # Or "admin", depending on who can schedule
        created_at=datetime.utcnow() # UserOut expects created_at
        # is_active is not directly in UserOut.
    )

@pytest.mark.asyncio
async def test_get_default_questions(client_interview: AsyncClient, test_db_client_interview: Any):
    # Assuming this endpoint is public or doesn't strictly need user context for this basic test
    # If it requires auth, dependency override would be needed here too.
    # For now, let's assume it's accessible.
    response = await client_interview.get("/default-questions")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    if data: # If list is not empty, check structure of the first item
        assert "text" in data[0]
        assert "category" in data[0]
        assert "difficulty" in data[0]

@pytest.mark.asyncio
async def test_schedule_interview(client_interview: AsyncClient, test_db_client_interview: Any):
    app.dependency_overrides[get_current_active_user] = override_get_current_active_user_scheduler

    # Mock a candidate_id that would exist or be valid in the context of scheduling
    mock_candidate_id = str(ObjectId())

    # Ensure the payload matches the InterviewCreate schema
    schedule_payload_data = {
        "candidate_id": mock_candidate_id,
        "job_title": "Senior Python Developer",
        "job_description": "Responsible for developing backend services.",
        "role": "Backend Developer", # This field might be used by the service to select question types
        "tech_stack": ["Python", "FastAPI", "PostgreSQL", "Docker"],
        "num_questions": 5,
        "scheduled_by_id": MOCK_SCHEDULER_USER_ID 
        # Add other fields if InterviewCreate expects them e.g. interview_type
    }
    # If InterviewCreate is directly usable as a Pydantic model for the payload:
    # schedule_payload = InterviewCreate(**schedule_payload_data)
    # response = await client_interview.post("/schedule", json=schedule_payload.model_dump())
    # Or if the endpoint expects a dict:
    response = await client_interview.post("/schedule", json=schedule_payload_data)
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert "id" in data # 'id' is the interview_id
    assert data["candidate_id"] == mock_candidate_id
    assert data["job_title"] == schedule_payload["job_title"]
    assert data["status"] == "scheduled" # Or "pending_questions" depending on backend logic
    assert len(data["questions"]) > 0 # Assuming questions are generated upon scheduling

    app.dependency_overrides = {} # Clear overrides
