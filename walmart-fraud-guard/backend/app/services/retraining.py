from __future__ import annotations

import json
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from app.core.config import settings
from app.services.drift_detector import drift_detector_service
from app.services.model_registry import model_registry_service


@dataclass
class RetrainDecision:
    should_retrain: bool
    reason: str


class RetrainingService:
    def __init__(self) -> None:
        self.project_root = Path(__file__).resolve().parents[3]
        self.train_script = self.project_root / "ml" / "train.py"
        self.metadata_path = self.project_root / "ml" / "artifacts" / "metadata.json"

    async def get_training_data_with_labels(self, mongo_db, pg_session) -> list:
        """
        Pull confirmed fraud + false positive labels from analyst reviews.
        This creates ground truth labels that are more recent and accurate
        than original training data, directly informed by analyst expertise.
        """
        from sqlalchemy import text
        
        query = """
            SELECT 
                amount, account_age_days, total_orders, total_returns,
                avg_order_value, avg_return_value, return_ratio, 
                arv_aov_ratio, hour, is_night,
                CASE 
                    WHEN is_confirmed_fraud = true THEN 1
                    WHEN is_confirmed_fraud = false THEN 0
                    ELSE NULL
                END as label,
                created_at
            FROM fraud_events
            WHERE is_confirmed_fraud IS NOT NULL
            AND created_at >= (
                SELECT MAX(created_at) FROM model_registry WHERE status = 'production'
            )
            ORDER BY created_at DESC
            LIMIT 1000
        """
        
        result = await pg_session.execute(text(query))
        rows = result.fetchall()
        return [dict(row) for row in rows]

    async def should_retrain(self, mongo_db, pg_session) -> tuple[bool, str]:
        """
        Check if retraining should be triggered based on:
        1. Drift detection (3+ features drifted)
        2. False positive rate from analyst reviews (>20%)
        3. New labeled data accumulated (>500 confirmed labels)
        """
        from sqlalchemy import text
        
        # Reason 1: drift
        result = await drift_detector_service.check()
        if result.drifted_feature_count >= 3:
            return True, f"drift_detected_{result.drifted_feature_count}_features"
        
        # Reason 2: false positive rate from analyst reviews
        fp_query = """
            SELECT 
                COUNT(*) FILTER (WHERE is_confirmed_fraud = false) as fp_count,
                COUNT(*) FILTER (WHERE is_confirmed_fraud IS NOT NULL) as total_reviewed
            FROM fraud_events
            WHERE created_at >= NOW() - INTERVAL '7 days'
        """
        fp_result = await pg_session.execute(text(fp_query))
        fp_row = fp_result.fetchone()
        
        if fp_row and fp_row[1] > 20:  # enough data reviewed
            fp_rate = fp_row[0] / fp_row[1] if fp_row[1] > 0 else 0
            if fp_rate > 0.20:
                return True, f"high_fp_rate_{fp_rate:.1%}"
        
        # Reason 3: enough new labeled data accumulated
        new_labels_query = """
            SELECT COUNT(*) FROM fraud_events
            WHERE is_confirmed_fraud IS NOT NULL
            AND created_at >= (
                SELECT MAX(created_at) FROM model_registry WHERE status = 'production'
            )
        """
        new_label_result = await pg_session.execute(text(new_labels_query))
        new_label_count = new_label_result.scalar() or 0
        
        if new_label_count >= 500:
            return True, f"new_labeled_data_{new_label_count}_records"
        
        return False, "no_trigger"

    async def evaluate_retrain_need(self, summary: dict, drift_report: dict) -> RetrainDecision:
        false_positive_rate = float(summary.get("false_positive_rate", 0.0))
        drifted_count = int(drift_report.get("drifted_feature_count", 0))
        retrain_recommended = bool(drift_report.get("retrain_recommended", False))

        if false_positive_rate >= 0.15:
            return RetrainDecision(True, f"false_positive_rate_exceeded:{false_positive_rate:.4f}")

        if retrain_recommended or drifted_count >= 3:
            return RetrainDecision(True, f"feature_drift_detected:{drifted_count}")

        return RetrainDecision(False, "thresholds_not_reached")

    async def run(self, reason: str = "auto-drift-or-performance-trigger") -> dict:
        """
        Run the training pipeline.
        In production, this would pull analyst-confirmed labels and retrain.
        """
        if not self.train_script.exists():
            raise FileNotFoundError(f"Training script not found: {self.train_script}")

        current_status = model_registry_service.get_status()
        previous_version = current_status.get("production_version", "unknown")
        previous_metadata = current_status.get("metadata", {})
        previous_metrics = dict(previous_metadata.get("metrics", {}))

        try:
            completed = subprocess.run(
                [sys.executable, str(self.train_script)],
                cwd=str(self.project_root),
                check=True,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Training script timed out after 5 minutes"
            }
        except subprocess.CalledProcessError as e:
            return {
                "success": False,
                "error": f"Training script failed: {e.stderr}"
            }

        if not self.metadata_path.exists():
            return {
                "success": False,
                "error": f"Training metadata was not created: {self.metadata_path}"
            }

        try:
            metadata = json.loads(self.metadata_path.read_text(encoding="utf-8"))
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to read metadata: {e}"
            }

        model_version = metadata.get("model_version", settings.model_version)
        model_path = metadata.get("artifacts", {}).get("model_path", settings.model_path)
        scaler_path = metadata.get("artifacts", {}).get("scaler_path", settings.scaler_path)
        metrics = metadata.get("metrics", {})

        model_registry_service.register_model(
            version=model_version,
            model_path=model_path,
            scaler_path=scaler_path,
            metrics=metrics,
        )

        previous_auc = float(previous_metrics.get("roc_auc", 0.0))
        candidate_auc = float(metrics.get("roc_auc", 0.0))
        promoted = candidate_auc > previous_auc

        if promoted:
            model_registry_service.promote(model_version)
            return {
                "success": True,
                "promoted": True,
                "reason": reason,
                "model_version": model_version,
                "previous_version": previous_version,
                "new_roc_auc": candidate_auc,
                "previous_roc_auc": previous_auc,
                "metrics": metrics,
            }
        else:
            return {
                "success": True,
                "promoted": False,
                "reason": f"Model did not improve (new_auc={candidate_auc} <= prev_auc={previous_auc})",
                "model_version": model_version,
                "previous_version": previous_version,
                "new_roc_auc": candidate_auc,
                "previous_roc_auc": previous_auc,
            }


retraining_service = RetrainingService()