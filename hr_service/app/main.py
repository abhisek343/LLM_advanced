import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import application components
from .core.config import settings
from .db.mongodb import mongodb
from .api.routes import hr as hr_router

# --- Logging Setup ---
logging.basicConfig(
    level=settings.LOG_LEVEL.upper(),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# --- Application Lifespan (Simplified) ---
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("HR Service: Startup sequence initiated...")
    db_connected = False
    try:
        logger.info("HR Service: Attempting to connect to MongoDB...")
        await mongodb.connect()
        db_connected = True
        logger.info("HR Service: MongoDB connection successful.")
        # Add any HR-service specific seeding if needed
        logger.info("HR Service: Application startup complete.")
        yield 
    except Exception as e:
        logger.critical(f"FATAL: HR Service startup failed: {e}", exc_info=True)
    finally:
        logger.info("HR Service: Application shutdown sequence initiated...")
        if db_connected:
            await mongodb.close()
            logger.info("HR Service: MongoDB connection closed.")
        else:
            logger.warning("HR Service: Skipping MongoDB close sequence as connection was not established.")
        logger.info("HR Service: Application shutdown complete.")

# --- FastAPI App Initialization ---
app = FastAPI(
    title=settings.APP_NAME,
    description="API for HR personnel operations and management.",
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# --- Middleware Setup ---
origins = []
if settings.CORS_ALLOWED_ORIGINS:
    if isinstance(settings.CORS_ALLOWED_ORIGINS, str):
        origins.extend([origin.strip() for origin in settings.CORS_ALLOWED_ORIGINS.split(',')])
    elif isinstance(settings.CORS_ALLOWED_ORIGINS, list):
        origins.extend(settings.CORS_ALLOWED_ORIGINS)

# Ensure development frontend origin is included
dev_frontend_origin = "http://localhost:3000"
if dev_frontend_origin not in origins:
    origins.append(dev_frontend_origin)

# Add other common dev origins if not present, for robustness
common_dev_origins = ["http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"]
for common_origin in common_dev_origins:
    if common_origin not in origins:
        origins.append(common_origin)

if not origins: # Fallback if CORS_ALLOWED_ORIGINS was empty and not set
    logger.warning("CORS_ALLOWED_ORIGINS was not set or was empty. Defaulting to allow common development origins.")
    origins = [dev_frontend_origin, "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(origins)),  # Use set to ensure unique origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info(f"CORS middleware enabled for HR Service. Allowed origins: {list(set(origins))}")

# --- API Router Inclusion (Placeholder) ---
app.include_router(hr_router.router, prefix="/api/v1", tags=["HR"]) # Using /api/v1 as base
logger.info("Included HR API router under /api/v1/hr.")

# --- Root Endpoint ---
@app.get("/", tags=["Root"])
async def read_root() -> dict[str, str]:
    return {"message": "Welcome to the LLM Interviewer - HR Service"}

# Health check endpoint
@app.get("/health", tags=["Health Check"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
