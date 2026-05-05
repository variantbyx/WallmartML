# Quick Deploy to Free Platforms

Deploy WalmartGuard **for FREE** in minutes. Choose your platform:

---

## 🏆 Easiest: Render (Recommended)

```bash
# 1. Create Render account: https://render.com
# 2. Go to Dashboard → + New → Blueprint
# 3. Enter repo: https://github.com/variantbyx/WallmartML
# 4. Set root directory: walmart-fraud-guard
# 5. Add secrets: JWT_SECRET_KEY, OPENAI_API_KEY
# 6. Click "Deploy Blueprint"
# 7. Wait 5-10 minutes ✅

Result:
- Backend: https://walmart-fraud-backend.onrender.com
- Frontend: https://walmart-fraud-frontend.onrender.com
- Cost: $0/month (free tier)
- Time: 5 minutes
```

**Files already prepared:**
- ✅ `render.yaml` - Blueprint configuration
- ✅ `Dockerfile` - Backend containerized
- ✅ `frontend/Dockerfile` - Frontend containerized

---

## 🚀 Scalable: Google Cloud Run

```bash
# 1. Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# 2. Run deployment script
cd walmart-fraud-guard
bash deploy-cloud-run.sh

# 3. Deploy frontend to Vercel separately
# https://vercel.com/import?repo=https://github.com/variantbyx/WallmartML

Result:
- Backend: https://walmart-fraud-backend-xxx.run.app
- Frontend: https://walmart-guard.vercel.app
- Cost: ~$1-5/month (pay-per-use)
- Time: 15 minutes
```

**Files already prepared:**
- ✅ `deploy-cloud-run.sh` - Automated deployment script
- ✅ `Dockerfile` - Ready for Cloud Build

---

## 🌍 Global: Fly.io (Also Free)

```bash
# 1. Install Fly CLI
brew install flyctl  # macOS
# OR https://fly.io/docs/hands-on/install-flyctl/

# 2. Authenticate
flyctl auth login

# 3. Deploy
cd walmart-fraud-guard
flyctl launch --no-deploy
flyctl secrets set JWT_SECRET_KEY=$(openssl rand -hex 32)
flyctl deploy

# 4. Deploy frontend
# Go to Vercel, import repo, set VITE_API_URL

Result:
- Backend: https://walmart-fraud-guard.fly.dev
- Frontend: https://walmart-guard.vercel.app
- Cost: $0/month (free tier)
- Time: 10 minutes
```

**Files already prepared:**
- ✅ `fly.toml` - Fly.io configuration
- ✅ `Dockerfile` - Ready for Fly

---

## 📊 Platform Comparison

| Feature | Render | Cloud Run | Fly.io | Cost |
|---------|--------|-----------|--------|------|
| Setup Time | 5 min | 15 min | 10 min | |
| Free Tier | ✅ Yes | ✅ Yes | ✅ Yes | |
| Auto-deploy | ✅ Yes | ✅ GitHub | ✅ CLI | |
| Always-on | ⏱ 15min sleep | ✅ Always | ✅ Always | |
| Databases | ✅ All included | Separate | Separate | |
| Global | Regional | Global | 🌍 Global | |
| **Monthly Cost** | **$0** | **$0-5** | **$0** | |

---

## 🎯 Recommended Path (No Credit Card)

1. **Deploy backend on Render** (5 min, completely free)
   - Website: https://render.com
   - No credit card required
   - Auto-deploys from GitHub
   - Includes all databases

2. **Deploy frontend on Vercel** (already configured)
   - Website: https://vercel.com
   - No credit card required
   - CDN-backed

3. **Done!** Your app is live ✅

**Total setup:** ~10 minutes
**Total cost:** $0/month
**Production ready:** Yes

---

## 📚 Detailed Guides

For step-by-step instructions:
- See `FREE_DEPLOYMENT_GUIDE.md` for all options
- See `PRODUCTION_CHECKLIST.md` for verified checklist

---

## 🔐 Required Secrets

All platforms need these environment variables:

```env
# REQUIRED
JWT_SECRET_KEY=<generate with: openssl rand -hex 32>

# OPTIONAL (for LLM explanations)
OPENAI_API_KEY=<your openai api key>

# AUTO-SET (by platform)
POSTGRES_DSN=<auto-created>
MONGO_URI=<auto-created>
REDIS_URL=<auto-created>
```

---

## ✅ Already Prepared

Your repo already has everything configured:

- ✅ **render.yaml** - Render blueprint
- ✅ **fly.toml** - Fly.io config
- ✅ **deploy-cloud-run.sh** - Cloud Run script
- ✅ **docker-compose.yml** - Local dev
- ✅ **Backend Dockerfile** - Production ready
- ✅ **Frontend Dockerfile** - Multi-stage build
- ✅ **.env.example** - All variables documented

---

## 🚀 Start Now

### Option A: Render (Recommended)
1. https://render.com/dashboard
2. Click "+ New" → "Blueprint"
3. Paste: `https://github.com/variantbyx/WallmartML.git`
4. Set root: `walmart-fraud-guard`
5. Deploy!

### Option B: Local Testing First
```bash
cd walmart-fraud-guard
docker-compose up -d
# Access at http://localhost:3000
```

---

**Questions?** See `FREE_DEPLOYMENT_GUIDE.md` for detailed instructions for each platform.
