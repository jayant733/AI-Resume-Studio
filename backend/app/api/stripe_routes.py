from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import stripe

from app.db.session import get_db
from app.db.tables import User
from app.utils.config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/create-checkout-session")
def create_checkout_session(email: str, target_tier: str, db: Session = Depends(get_db)):
    settings = get_settings()
    stripe.api_key = settings.stripe_api_key

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    price_map = {
        "pro": settings.stripe_price_pro,
        "premium": settings.stripe_price_premium
    }
    price_id = price_map.get(target_tier)
    if not price_id:
        raise HTTPException(status_code=400, detail="Invalid tier.")

    try:
        if settings.stripe_api_key == "sk_test_mock":
            return {"url": f"http://localhost:3000/pricing?mock_success=true&tier={target_tier}&email={email}"}

        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"{settings.backend_cors_origins}/dashboard?success=true&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.backend_cors_origins}/pricing?canceled=true",
            customer_email=user.email,
            metadata={"user_id": user.id, "tier": target_tier}
        )
        return {"url": session.url}
    except Exception as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    settings = get_settings()
    stripe.api_key = settings.stripe_api_key
    webhook_secret = settings.stripe_webhook_secret

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception as e:
        logger.warning(f"Webhook signature verification failed: {e}")
        # Allow mock testing bypass
        if settings.stripe_api_key == "sk_test_mock":
            import json
            event = {"type": "checkout.session.completed", "data": {"object": json.loads(payload)}}
        else:
            raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        tier = session.get("metadata", {}).get("tier")
        customer_id = session.get("customer")

        if user_id and tier:
            user = db.query(User).filter(User.id == int(user_id)).first()
            if user:
                user.stripe_customer_id = customer_id
                user.subscription_tier = tier
                db.commit()
                logger.info(f"Upgraded user {user.id} to {tier}")

    return {"status": "success"}

@router.post("/mock-upgrade")
def mock_upgrade(email: str, tier: str, db: Session = Depends(get_db)):
    """Only for local testing since we don't have real webhooks setup yet."""
    settings = get_settings()
    if settings.stripe_api_key != "sk_test_mock":
        raise HTTPException(status_code=403, detail="Mock endpoints disabled in production.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, full_name="Mock User", subscription_tier=tier)
        db.add(user)
    else:
        user.subscription_tier = tier
    db.commit()
    return {"status": "Mock upgraded", "tier": tier}
