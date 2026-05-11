from sqlalchemy.orm import Session
import models, schemas
import uuid

def get_user(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.User(
        id=uuid.uuid4().hex[:12], 
        username=user.username,
        password=user.password, 
        nickname=user.nickname,
        rule_id=user.rule_id,
        time_expiration=user.time_expiration,
        mobile=user.mobile,
        state="active"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user