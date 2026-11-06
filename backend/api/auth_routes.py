import uuid
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
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


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = "Trader"


class UserProfileResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: Optional[str] = "trader"
    is_active: bool = True


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileResponse


def _seed_default_admin_if_empty(db: Session) -> Optional[UserModel]:
    """
    If the database has no registered users, automatically seed a default admin
    account so the platform is immediately accessible on first run.
    """
    try:
        user_count = db.query(UserModel).count()
        if user_count == 0:
            default_email = "admin@houseoftraders.io"
            default_pass = "admin123"
            admin = UserModel(
                id=f"usr-{uuid.uuid4().hex[:8]}",
                email=default_email,
                name="Admin Trader",
                hashed_password=get_password_hash(default_pass),
                role="admin",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            logger.info("Auto-seeded initial admin user in database: %s", default_email)
            return admin
    except Exception as exc:
        logger.warning("Could not auto-seed admin user: %s", exc)
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

    # Check for empty database and seed if needed
    _seed_default_admin_if_empty(db)

    # Find user by email or username
    user = (
        db.query(UserModel)
        .filter(UserModel.email.ilike(email_clean))
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please check your email and password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact support.",
        )

    if not verify_password(plain_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please check your email and password.",
        )

    # Create JWT Access Token
    token_payload = {
        "sub": user.id,
        "email": user.email,
        "name": user.name or "Trader",
        "role": user.role or "trader",
    }
    token = create_access_token(token_payload)

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=UserProfileResponse(
            id=user.id,
            email=user.email,
            name=user.name or "Trader",
            role=user.role or "trader",
            is_active=user.is_active,
        ),
    )


@router.post("/register", response_model=LoginResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    plain_password = payload.password.strip()

    if not email_clean or len(email_clean) < 4 or "@" not in email_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid email address is required.",
        )

    if len(plain_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long.",
        )

    # Check if user already exists
    existing = (
        db.query(UserModel)
        .filter(UserModel.email.ilike(email_clean))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in instead.",
        )

    # First user gets admin role, subsequent users get trader role
    is_first = db.query(UserModel).count() == 0
    role = "admin" if is_first else "trader"

    new_user = UserModel(
        id=f"usr-{uuid.uuid4().hex[:8]}",
        email=email_clean,
        name=(payload.name or "Trader").strip(),
        hashed_password=get_password_hash(plain_password),
        role=role,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token_payload = {
        "sub": new_user.id,
        "email": new_user.email,
        "name": new_user.name,
        "role": new_user.role,
    }
    token = create_access_token(token_payload)

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=UserProfileResponse(
            id=new_user.id,
            email=new_user.email,
            name=new_user.name,
            role=new_user.role,
            is_active=new_user.is_active,
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
            detail="Missing or expired authorization token.",
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
        name=user.name or "Trader",
        role=user.role or "trader",
        is_active=user.is_active,
    )


@router.post("/logout")
def logout():
    return {"success": True, "message": "Logged out successfully."}
