from fastapi import APIRouter, Depends

from app.models.retraining import RetrainRequest, RetrainResponse
from app.services.retraining import retraining_service

router = APIRouter(prefix="/models", tags=["models"])


@router.post("/retrain", response_model=RetrainResponse)
async def retrain_model(payload: RetrainRequest) -> RetrainResponse:
    result = await retraining_service.retrain(force=payload.force, reason=payload.reason)
    return RetrainResponse(**result)