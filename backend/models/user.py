import uuid
from enum import Enum as PyEnum

from sqlalchemy import Column, DateTime, String, Text, func

from db.database import Base


class Plan(str, PyEnum):
    free = "free"
    pro = "pro"
    enterprise = "enterprise"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=True)
    plan = Column(String, nullable=False, default=Plan.free)
    stripe_customer_id = Column(String, nullable=True)
    enterprise_api_key_encrypted = Column(Text, nullable=True)
    github_access_token = Column(Text, nullable=True)
    github_username = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
