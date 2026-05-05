# Deployment Guide: Railway + Vercel

This guide walks through deploying **Walmart Fraud Guard** to production on Railway (backend) and Vercel (frontend).

## Part 1: Backend Deployment (Railway.app)

Railway is a PaaS that makes deploying Docker apps trivial. Free tier includes $5/month credits.

### Step 1: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub (recommended)
3. Authorize Railway to access your repos

### Step 2: Create New Project

1. Dashboard → "+ New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `walmart-fraud-guard` repository
4. Authorize if prompted

### Step 3: Configure Services

Railway will auto-detect `Dockerfile` in `/backend` and create the service.

**Add PostgreSQL:**

1. "+ New" button
2. Search for "PostgreSQL"
3. Add PostgreSQL 16 service
4. Railway auto-creates connection variables: `DATABASE_URL`

**Add MongoDB:**

1. "+ New" button
2. Search for "MongoDB"
3. Add MongoDB 7.0 service
4. Auto-creates: `MONGODB_URI`

**Add Redis:**

1. "+ New" button
2. Search for "Redis"
3. Add Redis 7.4 service
4. Auto-creates: `REDIS_URL`

### Step 4: Set Environment Variables

On your backend service, go to Variables tab and add:

```
OPENAI_API_KEY=sk-... (paste your OpenAI key)
JWT_SECRET_KEY=your-super-secret-key-min-32-chars
POSTGRES_DSN=postgresql://...  (Railway auto-provides)
MONGO_URI=mongodb+srv://...    (Railway auto-provides)
REDIS_URL=redis://...          (Railway auto-provides)
```

### Step 5: Configure Port

Railway auto-detects FastAPI's port 8000 from `EXPOSE 8000` in Dockerfile.

### Step 6: Deploy

1. Railway auto-deploys on every push to `main` branch
2. Or manually trigger: "Deploy" button
3. Wait for build (~3 min) and container startup (~1 min)
4. See logs in "Logs" tab to verify startup

**Your backend URL:** `https://walmart-fraud-guard-backend.up.railway.app`

### Verify Backend is Live

```bash
curl https://walmart-fraud-guard-backend.up.railway.app/health
# Should return: {"status":"ok","service":"Walmart Fraud Guard","env":"production"}
```

---

## Part 2: Frontend Deployment (Vercel)

Vercel is optimized for React/Next.js apps with auto-deploy on git push. Free tier is generous.

### Step 1: Create Vercel Account

1. Go to https://vercel.com
2. Sign up with GitHub
3. Authorize Vercel to access repos

### Step 2: Import Project

1. Dashboard → "Add New..." → "Project"
2. Select your GitHub repo `walmart-fraud-guard`
3. Click "Import"

### Step 3: Configure Build Settings

When Vercel shows the config screen:

**Root Directory:** `frontend/`

**Build Command:** `npm run build`

**Output Directory:** `dist`

**Environment Variables:**

```
VITE_API_URL=https://walmart-fraud-guard-backend.up.railway.app
```

This tells React where to find your backend.

### Step 4: Deploy

1. Click "Deploy"
2. Vercel builds and deploys (~2 min)
3. You get a URL like: `https://walmart-fraud-guard-frontend.vercel.app`

### Verify Frontend is Live

Open `https://walmart-fraud-guard-frontend.vercel.app` in browser.

You should see:

- Walmart Fraud Guard header
- "Please log in to continue" message

---

## Part 3: Integration Testing

### Test Login Flow

```bash
# Replace with your frontend URL
curl -X POST https://walmart-fraud-guard-backend.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "analyst1",
    "password": "analyst_password"
  }'

# Response:
# {
#   "access_token": "eyJ0eXAi...",
#   "refresh_token": "eyJ0eXAi...",
#   "token_type": "bearer"
# }
```

### Test Fraud Scoring (from Frontend)

1. Open `https://walmart-fraud-guard-frontend.vercel.app`
2. Log in with analyst1 / analyst_password
3. Copy the `access_token` from browser console (Network tab, POST /auth/login response)
4. Use it in the API request:

```bash
curl -X POST https://walmart-fraud-guard-backend.up.railway.app/api/v1/transactions/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "id": "txn_live_001",
    "user_id": "cust_001",
    "amount": 5000,
    "account_age_days": 3,
    "total_orders": 1,
    "total_returns": 1,
    "avg_order_value": 5000,
    "avg_return_value": 5000,
    "hour": 2,
    "is_night": true
  }'
```

You should see a HIGH/CRITICAL alert with SHAP explanation + LLM narrative.

### Test WebSocket Real-time

Open browser DevTools Console and run:

