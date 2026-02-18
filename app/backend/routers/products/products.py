from fastapi import APIRouter
from database import database

router = APIRouter()

@router.get("/products")
async def get_products():
    products = await database.fetch_all("SELECT * FROM products")
    return {"products": products}