import pytest
from httpx import AsyncClient
from typing import Any, Dict
from fastapi import status
from app.main import app # The FastAPI app instance
from app.core.security import get_current_active_user # Assuming this is the dependency
from app.schemas.user import UserOut # Corrected import
from bson import ObjectId
from datetime import datetime

# Mock Admin user data
MOCK_ADMIN_USER_ID = str(ObjectId())
MOCK_ADMIN_EMAIL = "test.admin@example.com"
MOCK_ADMIN_USERNAME = "testadmin"

async def override_get_current_active_user_admin() -> UserOut: # Corrected return type
    return UserOut(
        id=MOCK_ADMIN_USER_ID, 
        username=MOCK_ADMIN_USERNAME, 
        email=MOCK_ADMIN_EMAIL, 
        role="admin",
        created_at=datetime.utcnow() # UserOut expects created_at
        # is_active is not directly in UserOut.
    )

@pytest.mark.asyncio
async def test_get_all_users(client_admin: AsyncClient, test_db_client_admin: Any):
    app.dependency_overrides[get_current_active_user] = override_get_current_active_user_admin
    
    response = await client_admin.get("/api/v1/admin/users") # Added prefix
    assert response.status_code == status.HTTP_200_OK
    assert isinstance(response.json(), list)
    # In a real scenario, you might create some users in the test_db_client_admin setup
    # and assert their presence here. For now, an empty list is a valid pass.
    # Example: if a default admin user is created by the app itself:
    # users = response.json()
    # assert any(user['username'] == MOCK_ADMIN_USERNAME for user in users)

    app.dependency_overrides = {} # Clear overrides

@pytest.mark.asyncio
async def test_get_system_stats(client_admin: AsyncClient, test_db_client_admin: Any):
    app.dependency_overrides[get_current_active_user] = override_get_current_active_user_admin
    
    response = await client_admin.get("/api/v1/admin/stats") # Added prefix
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "total_users" in data
    assert "total_hr_mapped" in data
    assert "total_candidates_assigned" in data
    # Add more assertions based on the actual structure of AdminStats schema

    app.dependency_overrides = {} # Clear overrides
