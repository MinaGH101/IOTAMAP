from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# User Manager (Pages 48-53)
class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str
    password_try: str
    nickname: str
    rule_id: str
    time_expiration: str
    mobile: str

class UserUpdate(BaseModel):
    id: str
    rule_id: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    nickname: Optional[str] = None
    mobile: Optional[str] = None
    features: Optional[str] = None
    time_expiration: Optional[str] = None

class UserDelete(BaseModel):
    id: str

class UserPasswordUpdate(BaseModel):
    id: str
    password: str

class UserStatusUpdate(BaseModel):
    id: str
    state: str

# Project Manager (Pages 40-42)
class ProjectCreate(BaseModel):
    name: str
    team_id: str
    owner_id: str 

class ProjectUpdate(BaseModel):
    id: str
    team_id: Optional[str] = None
    name: Optional[str] = None
    status: Optional[str] = None

class ProjectDelete(BaseModel):
    id: str

class ProjectOut(BaseModel):
    id: str
    name: str
    team_id: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True