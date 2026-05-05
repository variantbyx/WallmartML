from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np

from app.core.config import settings
from app.models.alert import FraudResult
from app.models.transaction import TransactionInput


class FraudDetector:
    def __init__(self) -> None:
        model_path = Path(settings.model_path)
        scaler_path = Path(settings.scaler_path)
        if not model_path.exists():
            raise FileNotFoundError(f"Model not found at {model_path}")
        if not scaler_path.exists():
            raise FileNotFoundError(f"Scaler not found at {scaler_path}")

        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        self.threshold = settings.model_threshold
        self.model_version = settings.model_version

    def predict(self, transaction: TransactionInput) -> FraudResult:
        features = self.extract_features(transaction)
        scaled = self.scaler.transform([features])

        if hasattr(self.model, "predict_proba"):
            proba = float(self.model.predict_proba(scaled)[0][1])
        else:
            # Fallback for models without predict_proba.
            proba = float(np.clip(self.model.predict(scaled)[0], 0, 1))

        return FraudResult(
            transaction_id=transaction.id,
            user_id=transaction.user_id,
            risk_score=round(proba, 4),
            is_fraud=proba >= self.threshold,
            risk_level=self._get_risk_level(proba),
            model_version=self.model_version,
            timestamp=datetime.now(UTC),
        )

    def extract_features(self, transaction: TransactionInput) -> list[float]:
        ts = transaction.transaction_timestamp
        hour = ts.hour
        is_night = 1 if hour <= 5 or hour >= 23 else 0
        return_ratio = (
            transaction.total_returns / transaction.total_orders
            if transaction.total_orders > 0
            else 0.0
        )
        arv_aov_ratio = (
            transaction.avg_return_value / transaction.avg_order_value
            if transaction.avg_order_value > 0
            else 0.0
        )
        return [
            float(transaction.amount),
            float(transaction.account_age_days),
            float(transaction.total_orders),
            float(transaction.total_returns),
            float(transaction.avg_order_value),
            float(transaction.avg_return_value),
            float(return_ratio),
            float(arv_aov_ratio),
            float(hour),
            float(is_night),
        ]

    def _get_risk_level(self, score: float) -> str:
        if score >= 0.90:
            return "CRITICAL"
        if score >= 0.75:
            return "HIGH"
        if score >= 0.50:
            return "MEDIUM"
        return "LOW"


@lru_cache
def get_detector() -> FraudDetector:
    return FraudDetector()
