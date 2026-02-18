from fastapi import APIRouter, HTTPException, Depends
import stripe
import os
from database import database
from routers.auth.auth_utils import get_current_user
from schemas import CheckoutRequest

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter()

@router.post("/create-checkout-session")
async def create_checkout_session(body: CheckoutRequest, current_user: dict = Depends(get_current_user)):
    user = await database.fetch_one("SELECT * FROM users WHERE id = :id", values={"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    product = await database.fetch_one("SELECT * FROM products WHERE stripe_price_id = :price_id", values={"price_id": body.price_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    session = stripe.checkout.Session.create(
        line_items=[{"price": product["stripe_price_id"], "quantity": 1}],
        mode="subscription",
        success_url="http://localhost:3000/success",
        cancel_url="http://localhost:3000/cancel",
        customer_email=user["email"],
    )

    return {"url": session.url}