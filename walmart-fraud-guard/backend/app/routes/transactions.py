from decimal import Decimal

from fastapi import APIRouter, Body, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from redis.asyncio import Redis
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt_handler import get_current_user, get_current_user_optional, TokenPayload
from app.db.mongo import get_mongo_db
from app.db.postgres import FraudEvent, get_pg_session
from app.db.redis import get_redis
from app.models.alert import FraudResult
from app.models.transaction import TransactionInput
from app.routes.ws import manager
from app.services.explainer import explainer_service
from app.services.fraud_detector import FraudDetector, get_detector
from app.services.notifier import notifier_service
from app.services.redis_guard import check_duplicate, check_rate_limit

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("/analyze", response_model=FraudResult)
async def analyze_transaction(
    transaction: TransactionInput = Body(..., embed=False),
    detector: FraudDetector = Depends(get_detector),
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    pg_session: AsyncSession = Depends(get_pg_session),
    redis: Redis = Depends(get_redis),
    user: TokenPayload | None = Depends(get_current_user_optional),  # Optional JWT - allows unauthenticated in demo mode
) -> FraudResult:
    duplicate = await check_duplicate(redis, transaction.id)
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate transaction id detected: {transaction.id}",
        )

    rate_limit_result = await check_rate_limit(redis, transaction.user_id)
    result = detector.predict(transaction)
    result.rate_limit_count = rate_limit_result.count
    result.burst_pattern_detected = rate_limit_result.is_suspicious

    # Save raw transaction and score in MongoDB for flexible event history.
    await mongo_db.transactions.insert_one(
        {
            **transaction.model_dump(mode="json"),
            **result.model_dump(mode="json"),
        }
    )

    # Save structured analytics event in PostgreSQL.
    pg_event = FraudEvent(
        transaction_id=result.transaction_id,
        user_id=result.user_id,
        risk_score=Decimal(str(result.risk_score)),
        risk_level=result.risk_level,
        model_version=result.model_version,
        is_confirmed_fraud=None,
    )
    pg_session.add(pg_event)
    try:
        await pg_session.commit()
    except IntegrityError:
        await pg_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Transaction already exists in analytics store: {transaction.id}",
        )

    if result.risk_level in {"HIGH", "CRITICAL"}:
        result.explanation = await explainer_service.explain(transaction, result, detector)
        await notifier_service.fire(result, mongo_db)
        
        # Broadcast high-risk alerts to all connected WebSocket clients
        await manager.broadcast_fraud_alert({
            "type": "fraud_alert",
            "transaction_id": result.transaction_id,
            "account_id": result.user_id,
            "amount": float(transaction.amount),
            "risk_score": float(result.risk_score),
            "risk_level": result.risk_level,
            "explanation": result.explanation.model_dump() if result.explanation else None,
            "timestamp": result.timestamp,
        })

    return result
