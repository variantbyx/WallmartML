from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


class TransactionInput(BaseModel):
    id: str = Field(..., description="Unique transaction id")
    user_id: str
    amount: float = Field(..., gt=0)
    currency: str = "USD"
    merchant_id: str | None = None
    account_age_days: int = 0
    total_orders: int = 0
    total_returns: int = 0
    avg_order_value: float = 0
    avg_return_value: float = 0
    transaction_timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    metadata: dict[str, Any] = Field(default_factory=dict)
