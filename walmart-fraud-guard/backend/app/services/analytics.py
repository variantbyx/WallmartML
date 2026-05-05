from datetime import UTC, datetime, timedelta

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.postgres import FraudEvent
from app.models.alert import AlertReviewResponse, FraudDashboardSummary


class AnalyticsService:
    async def build_summary(self, session: AsyncSession, window_hours: int = 24) -> FraudDashboardSummary:
        end_at = datetime.now(UTC)
        start_at = end_at - timedelta(hours=window_hours)

        base_filter = FraudEvent.created_at >= start_at

        counts_stmt = select(
            func.count(FraudEvent.id),
            func.coalesce(func.sum(case((FraudEvent.risk_level == "HIGH", 1), else_=0)), 0),
            func.coalesce(func.sum(case((FraudEvent.risk_level == "CRITICAL", 1), else_=0)), 0),
            func.coalesce(func.sum(case((FraudEvent.is_confirmed_fraud.is_not(None), 1), else_=0)), 0),
            func.coalesce(func.sum(case((FraudEvent.is_confirmed_fraud.is_(True), 1), else_=0)), 0),
        ).where(base_filter)

        distribution_stmt = select(
            FraudEvent.risk_level,
            func.count(FraudEvent.id),
        ).where(base_filter).group_by(FraudEvent.risk_level)

        latest_version_stmt = select(FraudEvent.model_version).order_by(FraudEvent.created_at.desc()).limit(1)

        counts_result = await session.execute(counts_stmt)
        total_transactions, high_risk_alerts, critical_alerts, reviewed_alerts, confirmed_frauds = counts_result.one()

        distribution_result = await session.execute(distribution_stmt)
        risk_distribution = {level: int(count) for level, count in distribution_result.all()}

        latest_version_result = await session.execute(latest_version_stmt)
        latest_model_version = latest_version_result.scalar_one_or_none() or settings.model_version

        total_transactions = int(total_transactions)
        reviewed_alerts = int(reviewed_alerts)
        confirmed_frauds = int(confirmed_frauds)
        false_positive_count = max(reviewed_alerts - confirmed_frauds, 0)
        false_positive_rate = float(false_positive_count / reviewed_alerts) if reviewed_alerts else 0.0
        fraud_rate = float(confirmed_frauds / reviewed_alerts) if reviewed_alerts else 0.0

        return FraudDashboardSummary(
            window_hours=window_hours,
            start_at=start_at,
            end_at=end_at,
            total_transactions=total_transactions,
            total_alerts=total_transactions,
            high_risk_alerts=int(high_risk_alerts),
            critical_alerts=int(critical_alerts),
            reviewed_alerts=reviewed_alerts,
            confirmed_frauds=confirmed_frauds,
            false_positive_count=false_positive_count,
            false_positive_rate=round(false_positive_rate, 4),
            fraud_rate=round(fraud_rate, 4),
            risk_distribution=risk_distribution,
            latest_model_version=latest_model_version,
        )

    async def review_alert(
        self,
        session: AsyncSession,
        transaction_id: str,
        is_confirmed_fraud: bool,
        reviewer_id: str,
    ) -> AlertReviewResponse | None:
        stmt = select(FraudEvent).where(FraudEvent.transaction_id == transaction_id)
        result = await session.execute(stmt)
        fraud_event = result.scalar_one_or_none()

        if fraud_event is None:
            return None

        reviewed_at = datetime.now(UTC)
        fraud_event.is_confirmed_fraud = is_confirmed_fraud
        fraud_event.reviewer_id = reviewer_id
        fraud_event.reviewed_at = reviewed_at
        await session.commit()
        await session.refresh(fraud_event)

        return AlertReviewResponse(
            transaction_id=fraud_event.transaction_id,
            user_id=fraud_event.user_id,
            risk_level=fraud_event.risk_level,
            risk_score=float(fraud_event.risk_score),
            is_confirmed_fraud=is_confirmed_fraud,
            reviewer_id=reviewer_id,
            reviewed_at=reviewed_at,
        )


analytics_service = AnalyticsService()