import os
import uuid
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.database.models import UserModel
from backend.security.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user_payload,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class UserProfileResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: Optional[str] = "admin"
    is_active: bool = True


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileResponse


def _seed_admin_if_empty(db: Session) -> Optional[UserModel]:
    """
    Ensure at least one authorized administrator exists in the database.
    Can be configured via ADMIN_EMAIL / ADMIN_PASSWORD environment variables.
    """
    try:
        user_count = db.query(UserModel).count()
        if user_count == 0:
            admin_email = (
                os.getenv("ADMIN_EMAIL", "").strip().lower() or "admin@houseoftraders.io"
            )
            admin_pass = os.getenv("ADMIN_PASSWORD", "").strip() or "admin123"

            admin = UserModel(
                id=f"usr-{uuid.uuid4().hex[:8]}",
                email=admin_email,
                name="Administrator",
                hashed_password=get_password_hash(admin_pass),
                role="admin",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            logger.info("Initialized system admin account in database.")
            return admin
    except Exception as exc:
        logger.warning("Could not initialize admin account: %s", exc)
        db.rollback()
    return None


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    plain_password = payload.password.strip()

    if not email_clean or not plain_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required.",
        )

    # Ensure admin exists if database was just initialized
    _seed_admin_if_empty(db)

    # Look up user by email in database
    user = (
        db.query(UserModel)
        .filter(UserModel.email.ilike(email_clean))
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Access denied.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled.",
        )

    if not verify_password(plain_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Access denied.",
        )

    token_payload = {
        "sub": user.id,
        "email": user.email,
        "name": user.name or "Administrator",
        "role": user.role or "admin",
    }
    token = create_access_token(token_payload)

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=UserProfileResponse(
            id=user.id,
            email=user.email,
            name=user.name or "Administrator",
            role=user.role or "admin",
            is_active=user.is_active,
        ),
    )


@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile(
    payload: Optional[dict] = Depends(get_current_user_payload),
    db: Session = Depends(get_db),
):
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or expired session token.",
        )

    user_id = payload.get("sub")
    email = payload.get("email")

    user = None
    if user_id:
        user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user and email:
        user = db.query(UserModel).filter(UserModel.email.ilike(email)).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return UserProfileResponse(
        id=user.id,
        email=user.email,
        name=user.name or "Administrator",
        role=user.role or "admin",
        is_active=user.is_active,
    )


@router.post("/logout")
def logout():
    return {"success": True, "message": "Logged out successfully."}
