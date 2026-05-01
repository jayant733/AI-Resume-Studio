from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import stripe

from app.db.session import get_db
from app.db.tables import User
from app.services.auth_service import get_optional_current_user
from app.utils.config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/prices")
def list_prices():
    """
    Returns active Stripe products + recurring prices (monthly/yearly) for dynamic pricing UI.
    """
    settings = get_settings()
    stripe.api_key = settings.stripe_api_key

    # Local/mock mode: provide stable fake prices without calling Stripe.
    if settings.stripe_api_key == "sk_test_mock":
        return {
            "plans": [
                {
                    "id": "free",
                    "name": "Free",
                    "description": "Everything you need to get started.",
                    "prices": {
                        "month": {"id": "price_free_month", "unit_amount": 0, "currency": "usd", "interval": "month"},
                        "year": {"id": "price_free_year", "unit_amount": 0, "currency": "usd", "interval": "year"},
                    },
                },
                {
                    "id": "pro",
                    "name": "Pro",
                    "description": "Perfect for serious job seekers.",
                    "prices": {
                        "month": {"id": settings.stripe_price_pro, "unit_amount": 1500, "currency": "usd", "interval": "month"},
                        "year": {"id": f"{settings.stripe_price_pro}_year", "unit_amount": 15000, "currency": "usd", "interval": "year"},
                    },
                },
                {
                    "id": "premium",
                    "name": "Premium",
                    "description": "Advanced tools and higher limits.",
                    "prices": {
                        "month": {"id": settings.stripe_price_premium, "unit_amount": 2900, "currency": "usd", "interval": "month"},
                        "year": {"id": f"{settings.stripe_price_premium}_year", "unit_amount": 29000, "currency": "usd", "interval": "year"},
                    },
                },
            ]
        }

    prices = stripe.Price.list(active=True, limit=100, expand=["data.product"]).data
    plans: dict[str, dict] = {}
    for price in prices:
        if getattr(price, "type", None) != "recurring":
            continue
        recurring = getattr(price, "recurring", None)
        if not recurring or getattr(recurring, "interval", None) not in {"month", "year"}:
            continue
        product = getattr(price, "product", None)
        if not product or not getattr(product, "active", False):
            continue

        product_id = product.id
        plan = plans.setdefault(
            product_id,
            {
                "id": product_id,
                "name": product.name,
                "description": getattr(product, "description", None) or "",
                "prices": {},
            },
        )
        plan["prices"][recurring.interval] = {
            "id": price.id,
            "unit_amount": price.unit_amount or 0,
            "currency": price.currency,
            "interval": recurring.interval,
        }

    return {"plans": list(plans.values())}


@router.post("/create-checkout-session")
def create_checkout_session(
    target_tier: str | None = None,
    price_id: str | None = None,
    email: str | None = None,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    stripe.api_key = settings.stripe_api_key

    user = None
    if current_user is not None:
        user = current_user
    elif email:
        user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    price_map = {
        "pro": settings.stripe_price_pro,
        "premium": settings.stripe_price_premium
    }
    if not price_id:
        price_id = price_map.get(target_tier or "")
    if not price_id and (target_tier or "") != "free":
        raise HTTPException(status_code=400, detail="Missing or invalid price selection.")

    try:
        frontend_url = (settings.backend_cors_origins.split(",")[0] or "http://localhost:3000").rstrip("/")
        if settings.stripe_api_key == "sk_test_mock":
            return {"url": f"{frontend_url}/pricing?mock_success=true&tier={target_tier or ''}&email={user.email}"}

        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"{frontend_url}/pricing?status=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/pricing?status=cancel",
            customer_email=user.email,
            metadata={"user_id": user.id, "tier": target_tier or ""}
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
