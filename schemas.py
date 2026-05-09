from pydantic import BaseModel
from typing import Optional

# Page 48: api/v1/authorization
class LoginRequest(BaseModel):
    username: str
    password: str

# Page 50: api/v1/user (POST)
class UserCreate(BaseModel):
    username: str
    password: str
    password_try: str
    nickname: str
    rule_id: str
    time_expiration: str
    mobile: str


# Page 51: PATCH api/v1/user
class UserUpdate(BaseModel):
    id: str
    rule_id: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    nickname: Optional[str] = None
    mobile: Optional[str] = None
    features: Optional[str] = None
    time_expiration: Optional[str] = None

# Page 52: DELETE api/v1/user
class UserDelete(BaseModel):
    id: str

# Page 52: PATCH api/v1/user/password
class UserPasswordUpdate(BaseModel):
    id: str
    password: str

# Page 53: PATCH api/v1/user/status/
class UserStatusUpdate(BaseModel):
    id: str
    state: str # "active" or "deactive"