from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import classification_report, roc_auc_score

from train import FEATURE_COLUMNS, build_label, build_training_frame

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = PROJECT_ROOT / ".." / "fraudsummaryall.csv"
MODEL_PATH = PROJECT_ROOT / "ml" / "artifacts" / "model.pkl"
SCALER_PATH = PROJECT_ROOT / "ml" / "artifacts" / "scaler.pkl"


def main() -> None:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")
    if not MODEL_PATH.exists() or not SCALER_PATH.exists():
        raise FileNotFoundError("Missing artifacts. Run ml/train.py first.")

    df = pd.read_csv(DATA_PATH)
    df = build_training_frame(df)
    X = df[FEATURE_COLUMNS].fillna(0)
    y = build_label(df)

    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)

    X_scaled = scaler.transform(X)
    pred = model.predict(X_scaled)
    proba = model.predict_proba(X_scaled)[:, 1]

    print(classification_report(y, pred, digits=4))
    print(f"ROC-AUC: {roc_auc_score(y, proba):.4f}")


if __name__ == "__main__":
    main()
