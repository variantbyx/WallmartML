from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field


class RateLimitResult(BaseModel):
    count: int
    is_suspicious: bool
    window_seconds: int


class FraudResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    transaction_id: str
    user_id: str
    risk_score: float = Field(..., ge=0, le=1)
    is_fraud: bool
    risk_level: str
    model_version: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    explanation: str | None = None
    feature_importance: dict[str, float] = Field(default_factory=dict)
    top_contributing_features: list[str] = Field(default_factory=list)
    rate_limit_count: int = 0
    burst_pattern_detected: bool = False


class AlertPayload(BaseModel):
    transaction_id: str
    user_id: str
    risk_level: str
    risk_score: float
    explanation: str | None = None
    is_confirmed_fraud: bool | None = None
    reviewer_id: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class AlertReviewRequest(BaseModel):
    is_confirmed_fraud: bool
    reviewer_id: str = Field(..., min_length=1)


class AlertReviewResponse(BaseModel):
    transaction_id: str
    user_id: str
    risk_level: str
    risk_score: float
    is_confirmed_fraud: bool
    reviewer_id: str
    reviewed_at: datetime


class FraudDashboardSummary(BaseModel):
    window_hours: int
    start_at: datetime
    end_at: datetime
    total_transactions: int
    total_alerts: int
    high_risk_alerts: int
    critical_alerts: int
    reviewed_alerts: int
    confirmed_frauds: int
    false_positive_count: int
    false_positive_rate: float
    fraud_rate: float
    risk_distribution: dict[str, int]
    latest_model_version: str | None = None
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class DriftFeatureStat(BaseModel):
    feature: str
    reference_mean: float
    current_mean: float
    reference_std: float
    z_score: float


class DriftReport(BaseModel):
    window_hours: int
    start_at: datetime
    end_at: datetime
    sample_size: int
    drifted_feature_count: int
    has_drift: bool
    severity: str
    drifted_features: list[DriftFeatureStat] = Field(default_factory=list)
    retrain_recommended: bool = False
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
