import pytest
from pydantic import ValidationError
from datetime import datetime

# Adjust import paths based on your project structure
from app.schemas.user import UserCreate, UserOut, Token, TokenData, PyObjectIdStr, UserRole
from bson import ObjectId

def test_py_object_id_str_valid():
    valid_oid_str = str(ObjectId())
    validated = PyObjectIdStr.validate(valid_oid_str, None)
    assert validated == valid_oid_str

    oid_obj = ObjectId()
    validated_from_obj = PyObjectIdStr.validate(oid_obj, None)
    assert validated_from_obj == str(oid_obj)

def test_py_object_id_str_invalid():
    with pytest.raises(ValueError, match="Not a valid ObjectId string"):
        PyObjectIdStr.validate("not_an_object_id", None)

def test_user_create_valid():
    data = {"username": "testuser", "email": "test@example.com", "password": "password123", "role": "candidate"}
    user = UserCreate(**data)
    assert user.username == data["username"]
    assert user.email == data["email"]
    assert user.password == data["password"]
    assert user.role == data["role"]

@pytest.mark.parametrize("invalid_data, expected_error_field", [
    ({"username": "tu", "email": "test@example.com", "password": "password123", "role": "candidate"}, "username"), # Too short username
    ({"username": "testuser", "email": "invalidemail", "password": "password123", "role": "candidate"}, "email"), # Invalid email
    ({"username": "testuser", "email": "test@example.com", "password": "short", "role": "candidate"}, "password"), # Too short password
    ({"username": "testuser", "email": "test@example.com", "password": "password123", "role": "invalidrole"}, "role"), # Invalid role
])
def test_user_create_invalid_data(invalid_data: dict, expected_error_field: str):
    with pytest.raises(ValidationError) as excinfo:
        UserCreate(**invalid_data)
    # Check if the error messages contain the field that was expected to cause an error
    assert any(expected_error_field in error["loc"] for error in excinfo.value.errors())


def test_user_out_schema():
    # Note: _id should be an ObjectId when coming from DB, PyObjectIdStr handles conversion
    oid = ObjectId()
    data_from_db = {
        "_id": oid, 
        "username": "testuser_out", 
        "email": "out@example.com", 
        "role": "hr",
        "created_at": datetime.utcnow(),
        "resume_path": "/path/to/resume.pdf"
    }
    user_out = UserOut.model_validate(data_from_db) # Pydantic v2 uses model_validate
    assert user_out.id == str(oid) # Check aliased 'id' field
    assert user_out.username == data_from_db["username"]
    assert user_out.email == data_from_db["email"]
    assert user_out.role == data_from_db["role"]
    assert user_out.created_at == data_from_db["created_at"]
    assert user_out.resume_path == data_from_db["resume_path"]

def test_token_schema():
    data = {"access_token": "somejwttoken", "token_type": "bearer"}
    token = Token(**data)
    assert token.access_token == data["access_token"]
    assert token.token_type == data["token_type"]

def test_token_data_schema():
    data = {"email": "user@example.com", "role": "admin"}
    token_data = TokenData(**data)
    assert token_data.email == data["email"]
    assert token_data.role == data["role"]

    # Test with optional fields missing
    data_email_only = {"email": "user@example.com"}
    token_data_email_only = TokenData(**data_email_only)
    assert token_data_email_only.email == data_email_only["email"]
    assert token_data_email_only.role is None