```javascript
const ws = new WebSocket(
  "wss://walmart-fraud-guard-backend.up.railway.app/ws/alerts",
);
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

Submit a high-risk transaction via the API above, and you should see the alert broadcast in real-time.

---

## Part 4: Monitoring & Maintenance

### Check Backend Logs

```bash
# Railway Dashboard → Backend Service → Logs
# Or via Railway CLI:
railway logs
```

### Monitor Database Usage

Railway Dashboard shows PostgreSQL/MongoDB usage:

- Storage (free tier: 100GB for PostgreSQL, 512MB for MongoDB)
- Connections
- Query performance

### Update Environment Variables

1. Railway Dashboard → Backend Service → Variables
2. Edit any var (e.g., new OpenAI key)
3. Changes auto-redeploy

### Auto Redeploy on Push

1. Connect GitHub repo to Railway
2. Every push to `main` auto-triggers rebuild + deploy
3. Watch deploy status in "Deployments" tab

---

## Part 5: Custom Domain (Optional)

### Add Custom Domain to Railway Backend

1. Dashboard → Backend Service → Settings → Domain
2. Add custom domain (e.g., `fraud-api.yourdomain.com`)
3. Update DNS records as shown
4. SSL auto-configured via Let's Encrypt

### Add Custom Domain to Vercel Frontend

1. Dashboard → Project Settings → Domains
2. Add custom domain (e.g., `fraud-dashboard.yourdomain.com`)
3. Update DNS records
4. SSL auto-configured

---

## Part 6: Cost Breakdown (Estimated)

**Railway.app:**

- Free tier: $5/month credits
  - PostgreSQL: ~$2/month (small instance)
  - MongoDB: ~$1.50/month (small M0 cluster)
  - Redis: ~$0.50/month
  - Backend compute: ~$1.50/month
- **Total: ~$5-8/month** (within free tier credits)

**Vercel:**

- Free tier: covers most use cases
- Static hosting + functions included
- **Total: $0** (free tier sufficient)

**OpenAI API:**

- ~1 penny per LLM explanation (GPT-4o-mini)
- If 1000 high-risk txns/day = ~$30/month
- **Total: Variable** (set usage limits in OpenAI dashboard)

**Total Production Cost: ~$50-100/month** (depending on traffic)

---

## Part 7: Troubleshooting

### Backend Deploy Fails

Check logs:

```bash
railway logs
```

Common issues:

- Missing environment variables (check Variables tab)
- Database migration failed (check PostgreSQL is ready)
- Model file not found (ensure `/ml/artifacts/` files are in repo)

### Frontend Can't Connect to Backend

1. Check backend URL in frontend environment variable
2. Verify CORS is enabled (FastAPI should have `*` origins in dev)
3. Check browser console for WebSocket connection errors

### Database Connection Refused

1. Verify PostgreSQL service is "Running" in Railway Dashboard
2. Check `POSTGRES_DSN` is correctly set
3. Restart PostgreSQL service

### High Latency (>200ms response times)

1. Check backend CPU usage (Railway Dashboard)
2. Verify database query performance
3. Consider upgrading to Railway paid tier for more CPU

---

## Part 8: Going Live Checklist

Before sharing the live URL with stakeholders:

- [ ] Backend health check passing: `https://backend.url/health` returns OK
- [ ] Login works: Can authenticate with analyst/admin credentials
- [ ] Fraud scoring works: Can submit transaction and get SHAP explanation
- [ ] WebSocket connected: Real-time alerts appear in dashboard
- [ ] Admin can trigger retrain: POST `/api/v1/models/retrain` works
- [ ] HTTPS everywhere: Both backend and frontend use HTTPS
- [ ] Error handling tested: Try invalid credentials, malformed requests
- [ ] Rate limiting works: Send >10 requests/min, see 429 error
- [ ] Database backups enabled: PostgreSQL + MongoDB auto-backup configured
- [ ] Monitoring set up: CloudWatch/DataDog logs configured (optional)

---

## Part 9: Quick Reference

**Backend:**

- Repository: `walmart-fraud-guard/backend`
- Docker image: Builds automatically from Dockerfile
- Port: 8000
- Database: PostgreSQL 16 + MongoDB 7.0 + Redis 7.4
- Deploy trigger: Push to `main` branch

**Frontend:**

- Repository: `walmart-fraud-guard/frontend`
- Build tool: Vite
- Port: 3000 (local), auto on Vercel
- Deploy trigger: Push to `main` branch (auto)

**URLs:**

```
Backend API:   https://walmart-fraud-guard-backend.up.railway.app
Frontend:      https://walmart-fraud-guard-frontend.vercel.app
API Docs:      https://walmart-fraud-guard-backend.up.railway.app/docs
WebSocket:     wss://walmart-fraud-guard-backend.up.railway.app/ws/alerts
```

---

Done! Your system is now live and ready for interviews. 🚀
