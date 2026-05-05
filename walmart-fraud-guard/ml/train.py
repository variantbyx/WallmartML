from pathlib import Path
from datetime import UTC, datetime
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = PROJECT_ROOT / ".." / "fraudsummaryall.csv"
ARTIFACT_DIR = PROJECT_ROOT / "ml" / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "model.pkl"
SCALER_PATH = ARTIFACT_DIR / "scaler.pkl"
METADATA_PATH = ARTIFACT_DIR / "metadata.json"

FEATURE_COLUMNS = [
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


def build_training_frame(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Map legacy columns from the existing Walmart dataset into API feature names.
    rename_map = {
        "AccountAge": "account_age_days",
        "TotalOrders": "total_orders",
        "TotalReturns": "total_returns",
        "AOV": "avg_order_value",
        "ARV": "avg_return_value",
    }
    for old, new in rename_map.items():
        if old in df.columns and new not in df.columns:
            df[new] = df[old]

    if "amount" not in df.columns:
        df["amount"] = df.get("avg_return_value", 0)

    if "return_ratio" not in df.columns:
        df["return_ratio"] = np.where(
            df.get("total_orders", 0) > 0,
            df.get("total_returns", 0) / df.get("total_orders", 1),
            0,
        )

    if "arv_aov_ratio" not in df.columns:
        df["arv_aov_ratio"] = np.where(
            df.get("avg_order_value", 0) > 0,
            df.get("avg_return_value", 0) / df.get("avg_order_value", 1),
            0,
        )

    if "hour" not in df.columns:
        df["hour"] = 12

    if "is_night" not in df.columns:
        df["is_night"] = df["hour"].apply(lambda h: 1 if int(h) <= 5 or int(h) >= 23 else 0)

    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            df[col] = 0

    return df


def build_label(df: pd.DataFrame) -> pd.Series:
    for candidate in ["is_fraud", "IsFraud", "label", "target"]:
        if candidate in df.columns:
            return df[candidate].astype(int)

    if "FraudScore" in df.columns:
        # Bootstrap labels from existing risk score if explicit labels do not exist.
        return (df["FraudScore"] >= 75).astype(int)

    raise ValueError("No supervised label found. Add one of: is_fraud, IsFraud, label, target, FraudScore")


def main() -> None:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")

    raw = pd.read_csv(DATA_PATH)
    prepared = build_training_frame(raw)
    y = build_label(prepared)
    X = prepared[FEATURE_COLUMNS].fillna(0)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = XGBClassifier(
        n_estimators=250,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42,
        eval_metric="logloss",
    )
    model.fit(X_train_scaled, y_train)

    pred = model.predict(X_test_scaled)
    proba = model.predict_proba(X_test_scaled)[:, 1]

    print(classification_report(y_test, pred, digits=4))
    print(f"ROC-AUC: {roc_auc_score(y_test, proba):.4f}")

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)

    metadata = {
        "model_version": f"xgb-{datetime.now(UTC).strftime('%Y%m%d-%H%M')}",
        "trained_at": datetime.now(UTC).isoformat(),
        "feature_columns": FEATURE_COLUMNS,
        "metrics": {
            "roc_auc": float(roc_auc_score(y_test, proba)),
        },
        "artifacts": {
            "model_path": str(MODEL_PATH),
            "scaler_path": str(SCALER_PATH),
        },
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    print(f"Saved model to {MODEL_PATH}")
    print(f"Saved scaler to {SCALER_PATH}")
    print(f"Saved metadata to {METADATA_PATH}")


if __name__ == "__main__":
    main()
