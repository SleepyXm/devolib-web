from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routers.auth import auth
from routers.projects import projects, images, container
from routers.payments import payment
from routers.products import products
from routers.llm import llm
from database import database
import os
from dotenv import load_dotenv
from helpers.scheduler import scheduler
from helpers.limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

load_dotenv()

app = FastAPI()

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("DEV_SERVER"), os.getenv("FRONT-END-PROD"), ""],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "PATCH", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(projects.router, prefix="/projects", tags=["projects"])
app.include_router(container.router, prefix="/container", tags=["container"])
app.include_router(images.router, prefix="/images", tags=["images"])
app.include_router(payment.router, prefix="/payment", tags="payment")
app.include_router(products.router, prefix="/products", tags="products")
app.include_router(llm.router, prefix="/llm", tags="llm")


@app.get("/")
async def root():
    return {"message": "Welcome to your API"}

@app.middleware("http")
async def track_activity(request: Request, call_next):
    response = await call_next(request)
    project_id = request.path_params.get("project_id")
    if project_id:
        await database.execute(
            "UPDATE projects SET last_online = NOW() WHERE project_id = :project_id",
            {"project_id": project_id}
        )
    return response

@app.on_event("startup")
async def startup():
    await database.connect()
    scheduler.start()


@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


@app.get("/hi")
async def hi():
    return {"message": "Auth router is working!"}