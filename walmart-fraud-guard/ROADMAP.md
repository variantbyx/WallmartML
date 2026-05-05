# Walmart Fraud Guard Roadmap

This roadmap turns the current fraud demo into a product-level system that can be explained in interviews as an end-to-end fraud platform rather than a single model.

## Current Status

- Completed: analyst review workflow, SHAP explainability, LLM explanation layer, drift monitoring, model registry status, browser dashboard, retraining orchestration, CI checks, and deployment hardening.
- Remaining: optional production rollout details such as cloud-specific secrets management and scalable managed services.

## What Already Exists

- FastAPI scoring API for incoming transactions
- XGBoost model artifacts with training and evaluation scripts
- Redis duplicate detection and per-user burst detection
- MongoDB for flexible raw event storage and alert payloads
- PostgreSQL for structured fraud events and analyst review metadata
- WebSocket alert stream for live consumers

## Where The Project Should Go Next

### Phase 1: Harden The Core Platform

Goal: make the backend reliable enough to act as a production scoring service.

Deliverables:

- Request validation and consistent error responses
- Health, readiness, and dependency checks
- Structured logging with request ids and transaction ids
- Centralized configuration for thresholds, TTLs, and model version
- Model startup caching so the artifact loads once per process

Why it matters:

- Fraud scoring systems are latency-sensitive.
- If the model reloads per request, throughput collapses.
- If logging is inconsistent, the investigation workflow breaks.

Status: completed in the current codebase.

### Phase 2: Add Analyst Workflow

Goal: turn fraud prediction into an operational review loop.

Deliverables:

- Review endpoints for confirming fraud or false positives
- Analyst metadata captured in PostgreSQL and MongoDB
- Review summaries for false-positive rate and confirmed-fraud rate
- Case status fields such as open, reviewed, escalated, and closed

Why it matters:

- A fraud model without feedback becomes static.
- Analyst labels become the ground truth for retraining.
- This is the bridge between ML and product operations.

Status: completed in the current codebase.

### Phase 3: Add LLM-Based Explanations

Goal: make every high-risk alert understandable to a fraud analyst.

Recommended design:

- Use SHAP to identify the top contributing features for one transaction
- Feed those features into a constrained prompt
- Generate a short natural-language explanation that says what is suspicious and why
- Store the explanation alongside the alert for auditability

Best practice:

- Keep the LLM temperature at zero for deterministic output
- Do not ask the model to make the fraud decision itself
- Use the LLM as an explanation layer, not as the scorer

Why it matters:

- Interviewers understand an ML model.
- They remember a system that explains itself to humans.

Status: completed in the current codebase.

### Phase 4: Add Explainability And Model Governance

Goal: make the model auditable and defensible.

Deliverables:

- SHAP per-transaction feature attributions
- Global feature importance charts
- Model versioning and promotion flow
- Calibration analysis for probability quality
- Threshold tuning based on business cost, not just accuracy

Why it matters:

- Fraud systems care more about precision/recall tradeoffs than raw accuracy.
- A low false-positive rate protects customer experience.
- A versioned model can be rolled back quickly if it drifts.

Status: completed in the current codebase.

### Phase 5: Add Real-Time Product Surfaces

Goal: make the system visible and demo-friendly.

Deliverables:

- Live transaction feed
- Alert management screen
- Review actions for analysts
- Fraud metrics dashboard
- Risk-level distribution and trend charts

Suggested dashboard metrics:

- Total transactions today
- High-risk alerts today
- Confirmed fraud rate
- False positive rate
- Alerts by risk level
- Model version currently in production

Why it matters:

- A dashboard converts a backend into a product.
- It makes the system explainable to non-technical reviewers.
- It gives you a live demo surface for interviews.

Status: completed in the current codebase.

### Phase 6: Add MLOps And Retraining

Goal: make the model adaptive to changing fraud behavior.

Deliverables:

- Drift detection on feature distributions
- Rolling-window monitoring for false positive rate
- Trigger-based retraining pipeline
- Model registry with staging and production states
- Promotion only if the new model beats the current one

Suggested trigger logic:

- Retrain when false positive rate exceeds a threshold
- Retrain when enough newly reviewed labels accumulate
- Retrain when drift is detected in high-impact features

Why it matters:

- Fraud patterns change over time.
- Static models decay quickly in production.
- A retraining loop is one of the strongest real-world signals in this project.

Status: completed in the current codebase.

### Phase 7: Add GenAI Differentiation

Goal: move from an ML project to an AI product.

Deliverables:

- LLM explanation layer for high-risk alerts
- Analyst-friendly case summaries
- Root-cause narrative generated from SHAP and transaction context
- Optional internal copilot for querying recent fraud patterns

Recommended stack:

- LangChain for orchestration
- A small, low-latency model such as GPT-4o-mini for explanations
- SHAP as the structured explanation source
- Redis or database caching to avoid repeated LLM calls on the same case

Why it matters:

- This is the feature that changes how the project reads on a resume.
- It shows both ML and product thinking.

Status: completed in the current codebase.

### Phase 8: Add DevOps And Deployment

Goal: make the project reproducible outside your machine.

Deliverables:

- Docker Compose for backend, databases, and cache
- Environment-based configuration
- CI checks for formatting, typing, and tests
- Deployment target for backend and dashboard

Why it matters:

- A reproducible project is much stronger than a notebook.
- Recruiters can run it without manual setup.

Status: completed in the current codebase.

## Suggested Build Order

1. Finish analyst review workflow and dashboard summary.
2. Add SHAP explanations to the scoring output.
3. Wrap the high-risk explanation path with an LLM layer.
4. Build the dashboard.
5. Add drift monitoring and retraining triggers.
6. Add deployment and CI.

## Resume Positioning

After the roadmap is implemented, the project should read like this:

- Production fraud detection system with FastAPI, XGBoost, Redis, MongoDB, and PostgreSQL
- Real-time scoring, alert streaming, and analyst review workflow
- Explainability layer using SHAP and an LLM-generated natural-language summary
- Monitoring, drift detection, and retraining triggers
- Containerized deployment with reproducible local setup

That version of the project communicates product thinking, backend engineering, ML engineering, and GenAI integration in one system.
