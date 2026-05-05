from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.auth.jwt_handler import (
    create_access_token,
    create_refresh_token,
    TokenResponse,
)
from jose import jwt, JWTError
import os

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# Mock user database - replace with real authentication
USERS = {
    "analyst1": {"password": "analyst_password", "role": "analyst"},
    "admin1": {"password": "admin_password", "role": "admin"},
}

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """
    Login endpoint - returns access token and refresh token.
    In production, validate credentials against a real database.
    """
    user = USERS.get(request.username)
    if not user or user["password"] != request.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    access_token = create_access_token(request.username, user["role"])
    refresh_token = create_refresh_token(request.username, user["role"])
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: RefreshTokenRequest):
    """
    Refresh access token using refresh token.
    """
    try:
        payload = jwt.decode(
            request.refresh_token,
            os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production"),
            algorithms=["HS256"]
        )
        user_id = payload.get("sub")
        role = payload.get("role")
        token_type = payload.get("type")
        
        if token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        access_token = create_access_token(user_id, role)
        new_refresh_token = create_refresh_token(user_id, role)
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

@router.post("/logout")
async def logout():
    """
    Logout endpoint - client should discard tokens.
    In production, add tokens to a blacklist.
    """
    return {"message": "Logged out successfully"}
