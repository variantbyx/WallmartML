# Free & Affordable Deployment Guide

Deploy **WalmartGuard** for **FREE** or **very cheap** using modern cloud platforms. No credit card required for most options.

---

## 🚀 Quick Comparison

| Platform         | Backend             | Frontend    | Cost          | Setup Time | Pros                 |
| ---------------- | ------------------- | ----------- | ------------- | ---------- | -------------------- |
| **Render**       | ✅ Free             | ✅ Free     | $0/mo         | 5 min      | Easiest, auto-deploy |
| **Cloud Run**    | ✅ $0 (pay-per-use) | ❌ Separate | ~$1-5/mo\*    | 10 min     | Serverless, scalable |
| **Fly.io**       | ✅ Free             | ✅ Free     | $0/mo         | 10 min     | Global, shared CPU   |
| **Vercel**       | ❌ Edge Functions   | ✅ Free     | Free frontend | —          | Frontend optimal     |
| **Hugging Face** | ✅ Free             | ✅ Free     | $0/mo         | 15 min     | AI-focused, limited  |

\*Cloud Run: Free tier 2M requests/month, pay $0.40/M thereafter (very cheap)

---

## ✅ Option 1: Render.com (RECOMMENDED FOR FREE)

**Best for:** Complete free hosting with production features

### Prerequisites

