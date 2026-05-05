from datetime import UTC, datetime

from pydantic import BaseModel, Field


class RetrainRequest(BaseModel):
    force: bool = False
    reason: str = Field(default="auto-drift-or-performance-trigger")


class RetrainResponse(BaseModel):
    triggered: bool
    promoted: bool
    reason: str
    model_version: str | None = None
    previous_version: str | None = None
    metrics: dict[str, float] = Field(default_factory=dict)
    current_metrics: dict[str, float] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))