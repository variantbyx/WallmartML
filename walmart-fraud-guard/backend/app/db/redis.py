from collections.abc import AsyncGenerator

from redis.asyncio import Redis

from app.core.config import settings


_redis_client: Redis | None = None


async def init_redis() -> None:
    global _redis_client
    if _redis_client is None:
        _redis_client = Redis.from_url(settings.redis_url, decode_responses=True)


async def close_redis() -> None:
    global _redis_client
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None


async def get_redis() -> AsyncGenerator[Redis, None]:
    if _redis_client is None:
        await init_redis()
    assert _redis_client is not None
    yield _redis_client
