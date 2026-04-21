import os
from dotenv import load_dotenv
import resend

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 240))


GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")


DEV_SERVER = os.getenv("DEV_SERVER")
DEV_SERVER_BACKEND = os.getenv("DEV_SERVER_BACKEND")
RESEND_API_KEY = resend.api_key = os.getenv("RESEND_API_KEY")