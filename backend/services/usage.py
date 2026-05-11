from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from models.billing import UsageRecord
from models.user import Plan

MONTHLY_LIMITS: dict[str, int] = {
    Plan.free: 50,
    Plan.pro: 500,
    Plan.enterprise: 10_000,
}


def get_monthly_usage(db: Session, user_id: str) -> UsageRecord:
    """Return or create the usage record for the current month."""
    month = datetime.utcnow().strftime("%Y-%m")
    record = (
        db.query(UsageRecord)
        .filter(UsageRecord.user_id == user_id, UsageRecord.month == month)
        .first()
    )
    if record is None:
        record = UsageRecord(user_id=user_id, month=month, tests_generated=0, ai_calls=0)
        db.add(record)
        db.commit()
        db.refresh(record)
    return record


def increment_usage(db: Session, user_id: str, tests_count: int) -> None:
    """Increment ai_calls and tests_generated for the current month."""
    record = get_monthly_usage(db, user_id)
    record.ai_calls += 1
    record.tests_generated += tests_count
    db.commit()
