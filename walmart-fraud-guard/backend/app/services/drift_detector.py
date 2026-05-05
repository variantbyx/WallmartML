from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.models.alert import DriftFeatureStat, DriftReport


class DriftDetectorService:
    def __init__(self) -> None:
        self.feature_names = [
            "amount",
            "account_age_days",
            "total_orders",
            "total_returns",
            "avg_order_value",
            "avg_return_value",
            "return_ratio",
            "arv_aov_ratio",
            "hour",
            "is_night",
        ]
        self.reference_stats = self._load_reference_stats()

    async def build_report(self, db: AsyncIOMotorDatabase, window_hours: int | None = None) -> DriftReport:
        hours = window_hours or settings.drift_window_hours
        end_at = datetime.now(UTC)
        start_at = end_at - timedelta(hours=hours)

        cursor = db.transactions.find(
            {"timestamp": {"$gte": start_at.isoformat()}},
            {"_id": 0},
        )
        recent_rows = await cursor.to_list(length=5000)
        recent_frame = pd.DataFrame(recent_rows)

        if recent_frame.empty:
            return DriftReport(
                window_hours=hours,
                start_at=start_at,
                end_at=end_at,
                sample_size=0,
                drifted_feature_count=0,
                has_drift=False,
                severity="LOW",
                drifted_features=[],
                retrain_recommended=False,
            )

        feature_frame = self._prepare_feature_frame(recent_frame)
        drifted_features = self._detect_drift(feature_frame)
        drifted_count = len(drifted_features)
        has_drift = drifted_count > 0
        severity = "HIGH" if drifted_count >= 3 else "MEDIUM" if drifted_count > 0 else "LOW"
        retrain_recommended = drifted_count >= 3

        return DriftReport(
            window_hours=hours,
            start_at=start_at,
            end_at=end_at,
            sample_size=int(len(feature_frame)),
            drifted_feature_count=drifted_count,
            has_drift=has_drift,
            severity=severity,
            drifted_features=drifted_features,
            retrain_recommended=retrain_recommended,
        )

    def _load_reference_stats(self) -> dict[str, dict[str, float]]:
        reference_path = Path(settings.drift_reference_data_path)
        if not reference_path.exists():
            return {}

        frame = pd.read_csv(reference_path)
        frame = self._prepare_feature_frame(frame)

        stats: dict[str, dict[str, float]] = {}
        for feature in self.feature_names:
            series = pd.to_numeric(frame.get(feature, pd.Series(dtype=float)), errors="coerce").dropna()
            if series.empty:
                continue

            stats[feature] = {
                "mean": float(series.mean()),
                "std": float(series.std(ddof=0) or 0.0),
            }

        return stats

    def _prepare_feature_frame(self, frame: pd.DataFrame) -> pd.DataFrame:
        result = frame.copy()

        for feature in ["amount", "account_age_days", "total_orders", "total_returns", "avg_order_value", "avg_return_value"]:
            if feature not in result.columns:
                result[feature] = 0

        if "timestamp" in result.columns:
            result["hour"] = pd.to_datetime(result["timestamp"], errors="coerce").dt.hour.fillna(12)
        elif "transaction_timestamp" in result.columns:
            result["hour"] = pd.to_datetime(result["transaction_timestamp"], errors="coerce").dt.hour.fillna(12)
        elif "hour" not in result.columns:
            result["hour"] = 12

        if "is_night" not in result.columns:
            result["is_night"] = result["hour"].apply(lambda value: 1 if int(value) <= 5 or int(value) >= 23 else 0)

        if "return_ratio" not in result.columns:
            total_orders = pd.to_numeric(result["total_orders"], errors="coerce").fillna(0)
            total_returns = pd.to_numeric(result["total_returns"], errors="coerce").fillna(0)
            result["return_ratio"] = np.where(total_orders > 0, total_returns / total_orders.replace(0, 1), 0)

        if "arv_aov_ratio" not in result.columns:
            avg_order_value = pd.to_numeric(result["avg_order_value"], errors="coerce").fillna(0)
            avg_return_value = pd.to_numeric(result["avg_return_value"], errors="coerce").fillna(0)
            result["arv_aov_ratio"] = np.where(avg_order_value > 0, avg_return_value / avg_order_value, 0)

        for feature in self.feature_names:
            if feature not in result.columns:
                result[feature] = 0

        return result[self.feature_names].apply(pd.to_numeric, errors="coerce").fillna(0)

    def _detect_drift(self, recent_frame: pd.DataFrame) -> list[DriftFeatureStat]:
        drifted: list[DriftFeatureStat] = []

        for feature, ref_stats in self.reference_stats.items():
            if feature not in recent_frame.columns:
                continue

            current_series = pd.to_numeric(recent_frame[feature], errors="coerce").dropna()
            if current_series.empty:
                continue

            reference_mean = ref_stats["mean"]
            reference_std = ref_stats["std"]
            current_mean = float(current_series.mean())
            z_score = abs(current_mean - reference_mean) / (reference_std + 1e-8)

            if z_score > settings.drift_z_threshold:
                drifted.append(
                    DriftFeatureStat(
                        feature=feature,
                        reference_mean=round(reference_mean, 4),
                        current_mean=round(current_mean, 4),
                        reference_std=round(reference_std, 4),
                        z_score=round(float(z_score), 4),
                    )
                )

        return drifted


drift_detector_service = DriftDetectorService()