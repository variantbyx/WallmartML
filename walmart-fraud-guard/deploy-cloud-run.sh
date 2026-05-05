#!/bin/bash
# Google Cloud Run Deployment Script
# Deploy WalmartGuard backend to Cloud Run (serverless)

set -e

PROJECT_ID=${1:-walmart-fraud-guard}
REGION=${2:-us-central1}
SERVICE_NAME="walmart-fraud-backend"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Deploying WalmartGuard to Google Cloud Run"
echo "=============================================="
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo ""

# Step 1: Authenticate
echo "1️⃣  Authenticating with Google Cloud..."
gcloud auth login

# Step 2: Set project
echo "2️⃣  Setting GCP project..."
gcloud config set project $PROJECT_ID

# Step 3: Enable APIs
echo "3️⃣  Enabling required APIs..."
gcloud services enable run.googleapis.com
gcloud services enable container.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable sqladmin.googleapis.com

# Step 4: Create Cloud SQL PostgreSQL
echo "4️⃣  Creating Cloud SQL PostgreSQL instance..."
gcloud sql instances create walmart-fraud-postgres \
  --database-version POSTGRES_15 \
  --tier db-f1-micro \
  --region $REGION \
  --backup-start-time 03:00 \
  --enable-bin-log 2>/dev/null || echo "Instance may already exist"

# Step 5: Create database
echo "5️⃣  Creating fraud_db database..."
gcloud sql databases create fraud_db \
  --instance walmart-fraud-postgres 2>/dev/null || echo "Database may already exist"

# Step 6: Create Cloud SQL user
echo "6️⃣  Creating database user..."
gcloud sql users create fraud_user \
  --instance walmart-fraud-postgres \
  --password $(openssl rand -hex 16) 2>/dev/null || echo "User may already exist"

# Step 7: Get connection string
POSTGRES_HOST=$(gcloud sql instances describe walmart-fraud-postgres --format='value(ipAddresses[0].ipAddress)')
echo "7️⃣  PostgreSQL host: $POSTGRES_HOST"

# Step 8: Build Docker image
echo "8️⃣  Building Docker image..."
cd walmart-fraud-guard/backend
gcloud builds submit --tag $IMAGE_NAME

# Step 9: Deploy to Cloud Run
echo "9️⃣  Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --memory 512Mi \
  --cpu 2 \
  --allow-unauthenticated \
  --set-env-vars APP_ENV=production,LOG_LEVEL=INFO \
  --set-env-vars POSTGRES_DSN="postgresql+asyncpg://fraud_user:password@$POSTGRES_HOST:5432/fraud_db" \
  --set-env-vars JWT_SECRET_KEY=$(openssl rand -hex 32)

# Step 10: Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)')

echo ""
echo "✅ Deployment Complete!"
echo "🔗 Backend URL: $SERVICE_URL"
echo ""
echo "📝 Next steps:"
echo "1. Set up MongoDB Atlas (free tier): https://www.mongodb.com/cloud/atlas"
echo "2. Set up Redis on Cloud Memorystore or use Redis Cloud (free tier)"
echo "3. Deploy frontend to Vercel with VITE_API_URL=$SERVICE_URL"
echo "4. Update CORS_ORIGINS in backend with frontend URL"
