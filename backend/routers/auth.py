import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt as _bcrypt

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from db.database import get_db
from models.user import User

router = APIRouter()
security = HTTPBearer()


def _hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()


def _verify_password(password: str, hashed: str) -> bool:
    return _bcrypt.checkpw(password.encode(), hashed.encode())

_JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-prod")
_ALGORITHM = "HS256"
_TOKEN_EXPIRE_DAYS = 30


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    email: str
    plan: str


class MeResponse(BaseModel):
    email: str
    plan: str
    github_username: str | None = None
    github_connected: bool = False


def _create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": user_id, "exp": expire}, _JWT_SECRET, algorithm=_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency — decode JWT and return the User row."""
    from sqlalchemy import text as _text
    token = credentials.credentials
    try:
        payload = jwt.decode(token, _JWT_SECRET, algorithms=[_ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    # Use raw SQL to avoid failures when optional columns don't exist yet
    try:
        row = db.execute(
            _text("SELECT id, email, plan, github_access_token, github_username FROM users WHERE id = :id"),
            {"id": user_id},
        ).first()
    except Exception:
        # Fallback: query without github columns
        row = db.execute(
            _text("SELECT id, email, plan, NULL as github_access_token, NULL as github_username FROM users WHERE id = :id"),
            {"id": user_id},
        ).first()

    if row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    user = User()
    user.id = row.id
    user.email = row.email
    user.plan = row.plan
    user.github_access_token = row.github_access_token
    user.github_username = row.github_username
    return user


@router.post("/register", response_model=AuthResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email,
        password_hash=_hash_password(body.password),
        plan="free",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthResponse(token=_create_token(str(user.id)), email=user.email, plan=user.plan)


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.query(User).filter(User.email == body.email).first()
    if user is None or not _verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return AuthResponse(token=_create_token(str(user.id)), email=user.email, plan=user.plan)


class GitHubSigninRequest(BaseModel):
    email: EmailStr


@router.post("/github-signin", response_model=AuthResponse)
def github_signin(body: GitHubSigninRequest, db: Session = Depends(get_db)) -> AuthResponse:
    """Find or create a user account for GitHub OAuth sign-in (no password needed)."""
    import secrets as _secrets
    from sqlalchemy import text

    # Use raw SQL selecting only core columns — safe even if github_* columns don't exist yet
    row = db.execute(
        text("SELECT id, email, plan FROM users WHERE email = :email"),
        {"email": str(body.email)},
    ).first()

    if row is None:
        user_id = str(__import__("uuid").uuid4())
        db.execute(
            text("INSERT INTO users (id, email, password_hash, plan) VALUES (:id, :email, :pw, 'free')"),
            {"id": user_id, "email": str(body.email), "pw": _hash_password(_secrets.token_urlsafe(32))},
        )
        db.commit()
        return AuthResponse(token=_create_token(user_id), email=str(body.email), plan="free")

    return AuthResponse(token=_create_token(str(row.id)), email=str(row.email), plan=str(row.plan))


@router.post("/logout")
def logout() -> dict:
    # JWT is stateless — client simply discards the token
    return {"detail": "Logged out"}


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(
        email=current_user.email,
        plan=current_user.plan,
        github_username=current_user.github_username,
        github_connected=bool(current_user.github_access_token),
    )