- GitHub account
- Render account (https://render.com)

### Step 1: Prepare Repository

Your repo is already set up! It has:

- ✅ `render.yaml` blueprint configuration
- ✅ `Dockerfile` for both services
- ✅ `requirements.txt` with all dependencies
- ✅ `package.json` with frontend build

### Step 2: Connect GitHub to Render

1. Go to https://render.com/dashboard
2. Click **+ New** → **Blueprint**
3. Select **Public Git repository**
4. Paste: `https://github.com/variantbyx/WallmartML.git`
5. Click **Connect**

### Step 3: Configure Deploy

- **Blueprint name:** `walmart-fraud-guard`
- **Branch:** `main`
- **Root directory:** `walmart-fraud-guard`
- Click **Create Blueprint**

Render will parse `render.yaml` and show services to deploy:

- walmart-fraud-guard-backend (Python)
- walmart-fraud-guard-frontend (Static)
- walmart-fraud-postgres (PostgreSQL)
- walmart-fraud-mongo (MongoDB)
- walmart-fraud-redis (Redis)

### Step 4: Set Environment Variables

Click **Advanced** and add these secret variables:

```
JWT_SECRET_KEY=<Generate: openssl rand -hex 32>
OPENAI_API_KEY=<Optional: Your OpenAI key>
CORS_ORIGINS=https://walmart-fraud-guard-frontend.onrender.com
```

**Generate JWT_SECRET_KEY:**

```bash
# Run locally:
openssl rand -hex 32
# Copy the output (64 hex characters)
```

### Step 5: Deploy

- Click **Deploy Blueprint**
- Render auto-builds and deploys all services (5-10 minutes)
- Monitor logs in dashboard
- Services auto-restart on failure

### Step 6: Access Your App

After deployment:

```
Backend API:  https://walmart-fraud-guard-backend.onrender.com
Frontend:     https://walmart-fraud-guard-frontend.onrender.com
API Docs:     https://walmart-fraud-guard-backend.onrender.com/docs
```

### Render Costs (100% FREE TIER)

- ✅ Backend: **Free** (services sleep after 15 min inactivity)
- ✅ PostgreSQL: **Free** (500 MB storage)
- ✅ MongoDB: **Free** (512 MB storage)
- ✅ Redis: **Free** (500 MB)
- ✅ Frontend: **Free** (static hosting)

**Pro Tips:**

- Free services sleep after 15 minutes of inactivity (wake on next request)
- To keep always-on, upgrade to **Starter** ($7/mo)
- Databases free tier limits: see https://render.com/pricing

---

## ✅ Option 2: Google Cloud Run (PAY-PER-USE)

**Best for:** Scalability without upfront costs (~$1-5/mo for typical usage)

### Prerequisites

- Google Cloud account
- `gcloud` CLI installed
- Git repo pushed to GitHub

### Step 1: Create Cloud Run Service

```bash
# Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login

# Create project
gcloud projects create walmart-fraud-guard --display-name="Walmart Fraud Guard"
gcloud config set project walmart-fraud-guard

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable container.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable sql-component.googleapis.com
```

### Step 2: Deploy Backend

```bash
# Navigate to backend
cd walmart-fraud-guard/backend

# Deploy to Cloud Run
gcloud run deploy walmart-fraud-guard-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars APP_ENV=production,LOG_LEVEL=INFO \
  --set-env-vars JWT_SECRET_KEY=$(openssl rand -hex 32)
```

### Step 3: Create Cloud SQL Databases

```bash
# PostgreSQL
gcloud sql instances create walmart-fraud-postgres \
  --database-version POSTGRES_15 \
  --tier db-f1-micro \
  --region us-central1

# MongoDB (use MongoDB Atlas free tier instead)
# https://www.mongodb.com/cloud/atlas (better than Cloud SQL for Mongo)
```

### Step 4: Deploy Frontend to Vercel

Frontend works best on Vercel (see below)

### Cloud Run Pricing

```
Backend API:     $0.0000417/second (~$0.40/million requests)
Storage:         First 5 GB free, then $0.020/GB
Data transfer:   First 1 GB free, then $0.12/GB
Typical cost:    $2-5/month for moderate usage
```

---

## ✅ Option 3: Fly.io (COMPLETELY FREE)

**Best for:** Distributed deployment, shared CPU OK

### Prerequisites

- Fly.io account: https://fly.io/app/sign-up
- `flyctl` CLI: https://fly.io/docs/hands-on/install-flyctl/

### Step 1: Install Fly CLI

```bash
# macOS
brew install flyctl

# Windows (via PowerShell)
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Linux
curl -L https://fly.io/install.sh | sh
```

### Step 2: Login

```bash
flyctl auth login
```

### Step 3: Create fly.toml

Create `walmart-fraud-guard/fly.toml`:

```toml
app = "walmart-fraud-guard"
primary_region = "us-sea"

[build]
dockerfile = "backend/Dockerfile"

[env]
APP_ENV = "production"
LOG_LEVEL = "INFO"

[[services]]
internal_port = 8000
protocol = "tcp"

[[services.ports]]
port = 80
handlers = ["http"]

[[services.ports]]
port = 443
handlers = ["tls", "http"]
```

### Step 4: Deploy

```bash
cd walmart-fraud-guard
flyctl launch --no-deploy
flyctl secrets set JWT_SECRET_KEY=$(openssl rand -hex 32)
flyctl deploy
```

### Fly.io Pricing

```
Compute:         Free tier (3 shared-cpu-1x 256MB VMs)
Data transfer:   160 GB/month free
Databases:       Managed PostgreSQL/Redis available free tier
Typical cost:    $0-5/month
```

---

## ✅ Option 4: Vercel (Frontend Only)

**Already configured!** Frontend already deployed to Vercel.

### To re-deploy frontend:

1. Go https://vercel.com
2. Import GitHub repo: `variantbyx/WallmartML`
3. Root directory: `walmart-fraud-guard/frontend`
4. Environment: `VITE_API_URL=https://<your-backend-url>`
5. Deploy

**Cost:** Completely FREE ✅

---

## ✅ Option 5: GitHub Pages + Serverless Backend

**For frontend static hosting on GitHub Pages (CDN-backed):**

```bash
# Install gh-pages
cd walmart-fraud-guard/frontend
npm install --save-dev gh-pages

# Update package.json scripts
# "deploy": "npm run build && gh-pages -d dist"

# Deploy frontend
npm run deploy
```

**Result:** Frontend at `https://variantbyx.github.io/WallmartML`

---

## Recommended Setup: Render (Easiest)

```
┌─────────────────────────────────────────────────┐
│           Walmart Fraud Guard                   │
│        (Free, Production-Ready Setup)           │
├─────────────────────────────────────────────────┤
│                                                 │
│  Frontend (Vercel)                              │
│  https://walmart-guard.vercel.app               │
│  ✅ Free tier, CDN, auto-deploy                 │
│                                                 │
│           ↕ WebSocket + API calls               │
│                                                 │
│  Backend (Render)                               │
│  https://walmart-fraud-backend.onrender.com     │
│  ✅ Free tier, auto-sleep, auto-wake            │
│                                                 │
│  Databases (Render)                             │
│  ✅ PostgreSQL: 500 MB free                     │
│  ✅ MongoDB: 512 MB free                        │
│  ✅ Redis: 500 MB free                          │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Total Cost:** $0.00/month ✅

---

## Deployment Comparison Guide

### Render Setup (5 minutes)

```bash
1. Push to GitHub ✅ (already done)
2. Create render.yaml ✅ (already done)
3. Sign up at render.com
4. Connect GitHub
5. Deploy blueprint
6. Set secrets
7. Done! ✅
```

### Cloud Run Setup (15 minutes)

```bash
1. Create Google Cloud project
2. Enable APIs
3. Create PostgreSQL instance
4. Connect MongoDB Atlas
5. Deploy via gcloud CLI
6. Configure environment
7. Set up frontend separately
```

### Fly.io Setup (10 minutes)

```bash
1. Install flyctl
2. Create fly.toml
3. Run flyctl launch
4. Set secrets
5. Deploy
6. Configure frontend
```

---

## Common Issues & Solutions

### Services sleeping on Render free tier

**Issue:** API slow to respond after inactivity

**Solution:**

- Upgrade to **Starter** ($7/mo) for always-on
- Or accept 15-30 second cold start

### Database connection issues

**Issue:** Can't connect to database from backend

**Solution:**

- Verify `DATABASE_URL` environment variable
- Check database firewall allows your IP
- On Render: services auto-linked, no firewall config needed

### Frontend can't reach backend API

**Issue:** CORS errors in browser console

**Solution:**

- Verify `VITE_API_URL` set correctly in Vercel
- Add frontend URL to backend `CORS_ORIGINS`
- Ensure backend is fully deployed and responding

---

## Monitoring & Maintenance

### View Logs

**Render:**

```
Dashboard → Services → walmart-fraud-guard-backend → Logs
```

**Cloud Run:**

```bash
gcloud run services describe walmart-fraud-guard-backend --region us-central1
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=walmart-fraud-guard-backend"
```

**Fly.io:**

```bash
flyctl logs
```

### Update Deployment

**Render:**

```
Push to GitHub → Auto-redeploys on main branch
```

**Cloud Run:**

```bash
gcloud run deploy walmart-fraud-guard-backend --source .
```

**Fly.io:**

```bash
flyctl deploy
```

---

## Production Recommendations

1. **Use Render for simplicity** ← Start here
2. **Use Cloud Run for scale** (pay-per-use, cheap)
3. **Keep Vercel for frontend** (best SPA hosting)
4. **Monitor with native dashboards** (all platforms)
5. **Backup databases monthly** (use managed backups)
6. **Set up alerting** (platform-native or PagerDuty)

---

## Next Steps

1. **Choose platform:** Render recommended for free
2. **Deploy backend** using guide above
3. **Deploy frontend** to Vercel (if not already)
4. **Configure environment variables**
5. **Test end-to-end** at production URL
6. **Monitor logs** for issues

---

**Status:** Ready to deploy to any platform ✅

For platform-specific help:

- Render: https://render.com/docs
- Cloud Run: https://cloud.google.com/run/docs
- Fly.io: https://fly.io/docs
- Vercel: https://vercel.com/docs
