from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Request, HTTPException, status
from database import database
from fastapi.responses import JSONResponse
import os
from passlib.context import CryptContext

from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 240))

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
DEV_SERVER = os.getenv("DEV_SERVER")

DUMMY_PASSWORD_HASH = (
    "$2b$12$C6UzMDM.H6dfI/f/IKcEeO9u9wZK0s8AjtKoa6HgMHqmpYyqn1cG."
)




def create_access_token(username: str):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": username, "exp": expire}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


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

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def set_auth_cookie(resp: JSONResponse, token: str) -> JSONResponse:
    resp.set_cookie(
        key="access_token",
        value=f"Bearer {token}",
        httponly=True,
        max_age=60 * 60 * 24 * 7,
        expires=60 * 60 * 24 * 7,
        path="/",
        secure=True,
        samesite="lax",
    )
    return resp