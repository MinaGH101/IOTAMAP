from sqlalchemy.orm import Session
from . import models, schemas
import uuid

def get_user(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.id == user_id).first() [cite: 3396, 3403]

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all() [cite: 3376]

def create_user(db: Session, user: schemas.UserCreate):
    # Generating a hex string ID to match the PDF example "10265a320528"
    db_user = models.User(
        id=uuid.uuid4().hex[:12], 
        username=user.username,
        password=user.password, # Note: Hash this in production
        nickname=user.nickname,
        rule_id=user.rule_id,
        time_expiration=user.time_expiration,
        mobile=user.mobile,
        state="active"
    ) [cite: 3411, 3426]
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user