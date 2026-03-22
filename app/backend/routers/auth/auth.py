from fastapi import APIRouter, HTTPException, Depends, Cookie, Request
from fastapi import Response
from fastapi.responses import JSONResponse, RedirectResponse
from database import database
from routers.auth.auth_utils import create_access_token, get_current_user, hash_password, verify_password, GITHUB_CLIENT_SECRET, GITHUB_CLIENT_ID, DEV_SERVER, DUMMY_PASSWORD_HASH, set_auth_cookie
from routers.auth.auth_helpers import exchange_github_code, find_or_link_github_user, auth_redirect
import uuid, httpx, os
from schemas import UserCreate, UserLogin
from helpers.limiter import limiter



router = APIRouter()

@router.post("/signup")
@limiter.limit("5/minute")
async def signup(request: Request, user: UserCreate):
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
@limiter.limit("5/minute")
async def login(request: Request, user: UserLogin):
    db_user = await database.fetch_one(
        "SELECT id, password FROM users WHERE username = :username",
        values={"username": user.username}
    )

    password_hash = db_user["password"] if db_user is not None else DUMMY_PASSWORD_HASH
    password_ok = verify_password(user.password, password_hash)

    if not password_ok or db_user is None:
        raise HTTPException(400, "Username or Password Incorrect")

    token = create_access_token(str(db_user["id"]))
    resp = JSONResponse(content={"message": "Login successful", "token": token})
    return set_auth_cookie(resp, token)



@router.get("/github")
def github_login():
    return RedirectResponse(
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}&scope=user:email"
    )



@router.get("/github/callback")
async def github_callback(code: str):
    async with httpx.AsyncClient() as client:
        token, github_user, primary_email = await exchange_github_code(client, code)

    if not token:
        return RedirectResponse(f"{DEV_SERVER}/login?error=oauth_failed")

    user_id = await find_or_link_github_user(
        github_id=str(github_user["id"]),
        github_username=github_user["login"],
        primary_email=primary_email
    )
    return auth_redirect(user_id)



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