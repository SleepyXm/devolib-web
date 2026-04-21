from fastapi import APIRouter, HTTPException, Depends, Cookie, Request
from fastapi import Response
from fastapi.responses import JSONResponse, RedirectResponse
from database import database
from routers.auth.auth_utils import get_current_user, DUMMY_PASSWORD_HASH
from routers.auth.auth_helpers import exchange_github_code, find_or_link_github_user, auth_redirect, send_verification_email, generate_pkce_pair
from utils.config import GITHUB_CLIENT_ID, DEV_SERVER
from utils.crypto import hash_password, verify_password
from utils.auth import set_auth_cookie, create_access_token
import uuid, httpx, secrets
from schemas import UserCreate, UserLogin
from helpers.limiter import limiter



router = APIRouter()

@router.post("/signup")
@limiter.limit("5/minute")
async def signup(request: Request, user: UserCreate):
    for field, value in [("password", user.password), ("email", user.email), ("username", user.username)]:
        if value is None:
            raise HTTPException(status_code=400, detail=f"{field} can't be empty")
    
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
    verification_token = secrets.token_urlsafe(32)

    insert_query = """
    INSERT INTO users (id, username, email, password, verification_token, verified, created_at)
    VALUES (:id, :username, :email, :password, :verification_token, FALSE, NOW())
    """

    await database.execute(
        query=insert_query,
        values={
            "id": str(uuid.uuid4()),
            "username": user.username,
            "email": user.email,
            "password": hashed_pw,
            "verification_token": verification_token,
        }
    )
    await send_verification_email(user.email, verification_token)
    return {"message": "User created successfully"}


@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, user: UserLogin):
    db_user = await database.fetch_one(
        "SELECT id, password, email, github_id, github_username FROM users WHERE username = :username",
        values={"username": user.username}
    )

    password_hash = db_user["password"] if db_user is not None else DUMMY_PASSWORD_HASH

    if db_user is not None and db_user["password"] is None:
        raise HTTPException(403, "This account uses GitHub login.")

    password_ok = verify_password(user.password, password_hash)

    if not password_ok or db_user is None:
        raise HTTPException(400, "Username or Password Incorrect")

    token = create_access_token(str(db_user["id"]))
    resp = JSONResponse(content={"message": "Login successful", "token": token, "email": db_user["email"], "github_id": db_user["github_id"], "github_username": db_user["github_username"]})
    return set_auth_cookie(resp, token)



@router.get("/github")
def github_login(response: Response):
    code_verifier, code_challenge = generate_pkce_pair()
    redirect = RedirectResponse(
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}&scope=user:email"
        f"&code_challenge={code_challenge}&code_challenge_method=S256"
    )
    redirect.set_cookie("pkce_verifier", code_verifier, httponly=True, secure=True, samesite="lax", max_age=300)
    return redirect



@router.get("/github/callback")
async def github_callback(request: Request, code: str):
    code_verifier = request.cookies.get("pkce_verifier")
    if not code_verifier:
        return RedirectResponse(f"{DEV_SERVER}/login?error=pkce_missing")

    async with httpx.AsyncClient() as client:
        token, github_user, primary_email = await exchange_github_code(client, code, code_verifier)

    if not token:
        return RedirectResponse(f"{DEV_SERVER}/login?error=oauth_failed")

    user_id = await find_or_link_github_user(
        github_id=str(github_user["id"]),
        github_username=github_user["login"],
        primary_email=primary_email,
        access_token=token
    )
    return auth_redirect(user_id)


@router.get("/verify")
async def verify_email(token: str):
    user = await database.fetch_one(
        "SELECT id FROM users WHERE verification_token = :token",
        values={"token": token}
    )
    if not user:
        return RedirectResponse(f"{DEV_SERVER}/login?error=invalid_token")

    await database.execute(
        "UPDATE users SET verified = TRUE, verification_token = NULL WHERE id = :id",
        values={"id": str(user["id"])}
    )
    return RedirectResponse(f"{DEV_SERVER}/login?verified=true")


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    query = "SELECT username, email, github_id, github_username FROM users WHERE id = :id"
    db_user = await database.fetch_one(query=query, values={"id": current_user["id"]})

    return {
        "username": db_user["username"],
        "email": db_user["email"],
        "github_id": db_user["github_id"],
        "github_username": db_user["github_username"]
    }

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token") 
    return {"message": "Logged out successfully"}



@router.get("/hi")
async def hi():
    return {"message": "Auth router is working!"}