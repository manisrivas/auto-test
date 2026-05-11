from fastapi import Depends, HTTPException, status

from db.database import get_db
from models.user import User
from services.usage import get_monthly_usage, MONTHLY_LIMITS
from routers.auth import get_current_user


def require_usage_within_limit(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
) -> User:
    """Block users who have hit their monthly push limit (all plans go through backend)."""
    usage = get_monthly_usage(db, str(current_user.id))
    limit = MONTHLY_LIMITS.get(current_user.plan, 50)

    if usage.ai_calls >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Monthly limit of {limit} pushes reached. Upgrade at autotest.dev",
        )
    return current_user
