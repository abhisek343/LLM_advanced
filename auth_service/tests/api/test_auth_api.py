import pytest
from httpx import AsyncClient
from typing import Dict, Any

# Assuming your UserCreate schema is in app.schemas.user
# For Pydantic V2, direct import from app.schemas.user is fine
from app.schemas.user import UserCreate 

# Test data (remains the same)
test_user_data = {
    "username": "testuser_api",
    "email": "testuser_api@example.com",
    "password": "testpassword123",
    "role": "candidate" 
}
test_user_login_form = { # For form-encoded login
    "username": test_user_data["email"], # Login with email
    "password": test_user_data["password"]
}

@pytest.mark.asyncio
async def test_register_user_success(client_auth: AsyncClient, test_db_client_auth: Any): # Changed client to client_auth
    """
    Tests successful user registration.
    Verifies status code, email, username, and presence of ID.
    Ensures password and hashed_password are not returned.
    """
    response = await client_auth.post("/api/v1/auth/register", json=test_user_data)
    assert response.status_code == 201, f"Expected 201, got {response.status_code}. Response: {response.text}"
    data = response.json()
    assert data["email"] == test_user_data["email"]
    assert data["username"] == test_user_data["username"]
    assert "id" in data
    # Password should not be returned
    assert "password" not in data 
    assert "hashed_password" not in data

@pytest.mark.asyncio
async def test_register_user_duplicate_email(client_auth: AsyncClient, test_db_client_auth: Any): # Changed client to client_auth
    """
    Tests registration with a duplicate email.
    Ensures a 400 Bad Request is returned with the correct detail message.
    """
    # First registration (should succeed)
    await client_auth.post("/api/v1/auth/register", json=test_user_data)
    
    # Second registration with same email (should fail)
    duplicate_email_data = test_user_data.copy()
    duplicate_email_data["username"] = "anotheruser_api" # Different username
    response = await client_auth.post("/api/v1/auth/register", json=duplicate_email_data)
    assert response.status_code == 400, f"Expected 400, got {response.status_code}. Response: {response.text}"
    assert "Email already registered" in response.json()["detail"]

@pytest.mark.asyncio
async def test_register_user_duplicate_username(client_auth: AsyncClient, test_db_client_auth: Any): # Changed client to client_auth
    """
    Tests registration with a duplicate username.
    Ensures a 400 Bad Request is returned with the correct detail message.
    """
    # First registration
    await client_auth.post("/api/v1/auth/register", json=test_user_data)

    # Second registration with same username
    duplicate_username_data = test_user_data.copy()
    duplicate_username_data["email"] = "another_api@example.com" # Different email
    response = await client_auth.post("/api/v1/auth/register", json=duplicate_username_data)
    assert response.status_code == 400, f"Expected 400, got {response.status_code}. Response: {response.text}"
    assert "Username already registered" in response.json()["detail"]

@pytest.mark.asyncio
async def test_login_for_access_token_success(client_auth: AsyncClient, test_db_client_auth: Any): # Changed client to client_auth
    """
    Tests successful user login.
    Verifies status code, presence of access_token, and correct token_type.
    """
    # Register user first
    await client_auth.post("/api/v1/auth/register", json=test_user_data)

    # Login with form data
    response = await client_auth.post(
        "/api/v1/auth/login",
        data=test_user_login_form # httpx handles form encoding from dict
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text}"
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_for_access_token_incorrect_password(client_auth: AsyncClient, test_db_client_auth: Any): # Changed client to client_auth
    """
    Tests login attempt with an incorrect password.
    Ensures a 401 Unauthorized is returned with the correct detail message.
    """
    await client_auth.post("/api/v1/auth/register", json=test_user_data)
    
    incorrect_login_data = test_user_login_form.copy()
    incorrect_login_data["password"] = "wrongpassword"
    
    response = await client_auth.post("/api/v1/auth/login", data=incorrect_login_data)
    assert response.status_code == 401, f"Expected 401, got {response.status_code}. Response: {response.text}" # Unauthorized
    # The detail message was "Incorrect email or password" in your previous logs, but FastAPI's default for OAuth2PasswordRequestForm might be different.
    # Let's check for a common part of the message or adapt if necessary.
    # The backend auth.py route returns: "Incorrect login credentials. Please provide a valid username or email ID and password."
    assert "Incorrect login credentials" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_for_access_token_user_not_found(client_auth: AsyncClient, test_db_client_auth: Any): # Changed client to client_auth
    """
    Tests login attempt for a non-existent user.
    Ensures a 401 Unauthorized is returned.
    """
    non_existent_user_login = {
        "username": "nouser@example.com",
        "password": "somepassword"
    }
    response = await client_auth.post("/api/v1/auth/login", data=non_existent_user_login)
    assert response.status_code == 401, f"Expected 401, got {response.status_code}. Response: {response.text}" # Unauthorized
    assert "Incorrect login credentials" in response.json()["detail"] # Generic message for security

@pytest.mark.asyncio
async def test_read_users_me_success(client_auth: AsyncClient, test_db_client_auth: Any): # Changed client to client_auth
    """
    Tests the /me endpoint for a successfully authenticated user.
    Verifies status code and correct user details (email, username, role).
    """
    # Register and login to get token
    await client_auth.post("/api/v1/auth/register", json=test_user_data)
    login_response = await client_auth.post("/api/v1/auth/login", data=test_user_login_form)
    token = login_response.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    response = await client_auth.get("/api/v1/auth/me", headers=headers)
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text}"
    data = response.json()
    assert data["email"] == test_user_data["email"]
    assert data["username"] == test_user_data["username"]
    assert data["role"] == test_user_data["role"]

@pytest.mark.asyncio
async def test_read_users_me_no_token(client_auth: AsyncClient, test_db_client_auth: Any): # Changed client to client_auth
    """
    Tests the /me endpoint without providing an authentication token.
    Ensures a 401 Unauthorized is returned.
    """
    response = await client_auth.get("/api/v1/auth/me")
    assert response.status_code == 401, f"Expected 401, got {response.status_code}. Response: {response.text}" # Unauthorized
    assert response.json()["detail"] == "Not authenticated"

@pytest.mark.asyncio
async def test_read_users_me_invalid_token(client_auth: AsyncClient, test_db_client_auth: Any): # Changed client to client_auth
    """
    Tests the /me endpoint with an invalid authentication token.
    Ensures a 401 Unauthorized is returned.
    """
    headers = {"Authorization": "Bearer invalidtoken"}
    response = await client_auth.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 401, f"Expected 401, got {response.status_code}. Response: {response.text}" # Unauthorized
    # The detail might vary based on JWT error, e.g., "Could not validate credentials" or "Not authenticated"
    assert "Could not validate credentials" in response.json()["detail"] or "Not authenticated" in response.json()["detail"]

# Example of a schema validation test (can be in a separate file like test_schemas.py)
def test_user_create_schema():
    """
    Tests the UserCreate Pydantic schema for valid and invalid data.
    This is a synchronous test as it only validates the schema model.
    """
    valid_data = {
        "username": "schematest", 
        "email": "schema@example.com", 
        "password": "validpassword", 
        "role": "candidate"
    }
    user = UserCreate(**valid_data)
    assert user.username == valid_data["username"]
    assert user.email == valid_data["email"]

    with pytest.raises(ValueError): # Or pydantic.ValidationError in Pydantic v1
        UserCreate(username="u", email="invalid", password="short", role="guest")
