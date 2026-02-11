from fastapi import APIRouter, HTTPException, Depends, Cookie
from fastapi import Response
from fastapi.responses import JSONResponse
from passlib.context import CryptContext
from database import database
from routers.auth.auth_utils import create_access_token, get_current_user
import uuid
from schemas import UserCreate, UserLogin
import json
from uuid import uuid4
import asyncio

DUMMY_PASSWORD_HASH = (
    "$2b$12$C6UzMDM.H6dfI/f/IKcEeO9u9wZK0s8AjtKoa6HgMHqmpYyqn1cG."
)

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

@router.post("/signup")
async def signup(user: UserCreate):
    query = "SELECT * FROM users WHERE username = :username"
    existing_user = await database.fetch_one(query=query, values={"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username taken, try another.")
    # Check if email exists
    query = "SELECT * FROM users WHERE email = :email"
    existing_email = await database.fetch_one(query=query, values={"email": user.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pw = hash_password(user.password)
    insert_query = """
    INSERT INTO users (id, username, email, password, created_at)
    VALUES (:id, :username, :email, :password, NOW())
    """
    await database.execute(
        query=insert_query,
        values={
            "id": str(uuid.uuid4()),
            "username": user.username,
            "email": user.email,
            "password": hashed_pw,
        }
    )
    return {"message": "User created successfully"}



@router.post("/login")
async def login(user: UserLogin, response: Response):

    query = "SELECT id, password FROM users WHERE username = :username"

    db_user = await database.fetch_one(query=query, values={"username": user.username})
    
    password_hash = (
    db_user["password"]
    if db_user is not None
    else DUMMY_PASSWORD_HASH
    )

    password_ok = verify_password(user.password, password_hash)


    if not password_ok or db_user is None:
        raise HTTPException(400, "Username or Password Incorrect")
    
    access_token = create_access_token(str(db_user["id"]))

    # Set JWT as HttpOnly cookie
    resp = JSONResponse(content={"message": "Login successful", "token": access_token})
    resp.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        max_age=60 * 60 * 24 * 7,
        expires=60 * 60 * 24 * 7,
        path="/",
        secure=True,  # Set True in production with HTTPS
        samesite="lax",
    )


    return resp

@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    query = "SELECT username FROM users WHERE id = :id"
    db_user = await database.fetch_one(query=query, values={"id": current_user["id"]})

    return {
        "username": db_user["username"]
    }

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token") 
    return {"message": "Logged out successfully"}


@router.get("/hi")
async def hi():
    return {"message": "Auth router is working!"}