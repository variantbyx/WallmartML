from fastapi import APIRouter

from app.models.registry import ModelRegistryStatus
from app.services.model_registry import model_registry_service

router = APIRouter(prefix="/models", tags=["models"])


@router.get("/status", response_model=ModelRegistryStatus)
async def get_model_status() -> ModelRegistryStatus:
    return ModelRegistryStatus(**model_registry_service.get_status())