import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func

from ..db.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    stripe_subscription_id = Column(String, unique=True)
    status = Column(String)  # active | canceled | past_due
    current_period_end = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UsageRecord(Base):
    __tablename__ = "usage_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    month = Column(String, nullable=False)  # "2024-01"
    tests_generated = Column(Integer, default=0)
    ai_calls = Column(Integer, default=0)
