from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Request, HTTPException
from database import database
from fastapi.responses import JSONResponse
import os, resend
from cryptography.fernet import Fernet
from dotenv import load_dotenv
from utils.auth import set_auth_cookie, create_access_token, verify_token


DUMMY_PASSWORD_HASH = (
    "$2b$12$C6UzMDM.H6dfI/f/IKcEeO9u9wZK0s8AjtKoa6HgMHqmpYyqn1cG."
)



async def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Missing authentication token")

    if token.startswith("Bearer "):
        token = token[len("Bearer "):]

    user_id = verify_token(token)  # this returns ID
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    query = "SELECT * FROM users WHERE id = :id"
    user = await database.fetch_one(query=query, values={"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user