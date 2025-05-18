import pytest
from jose import jwt
from datetime import timedelta

# Adjust import paths based on your project structure
from app.core.security import create_access_token, verify_password, get_password_hash
from app.core.config import settings

def test_password_hashing_and_verification():
    password = "testpassword123"
    hashed_password = get_password_hash(password)
    assert hashed_password != password
    assert verify_password(password, hashed_password) is True
    assert verify_password("wrongpassword", hashed_password) is False

def test_create_access_token():
    data = {"sub": "testuser@example.com", "role": "candidate"}
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(data, expires_delta=expires_delta)
    assert isinstance(token, str)

    # Decode the token to check its contents (optional, but good for verification)
    payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert payload["sub"] == "testuser@example.com"
    assert payload["role"] == "candidate"
    assert "exp" in payload

def test_create_access_token_no_expiry():
    data = {"sub": "testuser_no_expiry@example.com"}
    # Test without explicit expires_delta, should use default
    token_default_expiry = create_access_token(data) 
    payload_default = jwt.decode(token_default_expiry, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert "exp" in payload_default

    # Test with expires_delta=None, should also use a default or raise error if not handled
    # Depending on implementation, create_access_token might enforce an expiry
    # For this example, let's assume it defaults if None is passed for expires_delta
    token_none_expiry = create_access_token(data, expires_delta=None)
    payload_none = jwt.decode(token_none_expiry, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert "exp" in payload_none

@pytest.mark.parametrize("invalid_password", ["", "short", " " * 10])
def test_verify_password_invalid_inputs(invalid_password):
    hashed_password = get_password_hash("validpassword")
    assert verify_password(invalid_password, hashed_password) is False

def test_get_password_hash_consistency():
    password = "consistent_password"
    hash1 = get_password_hash(password)
    hash2 = get_password_hash(password)
    # Hashes should be different due to salting, but verify_password should work for both
    assert hash1 != hash2 
    assert verify_password(password, hash1)
    assert verify_password(password, hash2)
