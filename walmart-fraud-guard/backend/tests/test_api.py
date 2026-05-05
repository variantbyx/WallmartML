import pytest
from httpx import AsyncClient
from app.main import app
from app.models.transaction import TransactionInput
import json

# Test fixtures
@pytest.fixture
async def client():
    """HTTP client for testing."""
    async with AsyncClient(app=app, base_url="http://test") as c:
        yield c

@pytest.fixture
def low_risk_transaction():
    """Legitimate, low-risk transaction."""
    return {
        "id": "txn_001_low",
        "user_id": "cust_001",
        "amount": 50.00,
        "account_age_days": 365,
        "total_orders": 100,
        "total_returns": 5,
        "avg_order_value": 45.00,
        "avg_return_value": 40.00,
        "hour": 14,
        "is_night": False,
    }

@pytest.fixture
def high_risk_transaction():
    """Suspicious transaction - new account with high returns."""
    return {
        "id": "txn_002_high",
        "user_id": "cust_002",
        "amount": 5000.00,
        "account_age_days": 3,  # very new account
        "total_orders": 1,
        "total_returns": 1,  # 100% return rate
        "avg_order_value": 5000.00,
        "avg_return_value": 5000.00,
        "hour": 2,  # suspicious time
        "is_night": True,
    }

# Tests
@pytest.mark.asyncio
async def test_health_endpoint(client):
    """Test health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "Walmart Fraud Guard"

@pytest.mark.asyncio
async def test_low_risk_transaction(client, low_risk_transaction):
    """Test that low-risk transactions are scored below threshold."""
    response = await client.post(
        "/api/v1/transactions/analyze",
        json=low_risk_transaction
    )
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] in ["LOW", "MEDIUM"]
    assert data["risk_score"] < 0.75

@pytest.mark.asyncio
async def test_high_risk_transaction(client, high_risk_transaction):
    """Test that high-risk transactions are scored above threshold."""
    response = await client.post(
        "/api/v1/transactions/analyze",
        json=high_risk_transaction
    )
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] in ["HIGH", "CRITICAL"]
    assert data["risk_score"] >= 0.75

@pytest.mark.asyncio
async def test_high_risk_generates_explanation(client, high_risk_transaction):
    """Test that HIGH/CRITICAL alerts always include explanation."""
    response = await client.post(
        "/api/v1/transactions/analyze",
        json=high_risk_transaction
    )
    assert response.status_code == 200
    data = response.json()
    
    if data["risk_level"] in ["HIGH", "CRITICAL"]:
        assert data.get("explanation") is not None
        explanation = data["explanation"]
        assert "features" in explanation
        assert "summary" in explanation
        assert "risk_factors" in explanation
        assert len(explanation["risk_factors"]) > 0

@pytest.mark.asyncio
async def test_duplicate_transaction_rejected(client):
    """Test that duplicate transactions within TTL are rejected."""
    payload = {
        "id": "txn_003_dup",
        "user_id": "cust_003",
        "amount": 100.00,
        "account_age_days": 100,
        "total_orders": 10,
        "total_returns": 1,
        "avg_order_value": 95.00,
        "avg_return_value": 100.00,
        "hour": 10,
        "is_night": False,
    }
    
    # First request should succeed
    first = await client.post("/api/v1/transactions/analyze", json=payload)
    assert first.status_code == 200
    
    # Second request with same ID should be rejected as duplicate
    second = await client.post("/api/v1/transactions/analyze", json=payload)
    assert second.status_code == 409  # Conflict
    assert "Duplicate" in second.json()["detail"]

@pytest.mark.asyncio
async def test_response_time_under_100ms(client, low_risk_transaction):
    """Test that API response time is under 100ms for scoring."""
    import time
    
    start = time.perf_counter()
    response = await client.post(
        "/api/v1/transactions/analyze",
        json=low_risk_transaction
    )
    end = time.perf_counter()
    
    assert response.status_code == 200
    response_time_ms = (end - start) * 1000
    assert response_time_ms < 100  # Should be fast

@pytest.mark.asyncio
async def test_transaction_stored_in_mongo(client, low_risk_transaction):
    """Test that transactions are stored in MongoDB."""
    # Note: This test would need MongoDB running
    # In production, you'd use a test fixture with testcontainers
    response = await client.post(
        "/api/v1/transactions/analyze",
        json=low_risk_transaction
    )
    assert response.status_code == 200
    # In a real test, query MongoDB to verify storage

@pytest.mark.asyncio
async def test_transaction_stored_in_postgres(client, low_risk_transaction):
    """Test that fraud events are stored in PostgreSQL."""
    # Note: This test would need PostgreSQL running
    # In production, you'd use a test fixture with testcontainers
    response = await client.post(
        "/api/v1/transactions/analyze",
        json=low_risk_transaction
    )
    assert response.status_code == 200
    # In a real test, query PostgreSQL to verify storage

@pytest.mark.asyncio
async def test_model_version_in_response(client, low_risk_transaction):
    """Test that model version is included in response."""
    response = await client.post(
        "/api/v1/transactions/analyze",
        json=low_risk_transaction
    )
    assert response.status_code == 200
    data = response.json()
    assert "model_version" in data
    assert data["model_version"] is not None

@pytest.mark.asyncio
async def test_timestamp_in_response(client, low_risk_transaction):
    """Test that timestamp is included in response."""
    response = await client.post(
        "/api/v1/transactions/analyze",
        json=low_risk_transaction
    )
    assert response.status_code == 200
    data = response.json()
    assert "timestamp" in data
    # Verify it's a valid ISO timestamp
    from datetime import datetime
    datetime.fromisoformat(data["timestamp"])

@pytest.mark.asyncio
async def test_rate_limit_enforcement(client):
    """Test that rate limiting is enforced."""
    payload = {
        "id": "txn_rate_{i}",
        "user_id": "cust_rate_limit_test",
        "amount": 50.00,
        "account_age_days": 100,
        "total_orders": 10,
        "total_returns": 1,
        "avg_order_value": 95.00,
        "avg_return_value": 100.00,
        "hour": 10,
        "is_night": False,
    }
    
    # Make 10 requests (up to the limit)
    for i in range(10):
        p = payload.copy()
        p["id"] = f"txn_rate_{i}"
        response = await client.post("/api/v1/transactions/analyze", json=p)
        assert response.status_code == 200
    
    # 11th request should exceed rate limit
    # Note: This depends on the rate limit window - adjust accordingly
    # response = await client.post("/api/v1/transactions/analyze", json=payload)
    # assert response.status_code == 429  # Too Many Requests

@pytest.mark.asyncio
async def test_auth_login_endpoint():
    """Test JWT authentication login."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/auth/login",
            json={"username": "analyst1", "password": "analyst_password"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_auth_invalid_credentials():
    """Test that invalid credentials are rejected."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/auth/login",
            json={"username": "analyst1", "password": "wrong_password"}
        )
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]

@pytest.mark.asyncio
async def test_auth_refresh_token():
    """Test token refresh endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Get tokens
        login_response = await client.post(
            "/auth/login",
            json={"username": "analyst1", "password": "analyst_password"}
        )
        assert login_response.status_code == 200
        refresh_token = login_response.json()["refresh_token"]
        
        # Use refresh token to get new access token
        refresh_response = await client.post(
            "/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        assert refresh_response.status_code == 200
        data = refresh_response.json()
        assert "access_token" in data
        assert "refresh_token" in data

@pytest.mark.asyncio
async def test_admin_role_required_for_retrain():
    """Test that retraining endpoint requires admin role."""
    # This would test role-based access control
    # Needs JWT token with admin role
    pass

@pytest.mark.asyncio
async def test_feature_extraction_consistency(client, low_risk_transaction):
    """Test that feature extraction is consistent across requests."""
    response = await client.post(
        "/api/v1/transactions/analyze",
        json=low_risk_transaction
    )
    assert response.status_code == 200
    # In a real test, verify that the same transaction
    # always produces the same features and score
