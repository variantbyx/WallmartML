# Walmart Fraud Guard

Walmart Fraud Guard is a production-oriented fraud detection system built around a FastAPI backend, Redis signal checks, MongoDB raw event storage, PostgreSQL analytics, and XGBoost model artifacts.

Current capabilities:

- Real-time transaction scoring through FastAPI
- Redis duplicate detection and burst-rate detection
- MongoDB storage for raw transactions and alert payloads
- PostgreSQL storage for structured fraud events and analyst feedback
- WebSocket alert stream for live dashboard consumers
- ML training and evaluation scripts for the XGBoost pipeline
- Analyst review workflow and daily dashboard summary endpoint
- Model drift report and production model registry status endpoint
- Static browser dashboard for live fraud operations

## Project Structure

```text
walmart-fraud-guard/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/
│   │   │   ├── analytics.py
│   │   │   ├── transactions.py
│   │   │   └── alerts.py
│   │   ├── services/
│   │   │   ├── analytics.py
│   │   │   ├── fraud_detector.py
│   │   │   ├── explainer.py
│   │   │   ├── notifier.py
│   │   │   └── redis_guard.py
│   │   ├── models/
│   │   │   ├── transaction.py
│   │   │   └── alert.py
│   │   ├── db/
│   │   │   ├── mongo.py
│   │   │   ├── postgres.py
│   │   │   └── redis.py
│   │   └── core/
│   │       └── config.py
│   ├── requirements.txt
│   └── Dockerfile
├── ml/
│   ├── train.py
│   ├── evaluate.py
│   └── artifacts/
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── docker-compose.yml
├── ROADMAP.md
└── .env.example
```

## Quick Start

1. Copy `.env.example` to `.env`.
2. Train the model artifacts:
   - `python ml/train.py`
3. Start infra and API:
   - `docker compose up --build`
4. Open the dashboard:
   - `http://localhost:3000`
5. Open API docs:
   - `http://localhost:8000/docs`

## Main API

- `POST /api/v1/transactions/analyze`
- `GET /api/v1/analytics/summary`
- `GET /api/v1/analytics/drift`
- `POST /api/v1/analytics/alerts/{transaction_id}/review`
- `GET /api/v1/models/status`
- `POST /api/v1/models/retrain`
- `GET /api/v1/alerts/recent`
- `WS /api/v1/alerts/stream`
- `GET /health`

## Example Request

```json
{
  "id": "txn-1001",
  "user_id": "user-22",
  "amount": 1820.45,
  "currency": "USD",
  "merchant_id": "m-91",
  "account_age_days": 12,
  "total_orders": 8,
  "total_returns": 5,
  "avg_order_value": 112.5,
  "avg_return_value": 219.2
}
```

## Notes

- High-risk (`HIGH`, `CRITICAL`) events trigger explanation generation and alert broadcast.
- Duplicate transaction IDs are rejected using Redis key TTL.
- User burst behavior (`>10` requests in `60s`) is returned as a suspicious signal.
- PostgreSQL records include analyst-review fields (`is_confirmed_fraud`, `reviewer_id`) for feedback loop and retraining.
- Drift monitoring compares recent transactions against the training baseline and recommends retraining when drift is significant.
- The browser dashboard surfaces summary metrics, drift, alerts, and production model status.
- The retraining endpoint can run the training script, register the new candidate model, and promote it when it improves ROC-AUC.
- See [ROADMAP.md](ROADMAP.md) for the product and GenAI expansion plan.
