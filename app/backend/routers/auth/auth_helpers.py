from database import database
import httpx, uuid, resend, os, hashlib, base64
from fastapi import Response
from fastapi.responses import RedirectResponse
from utils.config import GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, DEV_SERVER, DEV_SERVER_BACKEND
from utils.auth import create_access_token, set_auth_cookie
from utils.crypto import encrypt


async def exchange_github_code(client: httpx.AsyncClient, code: str, code_verifier: str) -> tuple[str | None, dict, str | None]:
    token_res = await client.post(
        "https://github.com/login/oauth/access_token",
        json={
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "code": code,
            "code_verifier": code_verifier
        },
        headers={"Accept": "application/json"}
    )
    token = token_res.json().get("access_token")
    if not token:
        return None, {}, None

    user_res = await client.get("https://api.github.com/user",
                                headers={"Authorization": f"Bearer {token}"})
    email_res = await client.get("https://api.github.com/user/emails",
                                 headers={"Authorization": f"Bearer {token}"})

    github_user = user_res.json()
    primary_email = next(
        (e["email"] for e in email_res.json() if e["primary"] and e["verified"]),
        None
    )
    return token, github_user, primary_email


def generate_pkce_pair():
    code_verifier = base64.urlsafe_b64encode(os.urandom(32)).rstrip(b"=").decode()
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).rstrip(b"=").decode()
    return code_verifier, code_challenge


async def find_or_link_github_user(github_id: str, github_username: str, primary_email: str | None, access_token: str) -> str:
    encrypted_token = encrypt(access_token)

    # Already linked — update token in case it changed
    existing = await database.fetch_one(
        "SELECT id FROM users WHERE github_id = :github_id",
        values={"github_id": github_id}
    )
    if existing:
        await database.execute(
            "UPDATE users SET github_access_token = :token WHERE id = :id",
            values={"token": encrypted_token, "id": str(existing["id"])}
        )
        return str(existing["id"])

    # Email matches — link it and store token
    if primary_email:
        email_match = await database.fetch_one(
            "SELECT id FROM users WHERE email = :email",
            values={"email": primary_email}
        )
        if email_match:
            await database.execute(
                "UPDATE users SET github_id = :github_id, github_access_token = :token WHERE id = :id",
                values={"github_id": github_id, "token": encrypted_token, "id": str(email_match["id"])}
            )
            return str(email_match["id"])

    # New user
    new_id = str(uuid.uuid4())
    await database.execute(
        "INSERT INTO users (id, username, email, github_id, github_access_token, created_at) VALUES (:id, :username, :email, :github_id, :token, NOW())",
        values={"id": new_id, "username": github_username, "email": primary_email, "github_id": github_id, "token": encrypted_token}
    )
    return new_id




def auth_redirect(user_id: str) -> Response:
    token = create_access_token(user_id)
    resp = RedirectResponse(f"{DEV_SERVER}/login/callback")
    return set_auth_cookie(resp, token)



async def send_verification_email(email: str, token: str):
    verification_url = f"{DEV_SERVER_BACKEND}/auth/verify?token={token}"
    resend.Emails.send({
        "from": "team@devolib.com",
        "to": email,
        "subject": "Verify your email",
        "html": f"""
            <h2>Welcome!</h2>
            <p>Click the link below to verify your email:</p>
            <a href="{verification_url}">Verify Email</a>
            <p>This link expires in 24 hours.</p>
        """
    })