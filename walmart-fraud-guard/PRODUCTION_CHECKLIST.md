# Production Deployment Checklist

Complete this checklist before deploying **WalmartGuard** to production on Railway + Vercel.

---

## Pre-Deployment

### Local Testing

- [ ] Clone repository: `git clone https://github.com/variantbyx/WallmartML.git`
- [ ] Copy `.env.example` to `.env`: `cp .env.example .env`
- [ ] Generate ML artifacts: `cd ml && python train.py && cd ..`
- [ ] Run verification script: `bash verify-deployment.sh`
- [ ] All 5 Docker containers healthy ✓
- [ ] API responds: `curl http://localhost:8000/health`
- [ ] Frontend loads: `http://localhost:3000`
- [ ] Can login with `analyst1` / `analyst_password` ✓
- [ ] Can submit test transaction ✓
- [ ] WebSocket alerts appear in real-time ✓

### Code Review

- [ ] No hardcoded secrets in `.env` (use `.env.example` template)
- [ ] No debug/test code in production branches
- [ ] All endpoints have proper error handling
- [ ] CORS settings appropriate for deployment domain

---

## Railway Backend Deployment

### Setup Railway Project

- [ ] Create Railway account: https://railway.app
- [ ] Create new project
- [ ] Connect GitHub repository
- [ ] Authorize Railway to deploy from `main` branch

### Configure Backend Service

- [ ] Railway auto-detects `backend/Dockerfile`
- [ ] Set **Build Context**: `/` (root of repo)
- [ ] Set **Dockerfile**: `backend/Dockerfile`

### Configure Database Services (Railway Marketplace)

Add these services from Railway marketplace:

1. **PostgreSQL 16**
   - [ ] Add to project
   - [ ] Note the `DATABASE_URL` created automatically
   - [ ] Connection string: `postgresql://user:pass@host:5432/fraud_db`

2. **MongoDB 7.0**
   - [ ] Add to project
   - [ ] Note the `MONGODB_URI` created
   - [ ] Connection string: `mongodb+srv://user:pass@host/fraud_db`

3. **Redis 7.4**
   - [ ] Add to project
   - [ ] Note the `REDIS_URL` created
   - [ ] Connection string: `redis://:pass@host:6379`

### Environment Variables (Backend Service)

Set these in Railway **Variables** tab:

```
APP_NAME=Walmart Fraud Guard
APP_ENV=production
API_PREFIX=/api/v1

JWT_SECRET_KEY=[Generate: openssl rand -hex 32]
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

MODEL_PATH=ml/artifacts/model.pkl
SCALER_PATH=ml/artifacts/scaler.pkl
MODEL_THRESHOLD=0.75
MODEL_VERSION=xgb-v1

DUPLICATE_TTL_SECONDS=3600
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=10

OPENAI_API_KEY=[Optional: Your OpenAI key for LLM explanations]
LOG_LEVEL=INFO

# These will auto-link from Railway services:
DATABASE_URL=[Railway PostgreSQL]
MONGODB_URI=[Railway MongoDB]
REDIS_URL=[Railway Redis]
```

### Generate Required Keys

```bash
# Generate JWT_SECRET_KEY (64 hex chars)
openssl rand -hex 32
# Output: 3a4f5c2e1b9d7a6c8e2f4b1d9a3c5e7f2b1a4c9d8e7f6a5b4c3d2e1f

# Copy this value to Railway Variables → JWT_SECRET_KEY
```

### Deploy

- [ ] Commit changes: `git add . && git commit -m "Production ready"`
- [ ] Push to GitHub: `git push origin main`
- [ ] Railway auto-deploys from GitHub push
- [ ] Monitor logs in Railway dashboard
- [ ] Wait for deployment to complete
- [ ] Note public URL: `https://walmartguard-backend.up.railway.app`

### Verify Backend

```bash
# Test health endpoint
curl https://walmartguard-backend.up.railway.app/health

# Should respond:
# {"status":"ok","service":"Walmart Fraud Guard","env":"production"}
```

---

## Vercel Frontend Deployment

### Setup Vercel Project

- [ ] Create Vercel account: https://vercel.com
- [ ] Create new project
- [ ] Select "Import Git Repository"
- [ ] Choose your forked `WallmartML` repo
- [ ] Authorize Vercel with GitHub

### Configure Build Settings

- [ ] **Project Name**: `walmart-guard-frontend`
- [ ] **Framework Preset**: Vite
- [ ] **Root Directory**: `walmart-fraud-guard/frontend`
- [ ] **Build Command**: `npm run build`
- [ ] **Output Directory**: `dist`

### Environment Variables (Vercel)

Set in Vercel **Settings** → **Environment Variables**:

```
VITE_API_URL=https://walmartguard-backend.up.railway.app
```

This tells frontend where to connect to your Railway backend.

### Deploy

