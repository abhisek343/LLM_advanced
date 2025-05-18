import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport # Import ASGITransport
from typing import AsyncGenerator
from motor.motor_asyncio import AsyncIOMotorClient

from app.main import app # Your FastAPI application instance
from app.core.config import settings
from app.db.mongodb import mongodb

_SERVICE_ORIGINAL_MONGODB_DB_NAME_IN_SETTINGS = settings.MONGODB_DB
_SERVICE_TEST_MONGODB_DB_NAME = f"{_SERVICE_ORIGINAL_MONGODB_DB_NAME_IN_SETTINGS}_hr_test"

@pytest_asyncio.fixture(scope="session", autouse=True)
async def manage_service_test_db_settings_hr():
    global _SERVICE_ORIGINAL_MONGODB_DB_NAME_IN_SETTINGS
    
    original_instance_mongodb_url = mongodb.mongodb_url
    original_instance_mongodb_db_name = mongodb.mongodb_db_name

    settings.MONGODB_DB = _SERVICE_TEST_MONGODB_DB_NAME
    mongodb.mongodb_url = settings.MONGODB_URL
    mongodb.mongodb_db_name = settings.MONGODB_DB

    yield

    settings.MONGODB_DB = _SERVICE_ORIGINAL_MONGODB_DB_NAME_IN_SETTINGS
    mongodb.mongodb_url = original_instance_mongodb_url
    mongodb.mongodb_db_name = original_instance_mongodb_db_name

@pytest_asyncio.fixture(scope="session")
async def test_db_client_hr(manage_service_test_db_settings_hr) -> AsyncGenerator[AsyncIOMotorClient, None]:
    if mongodb.client:
        await mongodb.close()
    await mongodb.connect()
    if not mongodb.client:
        raise RuntimeError(f"Failed to establish test_db_client for hr_service ({settings.MONGODB_DB}).")
        
    db_for_cleanup = mongodb.client[mongodb.mongodb_db_name]
    collections = await db_for_cleanup.list_collection_names()
    for col_name in collections:
        if not col_name.startswith("system."):
            await db_for_cleanup[col_name].delete_many({})
    yield mongodb.client
    await mongodb.close()

@pytest_asyncio.fixture(scope="function")
async def client_hr(test_db_client_hr: AsyncIOMotorClient) -> AsyncGenerator[AsyncClient, None]:
    # Corrected line: Use ASGITransport for in-process testing with AsyncClient
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver-hr") as ac:
        yield ac
