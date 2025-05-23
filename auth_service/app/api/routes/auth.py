# LLM_interviewer/server/app/api/routes/auth.py

from datetime import timedelta, datetime, timezone # Added timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_active_user
)
# Ensure correct schemas are imported
# Import specific status literals if needed for validation/logic, otherwise role check is sufficient
from app.schemas.user import UserCreate, UserOut, Token, TokenData, UserRole, PasswordResetRequest, PasswordResetConfirm, UserChangePassword # Added UserChangePassword
from motor.motor_asyncio import AsyncIOMotorDatabase # Added import
from app.db.mongodb import mongodb # Import the mongodb instance
from app.core.config import settings # Import settings instance directly
import logging
import secrets # For generating secure tokens
from pydantic import EmailStr # For type hinting email

# Logger setup
logger = logging.getLogger(__name__)

# Router setup
router = APIRouter(prefix="/auth", tags=["Authentication"])


# --- Register Endpoint ---
@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    """
    Registers a new user (candidate, hr, or admin).
    Sets the initial status based on the role.
    - Candidates start as 'pending_resume'.
    - HR users start as 'pending_profile'.
    - Admins have no specific status field.
    """
    # Pydantic validation handles basic role check via UserRole Literal in UserCreate

    try:
        db = mongodb.get_db()

        # --- Username Check ---
        existing_user_username = await db[settings.MONGODB_COLLECTION_USERS].find_one({"username": user.username})
        if existing_user_username:
             logger.warning(f"Registration attempt failed: Username '{user.username}' already exists.")
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered."
             )
        # --- End Username Check ---

        # --- Email Check ---
        existing_user_email = await db[settings.MONGODB_COLLECTION_USERS].find_one({"email": user.email})
        if existing_user_email:
            logger.warning(f"Registration attempt failed: Email '{user.email}' already exists.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered."
            )
        # --- End Email Check ---

        # Create new user document
        hashed_password = get_password_hash(user.password)
        user_doc = user.model_dump(exclude={"password"}) # Excludes password, includes role, email, username
        user_doc["hashed_password"] = hashed_password
        user_doc["created_at"] = datetime.now(timezone.utc) # Use timezone-aware
        user_doc["updated_at"] = user_doc["created_at"] # Initialize updated_at

        # --- Set initial status based on role ---
        if user.role == "candidate":
            user_doc["mapping_status"] = "pending_resume"
            # Other candidate fields like assigned_hr_id default to None via model
        elif user.role == "hr":
            user_doc["hr_status"] = "pending_profile"
            # Other HR fields like admin_manager_id, years_of_experience default to None via model
        # No specific status field needed for admin role based on current model
        # --- End Set Initial Status ---

        # Ensure other Optional fields default correctly (Pydantic model handles this)
        # user_doc.setdefault("resume_path", None) # Model default is None
        # user_doc.setdefault("resume_text", None) # Model default is None

        # Insert user into database
        result = await db[settings.MONGODB_COLLECTION_USERS].insert_one(user_doc)
        created_user_doc = await db[settings.MONGODB_COLLECTION_USERS].find_one({"_id": result.inserted_id})

        if not created_user_doc:
            logger.error(f"Failed to retrieve created user after insert for email: {user.email}")
            raise HTTPException(status_code=500, detail="Failed to create user account.")

        logger.info(f"User '{user.username}' ({user.email}) registered successfully as '{user.role}'. Initial status set.")
        # Use model_validate for Pydantic V2 validation
        # UserOut schema doesn't include status fields by default, which is fine here.
        return UserOut.model_validate(created_user_doc)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during user registration for {user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during registration."
        )