- [ ] Click "Deploy"
- [ ] Vercel builds and deploys automatically
- [ ] Monitor deployment in dashboard
- [ ] Note public URL: `https://walmart-guard-frontend.vercel.app`

### Verify Frontend

- [ ] Frontend loads at production URL
- [ ] Can login with `analyst1` / `analyst_password`
- [ ] Network tab shows requests to Railway backend
- [ ] WebSocket connects to backend
- [ ] Real-time alerts appear when transactions scored

---

## Post-Deployment

### API Verification

Test each endpoint to verify production deployment:

```bash
BASE_URL=https://walmartguard-backend.up.railway.app

# 1. Health check
curl $BASE_URL/health

# 2. Login (get tokens)
RESPONSE=$(curl -X POST $BASE_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "analyst1",
    "password": "analyst_password"
  }')

# Extract access_token
TOKEN=$(echo $RESPONSE | jq -r '.access_token')

# 3. Analytics summary
curl -X GET $BASE_URL/api/v1/analytics/summary \
  -H "Authorization: Bearer $TOKEN"

# 4. Model status
curl -X GET $BASE_URL/api/v1/models/status \
  -H "Authorization: Bearer $TOKEN"

# 5. Test fraud detection
curl -X POST $BASE_URL/api/v1/transactions/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "id": "prod-test-1",
    "user_id": "test-user",
    "merchant_id": "test-merchant",
    "amount": 5000.0,
    "account_age_days": 3,
    "total_orders": 1,
    "total_returns": 1,
    "avg_order_value": 5000.0,
    "avg_return_value": 5000.0,
    "transaction_timestamp": "2026-05-05T12:00:00Z"
  }'
```

### Dashboard Verification

- [ ] Frontend dashboard loads without errors
- [ ] Can login and see analytics
- [ ] Submit test transaction via dashboard
- [ ] Alert appears in real-time (WebSocket working)
- [ ] Can review and mark fraud/false positive

### Database Verification

```bash
# PostgreSQL: Check fraud events table
# Use Railway dashboard PostgreSQL client or connect with psql

# MongoDB: Check transactions collection
# Use Railway dashboard MongoDB client or connect with mongosh

# Redis: Check keys
# Use Railway dashboard Redis client or connect with redis-cli KEYS "*"
```

---

## Monitoring & Maintenance

### Set Up Alerts

- [ ] Configure Railway alerts for service failures
- [ ] Set up email notifications
- [ ] Monitor deployment logs regularly

### Scaling

- [ ] Monitor Railway CPU/Memory usage
- [ ] Scale up workers if needed
- [ ] Enable auto-scaling if available

### Backups

- [ ] Enable PostgreSQL automated backups (Railway)
- [ ] Enable MongoDB backups (Railway)
- [ ] Test restore procedures monthly

---

## Security Checklist

- [ ] JWT_SECRET_KEY is strong (64+ hex chars)
- [ ] No secrets in git history
- [ ] Environment variables not logged
- [ ] CORS origins restricted to your domains
- [ ] Database credentials stored in Railway secrets
- [ ] HTTPS enforced (Railway/Vercel default)
- [ ] Rate limiting enabled (10 req/60s)
- [ ] Duplicate detection working (1hr TTL)

---

## Troubleshooting

### Backend fails to start

```bash
# Check logs in Railway dashboard
# Common issues:
# 1. Missing environment variables → Add to Railway Variables
# 2. Database unreachable → Check service connections
# 3. ML artifacts missing → Run ml/train.py first
```

### Frontend shows "Connection refused"

```bash
# Check VITE_API_URL in Vercel environment
# Should be: https://walmartguard-backend.up.railway.app

# Verify backend is responding:
curl https://walmartguard-backend.up.railway.app/health
```

### WebSocket not connecting

```bash
# Check browser console for connection errors
# Verify backend WebSocket endpoint:
# ws://walmartguard-backend.up.railway.app/ws/alerts
# (Use wss:// for HTTPS)

# Railway/Vercel should handle protocol upgrade automatically
```

---

## Production URLs (Example)

After deployment, you'll have:

```
Backend API:     https://walmartguard-backend.up.railway.app
Frontend:        https://walmart-guard-frontend.vercel.app
Dashboard URL:   https://walmart-guard-frontend.vercel.app
API Docs:        https://walmartguard-backend.up.railway.app/docs
WebSocket:       wss://walmartguard-backend.up.railway.app/ws/alerts
```

---

## Support

- GitHub Issues: https://github.com/variantbyx/WallmartML/issues
- Documentation: https://github.com/variantbyx/WallmartML/blob/main/README.md
- Deployment Guide: https://github.com/variantbyx/WallmartML/blob/main/walmart-fraud-guard/DEPLOYMENT.md

---

**Last Updated:** May 5, 2026
**Status:** Production Ready ✓
