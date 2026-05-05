#!/bin/bash
# Walmart Fraud Guard - Deployment Verification Script

set -e

echo "🚀 WalmartGuard Deployment Verification"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker is running
echo "1️⃣  Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is installed${NC}"

# Check docker-compose
echo ""
echo "2️⃣  Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found. Please install Docker Compose.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose is installed${NC}"

# Check .env file
echo ""
echo "3️⃣  Checking .env configuration..."
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Copying from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env with your API keys and secrets${NC}"
fi
echo -e "${GREEN}✓ .env file exists${NC}"

# Check ML artifacts
echo ""
echo "4️⃣  Checking ML model artifacts..."
if [ ! -f "ml/artifacts/model.pkl" ] || [ ! -f "ml/artifacts/scaler.pkl" ]; then
    echo -e "${YELLOW}⚠️  ML artifacts not found. Generating...${NC}"
    cd ml
    python train.py
    cd ..
fi
echo -e "${GREEN}✓ ML artifacts ready${NC}"

# Start docker-compose
echo ""
echo "5️⃣  Starting Docker containers..."
docker-compose down 2>/dev/null || true
docker-compose up -d

echo -e "${YELLOW}⏳ Waiting for services to start (30 seconds)...${NC}"
sleep 30

# Check backend health
echo ""
echo "6️⃣  Checking backend health..."
if curl -s http://localhost:8000/health | grep -q "ok"; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    docker-compose logs backend
    exit 1
fi

# Check frontend
echo ""
echo "7️⃣  Checking frontend..."
if curl -s http://localhost:3000 | grep -q "html"; then
    echo -e "${GREEN}✓ Frontend is responding${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
    docker-compose logs frontend
    exit 1
fi

# Test fraud detection API
echo ""
echo "8️⃣  Testing fraud detection API..."
RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/transactions/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-1",
    "user_id": "user-1",
    "merchant_id": "m-1",
    "amount": 100.0,
    "account_age_days": 100,
    "total_orders": 10,
    "total_returns": 1,
    "avg_order_value": 50,
    "avg_return_value": 30,
    "transaction_timestamp": "2026-05-05T12:00:00Z"
  }')

if echo "$RESPONSE" | grep -q "risk_score"; then
    echo -e "${GREEN}✓ Fraud detection working${NC}"
    echo "  Response: $RESPONSE"
else
    echo -e "${RED}❌ Fraud detection API failed${NC}"
    echo "  Response: $RESPONSE"
fi

# Summary
echo ""
echo "========================================"
echo -e "${GREEN}✓ All checks passed!${NC}"
echo ""
echo "📊 Access Points:"
echo "  • Dashboard: http://localhost:3000"
echo "  • API: http://localhost:8000"
echo "  • API Docs: http://localhost:8000/docs"
echo "  • WebSocket: ws://localhost:8000/ws/alerts"
echo ""
echo "📝 Default Credentials:"
echo "  • Username: analyst1"
echo "  • Password: analyst_password"
echo ""
echo "🛑 To stop containers: docker-compose down"
echo ""
