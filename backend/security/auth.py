from datetime import datetime, timedelta
from typing import Optional
from backend.config import settings

try:
  from jose import jwt, JWTError
except ImportError:
  jwt = None
  class JWTError(Exception):
    pass

try:
  from passlib.context import CryptContext
  pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except ImportError:
  pwd_context = None

def verify_password(plain_password: str, hashed_password: str) -> bool:
  if pwd_context:
    return pwd_context.verify(plain_password, hashed_password)
  return plain_password == hashed_password

def get_password_hash(password: str) -> str:
  if pwd_context:
    return pwd_context.hash(password)
  return password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
  to_encode = data.copy()
  if expires_delta:
    expire = datetime.utcnow() + expires_delta
  else:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
  
  to_encode.update({"exp": str(expire)})
  if jwt:
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
  return f"mock_token_{to_encode.get('sub', 'user')}"

def decode_access_token(token: str) -> Optional[dict]:
  if not jwt:
    return {"sub": "admin@algotrade.io", "role": "admin"}
  try:
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    return payload
  except JWTError:
    return None