# --- Login Endpoint ---
# No changes needed based on current requirements
@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Logs in a user using email OR username and returns an access token."""
    try:
        db = mongodb.get_db()
        identifier = form_data.username
        logger.info(f"Login attempt with identifier: {identifier}")

        user_from_db = await db[settings.MONGODB_COLLECTION_USERS].find_one({
            "$or": [
                {"email": identifier},
                {"username": identifier}
            ]
        })

        if user_from_db:
             logger.info(f"User found in DB for identifier '{identifier}'. User ID: {user_from_db.get('_id')}")
             password_correct = verify_password(form_data.password, user_from_db.get("hashed_password", ""))
             logger.info(f"Password verification result for identifier '{identifier}': {password_correct}")
             if not password_correct:
                 logger.warning(f"Password verification failed for identifier: {identifier}")
        else:
             logger.warning(f"User NOT found in DB for identifier: {identifier}")

        if not user_from_db or not verify_password(form_data.password, user_from_db.get("hashed_password", "")):
            logger.warning(f"Login attempt failed for identifier: {identifier} (Final Check: User not found or incorrect password)")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect login credentials. Please provide a valid username or email ID and password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_email_for_token = user_from_db.get("email")
        if not user_email_for_token:
             logger.error(f"User document found for identifier '{identifier}' is missing the 'email' field. Cannot generate token.")
             raise HTTPException(
                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                 detail="User data integrity issue. Cannot complete login."
             )

        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={
                "sub": user_email_for_token,
                "role": user_from_db.get("role"),
                },
            expires_delta=access_token_expires
        )

        logger.info(f"Successful login for user identified by: {identifier} (Email: {user_email_for_token})")
        return {"access_token": access_token, "token_type": "bearer"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login for identifier {form_data.username}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during login."
        )


# --- Get Current User Endpoint ---
# No changes needed
@router.get("/me", response_model=UserOut)
async def read_users_me(current_user: UserOut = Depends(get_current_active_user)):
    """
    Returns the details of the currently authenticated user.
    """
    logger.info(f"Fetching profile for current user: {current_user.username}")
    return current_user

# --- Change Password Endpoint (for logged-in user) ---
@router.put("/me/password", status_code=status.HTTP_200_OK)
async def change_current_user_password(
    payload: UserChangePassword,
    current_user: UserOut = Depends(get_current_active_user), # Changed to UserOut
    db_client: AsyncIOMotorDatabase = Depends(mongodb.get_db) # Corrected type hint
):
    """
    Allows the currently authenticated user to change their password.
    """
    logger.info(f"User {current_user.email} attempting to change their password.")

    # Verify current password
    if not verify_password(payload.current_password, current_user.hashed_password):
        logger.warning(f"Password change attempt failed for {current_user.email}: Incorrect current password.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password."
        )

    # Hash the new password
    new_hashed_password = get_password_hash(payload.new_password)

    # Update the password in the database
    try:
        result = await db_client[settings.MONGODB_COLLECTION_USERS].update_one(
            {"_id": current_user.id},
            {"$set": {"hashed_password": new_hashed_password, "updated_at": datetime.now(timezone.utc)}}
        )
        if result.modified_count == 0:
            logger.error(f"Failed to update password for user {current_user.email} in DB, though current password was correct.")
            # This case is unlikely if the user was fetched correctly and password verified.
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not update password."
            )
        logger.info(f"Password successfully changed for user {current_user.email}.")
        return {"message": "Password updated successfully."}
    except Exception as e:
        logger.error(f"Error updating password in DB for {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating your password."
        )

# --- Password Reset Request Endpoint ---
@router.post("/password-reset/request", status_code=status.HTTP_200_OK)
async def request_password_reset(payload: PasswordResetRequest):
    """
    Initiates a password reset request for a user by their email.
    Generates a reset token and (conceptually) sends it to the user.
    """
    try:
        db = mongodb.get_db()
        user = await db[settings.MONGODB_COLLECTION_USERS].find_one({"email": payload.email})

        if not user:
            # Do not reveal if the email exists or not for security reasons
            logger.info(f"Password reset request for non-existent or unconfirmed email: {payload.email}")
            return {"message": "If an account with that email exists, a password reset link has been sent."}

        # Generate a secure, URL-safe token
        reset_token = secrets.token_urlsafe(32)
        # Store the token and its expiry in the user's document or a separate collection
        # For simplicity, adding to user document here. Consider a separate collection for robustness.
        token_expiry = datetime.now(timezone.utc) + timedelta(hours=settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS) # Assuming PASSWORD_RESET_TOKEN_EXPIRE_HOURS is in settings

        await db[settings.MONGODB_COLLECTION_USERS].update_one(
            {"email": payload.email},
            {"$set": {"password_reset_token": reset_token, "password_reset_token_expires_at": token_expiry}}
        )

        # In a real application, you would email this token to the user
        # For this example, we'll log it (NEVER do this in production)
        logger.info(f"Password reset token generated for {payload.email}. Token: {reset_token}")
        # Actual email sending logic would go here.

        return {"message": "If an account with that email exists, a password reset link has been sent."}

    except Exception as e:
        logger.error(f"Error during password reset request for {payload.email}: {e}", exc_info=True)
        # Generic error to avoid leaking information
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your request."
        )

# --- Password Reset Confirm Endpoint ---
@router.post("/password-reset/confirm", status_code=status.HTTP_200_OK)
async def confirm_password_reset(payload: PasswordResetConfirm):
    """
    Resets the user's password using a valid reset token.
    """
    try:
        db = mongodb.get_db()
        user = await db[settings.MONGODB_COLLECTION_USERS].find_one({
            "password_reset_token": payload.token,
            "password_reset_token_expires_at": {"$gt": datetime.now(timezone.utc)}
        })

        if not user:
            logger.warning(f"Invalid or expired password reset token used: {payload.token}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset token."
            )

        hashed_password = get_password_hash(payload.new_password)
        await db[settings.MONGODB_COLLECTION_USERS].update_one(
            {"_id": user["_id"]},
            {"$set": {"hashed_password": hashed_password, "updated_at": datetime.now(timezone.utc)},
             "$unset": {"password_reset_token": "", "password_reset_token_expires_at": ""}} # Remove token fields
        )

        logger.info(f"Password successfully reset for user ID: {user['_id']}")
        return {"message": "Password has been reset successfully."}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during password reset confirmation for token {payload.token}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while resetting your password."
        )
