# LLM_interviewer/server/app/core/security.py

import logging
from datetime import datetime, timedelta, timezone # Use timezone-aware UTC
from typing import Optional, Annotated # Use Annotated for Depends clarity

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorClient # Added AsyncIOMotorClient
from pydantic import ValidationError # For catching Pydantic validation errors
from bson import ObjectId # Import ObjectId for checking _id

# Import schemas and configuration
from ..schemas.user import UserOut, TokenData # Relative import
from .config import settings # Relative import for same directory
from ..db.mongodb import mongodb # Relative import

# --- Configuration ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = logging.getLogger(__name__)

# Define the OAuth2 scheme instance
# tokenUrl should point to your login endpoint's path relative to the base URL
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login") # This will need to point to auth_service

# --- Database Dependency ---
async def get_db() -> AsyncIOMotorDatabase:
    """
    Dependency that returns the database instance from the mongodb singleton.
    This confirms the correct usage: depending on this function provides the DB handle.
    """
    try:
        # Get the database instance using the singleton's method
        db_instance = mongodb.get_db()
        # --- Add check if DB is available ---
        if db_instance is None:
            logger.critical("get_db dependency called, but mongodb.get_db() returned None!")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection not available (singleton returned None)."
            )
        # --- End check ---
        return db_instance
    except RuntimeError as e:
        logger.error(f"Database connection error in get_db dependency: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection not available (RuntimeError)."
        )
    except HTTPException:
        raise
    except Exception as e:
         logger.error(f"Unexpected error in get_db dependency: {e}", exc_info=True)
         raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error getting database connection."
         )


# Type alias for dependency injection clarity
CurrentDB = Annotated[AsyncIOMotorDatabase, Depends(get_db)]
Token = Annotated[str, Depends(oauth2_scheme)]

# --- Password Utilities ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# --- JWT Token Utilities ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

# --- Core User Fetching Dependency ---
async def get_current_user(token: Token, db: CurrentDB) -> UserOut:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    internal_server_exception = HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="An internal error occurred while validating the user.",
    )

    email: Optional[str] = None
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    except Exception:
        raise credentials_exception

    if email:
        try:
            user_doc = await db[settings.MONGODB_COLLECTION_USERS].find_one({"email": email})
            if user_doc is None:
                raise credentials_exception
            if "_id" not in user_doc or not isinstance(user_doc.get('_id'), ObjectId):
                raise internal_server_exception
            try:
                user = UserOut.model_validate(user_doc)
                return user
            except ValidationError:
                raise internal_server_exception
        except HTTPException:
            raise
        except Exception:
            raise internal_server_exception
    else:
        raise credentials_exception

CurrentUser = Annotated[UserOut, Depends(get_current_user)]

async def get_current_active_user(current_user: CurrentUser) -> UserOut:
    return current_user

async def verify_admin_user(current_user: CurrentUser) -> UserOut:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires administrator privileges."
        )
    return current_user

async def verify_hr_or_admin_user(current_user: CurrentUser) -> UserOut:
    if current_user.role not in ["hr", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires HR or administrator privileges."
        )
    return current_user

async def require_candidate(current_user: CurrentUser) -> UserOut: # Renamed to avoid conflict if used directly
    if current_user.role != "candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires candidate privileges."
        )
    return current_user
