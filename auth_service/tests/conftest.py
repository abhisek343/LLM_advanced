import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from typing import AsyncGenerator
from motor.motor_asyncio import AsyncIOMotorClient

from app.main import app
from app.core.config import settings
from app.db.mongodb import mongodb

_SERVICE_ORIGINAL_MONGODB_DB_NAME_IN_SETTINGS = settings.MONGODB_DB
_SERVICE_TEST_MONGODB_DB_NAME = f"{_SERVICE_ORIGINAL_MONGODB_DB_NAME_IN_SETTINGS}_auth_test"

@pytest_asyncio.fixture(scope="session", autouse=True)
async def manage_service_test_db_settings_auth():
    """
    Session-scoped, autouse fixture to manage database name settings for the auth_service.
    This modifies settings globally for the test session.
    """
    original_settings_db_name = settings.MONGODB_DB # Store original from settings object
    original_instance_mongodb_db_name = mongodb.mongodb_db_name # Store current state of singleton
    original_instance_mongodb_url = mongodb.mongodb_url

    settings.MONGODB_DB = _SERVICE_TEST_MONGODB_DB_NAME
    mongodb.mongodb_db_name = settings.MONGODB_DB # Update singleton for this session
    mongodb.mongodb_url = settings.MONGODB_URL # Ensure URL is also from settings

    yield

    settings.MONGODB_DB = original_settings_db_name # Restore original settings
    mongodb.mongodb_db_name = original_instance_mongodb_db_name # Restore singleton
    mongodb.mongodb_url = original_instance_mongodb_url

@pytest_asyncio.fixture(scope="function") # Changed scope to "function"
async def test_db_client_auth(manage_service_test_db_settings_auth) -> AsyncGenerator[AsyncIOMotorClient, None]:
    """
    Function-scoped fixture to establish and clean the test database for auth_service.
    Ensures mongodb.connect() is called within the test function's event loop.
    """
    if mongodb.client: # If a client exists from a previous test function or session, close it.
        await mongodb.close()

    # Connect the mongodb singleton. This will now happen for each test function,
    # using the event loop associated with that function by pytest-asyncio.
    await mongodb.connect() 
    
    if not mongodb.client:
        raise RuntimeError(f"Failed to establish test_db_client for auth_service ({mongodb.mongodb_db_name}).")

    db_for_cleanup = mongodb.client[mongodb.mongodb_db_name]
    
    collections = await db_for_cleanup.list_collection_names()
    for collection_name in collections:
        if not collection_name.startswith("system."):
            await db_for_cleanup[collection_name].delete_many({})
    
    yield mongodb.client # Provide the client

    await mongodb.close() # Close connection after each test function

@pytest_asyncio.fixture(scope="function")
async def client_auth(test_db_client_auth: AsyncIOMotorClient) -> AsyncGenerator[AsyncClient, None]:
    """
    Provides an HTTPX AsyncClient for making requests to the auth_service FastAPI app
    using in-process testing with ASGITransport.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver-auth") as ac:
        yield ac
