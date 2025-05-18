import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import application components
from .core.config import settings
from .db.mongodb import mongodb # Import the singleton instance
from .api.routes import auth as auth_router # Import the auth router

# --- Logging Setup ---
logging.basicConfig(
    level=settings.LOG_LEVEL.upper(), # Use settings for log level
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# --- Application Lifespan (Simplified for now) ---
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Auth Service: Startup sequence initiated...")
    db_connected = False
    try:
        logger.info("Auth Service: Attempting to connect to MongoDB...")
        await mongodb.connect()
        db_connected = True
        logger.info("Auth Service: MongoDB connection successful.")
        # Seeding specific to auth service, if any, would go here
        # For example, creating a default admin user if not in testing mode
        if not settings.TESTING_MODE and settings.DEFAULT_ADMIN_EMAIL and settings.DEFAULT_ADMIN_PASSWORD and settings.DEFAULT_ADMIN_USERNAME:
            from .core.security import get_password_hash # Local import for lifespan
            db_instance = mongodb.get_db()
            existing_admin = await db_instance[settings.MONGODB_COLLECTION_USERS].find_one({"email": settings.DEFAULT_ADMIN_EMAIL})
            if not existing_admin:
                admin_user_doc = {
                    "username": settings.DEFAULT_ADMIN_USERNAME,
                    "email": settings.DEFAULT_ADMIN_EMAIL,
                    "hashed_password": get_password_hash(settings.DEFAULT_ADMIN_PASSWORD),
                    "role": "admin",
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
                await db_instance[settings.MONGODB_COLLECTION_USERS].insert_one(admin_user_doc)
                logger.info(f"Default admin user '{settings.DEFAULT_ADMIN_USERNAME}' created.")
            else:
                logger.info(f"Default admin user '{settings.DEFAULT_ADMIN_USERNAME}' already exists.")

        logger.info("Auth Service: Application startup complete.")
        yield # Application runs here

    except Exception as e:
        logger.critical(f"FATAL: Auth Service startup failed: {e}", exc_info=True)
    finally:
        logger.info("Auth Service: Application shutdown sequence initiated...")
        if db_connected:
            await mongodb.close()
            logger.info("Auth Service: MongoDB connection closed.")
        else:
            logger.warning("Auth Service: Skipping MongoDB close sequence as connection was not established.")
        logger.info("Auth Service: Application shutdown complete.")


# --- FastAPI App Initialization ---
app = FastAPI(
    title=settings.APP_NAME, # Use APP_NAME from settings
    description="API for authentication and user management.",
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# --- Middleware Setup (Simplified for now) ---
# Prepare a list of allowed origins
configured_origins = []
if settings.CORS_ALLOWED_ORIGINS:
    # This assumes settings.CORS_ALLOWED_ORIGINS is already a list due to pydantic validator
    # If it could still be a string here, further parsing might be needed, but validator should handle it.
    configured_origins.extend(settings.CORS_ALLOWED_ORIGINS)

# Ensure http://localhost:3000 is included if not already present from settings
if "http://localhost:3000" not in configured_origins:
    configured_origins.append("http://localhost:3000")

# Fallback if no origins are configured at all via settings
if not configured_origins:
    logger.warning("CORS_ALLOWED_ORIGINS was not set in environment/settings. Defaulting to allow http://localhost:3000 for development.")
    configured_origins = ["http://localhost:3000"] # Default for dev if nothing else is set

app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_origins, # Use the prepared list
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods
    allow_headers=["*"], # Allows all headers
)
logger.info(f"CORS middleware enabled. Allowed origins: {configured_origins}")

# --- API Router Inclusion (Placeholder) ---
app.include_router(auth_router.router, prefix="/api/v1", tags=["Authentication"]) # Using /api/v1 as base for all services
logger.info("Included Auth API router under /api/v1/auth.")


# --- Root Endpoint ---
@app.get("/", tags=["Root"])
async def read_root() -> dict[str, str]:
    return {"message": "Welcome to the LLM Interviewer - Auth Service"}

# Health check endpoint
@app.get("/health", tags=["Health Check"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
