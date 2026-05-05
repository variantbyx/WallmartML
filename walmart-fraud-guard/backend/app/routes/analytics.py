from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.mongo import get_mongo_db
from app.db.postgres import get_pg_session
from app.models.alert import AlertReviewRequest, AlertReviewResponse, DriftReport, FraudDashboardSummary
from app.services.drift_detector import drift_detector_service
from app.services.analytics import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=FraudDashboardSummary)
async def get_summary(
    window_hours: int = 24,
    pg_session: AsyncSession = Depends(get_pg_session),
) -> FraudDashboardSummary:
    return await analytics_service.build_summary(pg_session, window_hours=window_hours)


@router.post("/alerts/{transaction_id}/review", response_model=AlertReviewResponse)
async def review_alert(
    transaction_id: str,
    payload: AlertReviewRequest,
    pg_session: AsyncSession = Depends(get_pg_session),
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongo_db),
) -> AlertReviewResponse:
    updated_alert = await analytics_service.review_alert(
        pg_session,
        transaction_id=transaction_id,
        is_confirmed_fraud=payload.is_confirmed_fraud,
        reviewer_id=payload.reviewer_id,
    )
    if updated_alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction not found: {transaction_id}",
        )

    await mongo_db.alerts.update_one(
        {"transaction_id": transaction_id},
        {
            "$set": {
                "is_confirmed_fraud": payload.is_confirmed_fraud,
                "reviewer_id": payload.reviewer_id,
                "reviewed_at": updated_alert.reviewed_at,
            }
        },
    )

    return updated_alert


@router.get("/drift", response_model=DriftReport)
async def get_drift_report(
    window_hours: int = 24,
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongo_db),
) -> DriftReport:
    return await drift_detector_service.build_report(mongo_db, window_hours=window_hours)