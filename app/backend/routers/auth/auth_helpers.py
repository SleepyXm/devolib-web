from database import database
import httpx, uuid
from fastapi import Response
from fastapi.responses import RedirectResponse
from routers.auth.auth_utils import create_access_token, set_auth_cookie, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, DEV_SERVER



async def exchange_github_code(client: httpx.AsyncClient, code: str) -> tuple[str | None, dict, str | None]:
    token_res = await client.post(
        "https://github.com/login/oauth/access_token",
        json={"client_id": GITHUB_CLIENT_ID, "client_secret": GITHUB_CLIENT_SECRET, "code": code},
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


async def find_or_link_github_user(github_id: str, github_username: str, primary_email: str | None) -> str:
    # Already linked
    existing = await database.fetch_one(
        "SELECT id FROM users WHERE github_id = :github_id",
        values={"github_id": github_id}
    )
    if existing:
        return str(existing["id"])

    # Email matches — link it
    if primary_email:
        email_match = await database.fetch_one(
            "SELECT id FROM users WHERE email = :email",
            values={"email": primary_email}
        )
        if email_match:
            await database.execute(
                "UPDATE users SET github_id = :github_id WHERE id = :id",
                values={"github_id": github_id, "id": str(email_match["id"])}
            )
            return str(email_match["id"])

    # New user
    new_id = str(uuid.uuid4())
    await database.execute(
        "INSERT INTO users (id, username, email, github_id, created_at) VALUES (:id, :username, :email, :github_id, NOW())",
        values={"id": new_id, "username": github_username, "email": primary_email, "github_id": github_id}
    )
    return new_id

def auth_redirect(user_id: str) -> Response:
    token = create_access_token(user_id)
    resp = RedirectResponse(f"{DEV_SERVER}/dashboard")
    return set_auth_cookie(resp, token)