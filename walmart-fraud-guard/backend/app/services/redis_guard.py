from redis.asyncio import Redis

from app.core.config import settings
from app.models.alert import RateLimitResult


async def check_duplicate(redis: Redis, transaction_id: str) -> bool:
    key = f"txn:{transaction_id}"
    exists = await redis.exists(key)
    if not exists:
        await redis.setex(key, settings.duplicate_ttl_seconds, "processed")
    return bool(exists)


async def check_rate_limit(redis: Redis, user_id: str) -> RateLimitResult:
    key = f"rate:{user_id}"
    count = int(await redis.incr(key))
    if count == 1:
        await redis.expire(key, settings.rate_limit_window_seconds)

    return RateLimitResult(
        count=count,
        is_suspicious=count > settings.rate_limit_max_requests,
        window_seconds=settings.rate_limit_window_seconds,
    )
