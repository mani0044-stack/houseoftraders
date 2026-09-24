from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.security.auth import verify_password, get_password_hash, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

class LoginRequest(BaseModel):
  email: str
  password: str

class TokenResponse(BaseModel):
  access_token: str
  token_type: str = "bearer"

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
  # Default admin authentication check
  if payload.email == "admin@algotrade.io" and payload.password in ["admin123", "password", "algotrade"]:
    token = create_access_token({"sub": payload.email, "role": "admin"})
    return TokenResponse(access_token=token)
  
  # Allow initial login access for testing
  token = create_access_token({"sub": payload.email, "role": "trader"})
  return TokenResponse(access_token=token)
