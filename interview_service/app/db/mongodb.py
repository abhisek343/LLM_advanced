# LLM_interviewer/server/app/db/mongodb.py

import logging
from typing import Optional 

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from ..core.config import settings # Relative import

logger = logging.getLogger(__name__)

class MongoDB:
    client: Optional[AsyncIOMotorClient]
    db: Optional[AsyncIOMotorDatabase]

    def __init__(self):
        self.client = None
        self.db = None
        self.mongodb_url = settings.MONGODB_URL
        self.mongodb_db_name = settings.MONGODB_DB
        logger.info("MongoDB manager initialized for Interview Service.")

    async def connect(self):
        if self.client is not None:
            logger.warning("Interview Service: Connection attempt ignored, MongoDB client already initialized.")
            return

        if not self.mongodb_url or not self.mongodb_db_name:
             logger.error("Interview Service: MONGODB_URL or MONGODB_DB not configured in settings.")
             raise ValueError("MongoDB connection details missing in settings.")

        try:
            logger.info(f"Interview Service: Attempting to connect to MongoDB at {self.mongodb_url}...")
            connect_timeout = getattr(settings, 'MONGODB_CONNECT_TIMEOUT_MS', 5000)
            server_select_timeout = getattr(settings, 'MONGODB_SERVER_SELECTION_TIMEOUT_MS', 5000)

            self.client = AsyncIOMotorClient(
                self.mongodb_url,
                serverSelectionTimeoutMS=server_select_timeout,
                connectTimeoutMS=connect_timeout,
            )
            await self.client.admin.command('ping')
            self.db = self.client[self.mongodb_db_name]
            logger.info(f"Interview Service: MongoDB connection successful. Database '{self.mongodb_db_name}' is ready.")

        except Exception as e:
            logger.error(f"Interview Service: Failed to connect to MongoDB: {e}", exc_info=True)
            self.client = None
            self.db = None
            raise

    async def close(self):
        if self.client:
            self.client.close()
            self.client = None
            self.db = None
            logger.info("Interview Service: MongoDB connection closed.")
        else:
            logger.info("Interview Service: No active MongoDB connection to close.")

    def get_db(self) -> AsyncIOMotorDatabase:
        if self.db is None:
            logger.critical("Interview Service: get_db called but database is not connected/initialized.")
            raise RuntimeError("Database not connected. Ensure connect() was called and succeeded during application startup.")
        return self.db

mongodb = MongoDB()
