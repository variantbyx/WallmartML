from collections.abc import AsyncGenerator

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings


_mongo_client: AsyncIOMotorClient | None = None


async def init_mongo() -> None:
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = AsyncIOMotorClient(settings.mongo_uri)


async def close_mongo() -> None:
    global _mongo_client
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None


async def get_mongo_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    if _mongo_client is None:
        await init_mongo()
    assert _mongo_client is not None
    yield _mongo_client[settings.mongo_db_name]
