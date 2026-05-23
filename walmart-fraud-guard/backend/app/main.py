from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.mongo import close_mongo, init_mongo
from app.db.postgres import close_postgres, init_postgres
from app.db.redis import close_redis, init_redis
from app.routes.analytics import router as analytics_router
from app.routes.alerts import router as alerts_router
from app.routes.auth import router as auth_router
from app.routes.models import router as models_router
from app.routes.retraining import router as retraining_router
from app.routes.transactions import router as transactions_router
from app.routes.ws import router as ws_router
from app.scheduler import init_scheduler, shutdown_scheduler
from app.services.fraud_detector import get_detector


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_mongo()
    await init_postgres()
    await init_redis()
    get_detector()
    await init_scheduler()  # Start background scheduler
    yield
    await shutdown_scheduler()  # Stop scheduler on shutdown
    await close_redis()
    await close_postgres()
    await close_mongo()


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket routes (no prefix needed)
app.include_router(ws_router)

# API routes
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(transactions_router, prefix=settings.api_prefix)
app.include_router(analytics_router, prefix=settings.api_prefix)
app.include_router(models_router, prefix=settings.api_prefix)
app.include_router(retraining_router, prefix=settings.api_prefix)
app.include_router(alerts_router, prefix=settings.api_prefix)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name, "env": settings.app_env}
