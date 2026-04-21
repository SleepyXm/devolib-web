from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
from jose import JWTError, jwt
import os, resend
from cryptography.fernet import Fernet


SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 240))


GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")


DEV_SERVER = os.getenv("DEV_SERVER")
DEV_SERVER_BACKEND = os.getenv("DEV_SERVER_BACKEND")
RESEND_API_KEY = resend.api_key = os.getenv("RESEND_API_KEY")

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
