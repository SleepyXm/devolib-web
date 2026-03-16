from pydantic import BaseModel, ValidationError, field_validator
from datetime import datetime
from typing import Optional, Any, Dict, List
from uuid import UUID

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    twofa: Optional[str] = None

    @field_validator('email')
    def email_must_contain_symbol(cls, v):
        if '@' not in v:
            raise ValueError('must contain @ symbol')
        return v
        


class UserLogin(BaseModel):
    username: str
    password: str
    twofa_code: Optional[str] = None


class UserOut(BaseModel):
    id: str
    username: str
    email: str
    password: str
    created_at: datetime

    class Config:
        from_attributes = True

class ProjectCreate(BaseModel):
    user_id: str
    name: str

class CheckoutRequest(BaseModel):
    price_id: str
    
class Project(BaseModel):
    project_id: str
    project_name: str
    websocket: str
    created_at: datetime
    last_online: str
    status: str
    serviceStatus: list[Dict[str, Any]]
