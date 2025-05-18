import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import application components
from .core.config import settings
from .db.mongodb import mongodb 
from .api.routes import candidates as candidate_router 

# --- Logging Setup ---
logging.basicConfig(
    level=settings.LOG_LEVEL.upper(),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# --- Application Lifespan (Simplified) ---
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Candidate Service: Startup sequence initiated...")
    db_connected = False
    try:
        logger.info("Candidate Service: Attempting to connect to MongoDB...")
        await mongodb.connect()
        db_connected = True
        logger.info("Candidate Service: MongoDB connection successful.")
        # Add any candidate-service specific seeding if needed
        logger.info("Candidate Service: Application startup complete.")
        yield 
    except Exception as e:
        logger.critical(f"FATAL: Candidate Service startup failed: {e}", exc_info=True)
    finally:
        logger.info("Candidate Service: Application shutdown sequence initiated...")
        if db_connected:
            await mongodb.close()
            logger.info("Candidate Service: MongoDB connection closed.")
        else:
            logger.warning("Candidate Service: Skipping MongoDB close sequence as connection was not established.")
        logger.info("Candidate Service: Application shutdown complete.")

# --- FastAPI App Initialization ---
app = FastAPI(
    title=settings.APP_NAME,
    description="API for candidate management and operations.",
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# --- Middleware Setup (Simplified) ---
# Prepare a list of allowed origins
configured_origins = []
if settings.CORS_ALLOWED_ORIGINS:
    # This assumes settings.CORS_ALLOWED_ORIGINS is already a list due to pydantic validator
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
logger.info(f"CORS middleware enabled for Candidate Service. Allowed origins: {configured_origins}")

# --- API Router Inclusion (Placeholder) ---
app.include_router(candidate_router.router, prefix="/api/v1", tags=["Candidates"]) # Using /api/v1 as base
logger.info("Included Candidate API router under /api/v1/candidate.")

# --- Root Endpoint ---
@app.get("/", tags=["Root"])
async def read_root() -> dict[str, str]:
    return {"message": "Welcome to the LLM Interviewer - Candidate Service"}

# Health check endpoint
@app.get("/health", tags=["Health Check"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
