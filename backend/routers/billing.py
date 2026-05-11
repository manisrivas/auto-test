import base64
import os

from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

import stripe

from ..db.database import get_db
from ..models.user import Plan, User
from ..routers.auth import get_current_user
from ..services.usage import MONTHLY_LIMITS, get_monthly_usage

router = APIRouter()

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
_ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY", "")

_PLAN_PRICE_IDS: dict[str, str] = {
    Plan.pro: os.environ.get("STRIPE_PRO_PRICE_ID", ""),
    Plan.enterprise: os.environ.get("STRIPE_ENTERPRISE_PRICE_ID", ""),
}


class UpgradeRequest(BaseModel):
    plan: str


class EnterpriseKeyRequest(BaseModel):
    api_key: str


@router.get("/")
def get_billing(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    usage = get_monthly_usage(db, str(current_user.id))
    limit = MONTHLY_LIMITS.get(current_user.plan, 0)
    return {
        "plan": current_user.plan,
        "ai_calls_used": usage.ai_calls,
        "ai_calls_limit": limit,
        "tests_generated": usage.tests_generated,
    }


@router.post("/upgrade")
def upgrade_plan(
    body: UpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if body.plan not in (Plan.pro, Plan.enterprise):
        raise HTTPException(status_code=400, detail="Invalid plan")

    price_id = _PLAN_PRICE_IDS.get(body.plan)
    if not price_id:
        raise HTTPException(status_code=500, detail="Plan price not configured")

    session = stripe.checkout.Session.create(
        customer_email=current_user.email,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url="https://autotest.dev/dashboard?upgraded=true",
        cancel_url="https://autotest.dev/dashboard/settings/plan",
        metadata={"user_id": str(current_user.id), "plan": body.plan},
    )
    return {"checkout_url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)) -> dict:
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig, _WEBHOOK_SECRET)
    except (stripe.SignatureVerificationError, Exception):
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        _handle_checkout_complete(db, event["data"]["object"])

    return {"received": True}


@router.post("/enterprise-key")
def set_enterprise_key(
    body: EnterpriseKeyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if current_user.plan != Plan.enterprise:
        raise HTTPException(status_code=403, detail="Enterprise plan required")
    if not _ENCRYPTION_KEY:
        raise HTTPException(status_code=500, detail="Encryption not configured")

    fernet = Fernet(_ENCRYPTION_KEY.encode())
    encrypted = fernet.encrypt(body.api_key.encode()).decode()

    current_user.enterprise_api_key_encrypted = encrypted
    db.commit()
    return {"detail": "API key saved"}


def _handle_checkout_complete(db: Session, session: dict) -> None:
    user_id = session.get("metadata", {}).get("user_id")
    new_plan = session.get("metadata", {}).get("plan")
    if not user_id or not new_plan:
        return

    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.plan = new_plan
        user.stripe_customer_id = session.get("customer")
        db.commit()
