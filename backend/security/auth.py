import os
import json
import time
import hmac
import hashlib
import secrets
import base64
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.config import settings

logger = logging.getLogger(__name__)

security_bearer = HTTPBearer(auto_error=False)

# =====================================================================
# Password Hashing (PBKDF2-SHA256 with Salt & Constant-Time Compare)
# =====================================================================
def get_password_hash(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with a unique random salt."""
    if not password:
        return ""
    salt = secrets.token_hex(16)
    iterations = 100000
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    ).hex()
    return f"pbkdf2:sha256:{iterations}${salt}${derived}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password."""
    if not plain_password or not hashed_password:
        return False

    if hashed_password.startswith("pbkdf2:sha256:"):
        try:
            parts = hashed_password.split("$")
            if len(parts) != 3:
                return False
            iter_part = parts[0].split(":")[-1]
            iterations = int(iter_part) if iter_part.isdigit() else 100000
            salt = parts[1]
            expected_key = parts[2]
            key = hashlib.pbkdf2_hmac(
                "sha256",
                plain_password.encode("utf-8"),
                salt.encode("utf-8"),
                iterations,
            ).hex()
            return secrets.compare_digest(key, expected_key)
        except Exception as e:
            logger.error(f"Error in PBKDF2 verify: {e}")
            return False

    # Optional bcrypt support if hash was stored with bcrypt
    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        if hashed_password.startswith("$2") or hashed_password.startswith("$argon2"):
            return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        pass

    # Safe comparison fallback for legacy seeds if any
    return secrets.compare_digest(plain_password, hashed_password)


# =====================================================================
# JWT Generation & Cryptographic Verification (HMAC-SHA256)
# =====================================================================
def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64url_decode(s: str) -> bytes:
    pad = len(s) % 4
    if pad:
        s += "=" * (4 - pad)
    return base64.urlsafe_b64decode(s)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create signed HMAC-SHA256 JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire_timestamp = int((datetime.utcnow() + expires_delta).timestamp())
    else:
        expire_minutes = getattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 1440) # Default 24 hours
        expire_timestamp = int((datetime.utcnow() + timedelta(minutes=expire_minutes)).timestamp())

    to_encode.update({"exp": expire_timestamp, "iat": int(time.time())})

    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode("utf-8"))
    payload = _b64url_encode(json.dumps(to_encode, default=str).encode("utf-8"))
    signing_input = f"{header}.{payload}"

    secret = (getattr(settings, "SECRET_KEY", "") or "house_of_traders_secret_key_prod").encode("utf-8")
    signature = _b64url_encode(hmac.new(secret, signing_input.encode("utf-8"), hashlib.sha256).digest())

    return f"{signing_input}.{signature}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify signature and expiration of JWT access token."""
    if not token or not isinstance(token, str):
        return None

    # Handle optional 'Bearer ' prefix
    if token.lower().startswith("bearer "):
        token = token[7:].strip()

    parts = token.split(".")
    if len(parts) != 3:
        return None

    signing_input = f"{parts[0]}.{parts[1]}"
    secret = (getattr(settings, "SECRET_KEY", "") or "house_of_traders_secret_key_prod").encode("utf-8")
    expected_sig = _b64url_encode(hmac.new(secret, signing_input.encode("utf-8"), hashlib.sha256).digest())

    if not secrets.compare_digest(parts[2], expected_sig):
        logger.warning("JWT signature mismatch")
        return None

    try:
        payload_bytes = _b64url_decode(parts[1])
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception as e:
        logger.warning(f"Failed decoding JWT payload: {e}")
        return None

    # Check expiration
    exp = payload.get("exp")
    if exp and int(exp) < int(time.time()):
        logger.info("JWT token has expired")
        return None

    return payload


def get_current_user_payload(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> Optional[Dict[str, Any]]:
    """Dependency that extracts the validated token payload."""
    if not credentials or not credentials.credentials:
        return None
    return decode_access_token(credentials.credentials)
