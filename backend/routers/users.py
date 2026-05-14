from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import crud, schemas, database, models

router = APIRouter(prefix="/api/v1", tags=["User Manager"])

@router.post("/authorization")
def login(request: schemas.LoginRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == request.username).first()
    if not user or user.password != request.password:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    return {"status": "success", "user_id": user.id}

@router.get("/users")
def read_users(db: Session = Depends(database.get_db)):
    return crud.get_users(db)

@router.post("/user")
def create_new_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    return crud.create_user(db=db, user=user)


# Page 51: ویرایش کاربر (Edit User)
@router.patch("/user")
def update_user(user_data: schemas.UserUpdate, db: Session = Depends(database.get_db)):
    db_user = crud.get_user(db, user_id=user_data.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Iterate through provided fields and update the database model
    update_data = user_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        if key != "id": # ID should not be updated
            setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return {"status": "success"}

# Page 52: ویرایش رمز کاربر (Edit User Password)
@router.patch("/user/password")
def update_password(request: schemas.UserPasswordUpdate, db: Session = Depends(database.get_db)):
    db_user = crud.get_user(db, user_id=request.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.password = request.password
    db.commit()
    return {"status": "success"}

# Page 53: مسدود یا غیر مسدود سازی کاربر (Block/Unblock User)
# Note: The path in the PDF includes a trailing slash
@router.patch("/user/status/")
def update_status(request: schemas.UserStatusUpdate, db: Session = Depends(database.get_db)):
    db_user = crud.get_user(db, user_id=request.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.state = request.state # PDF expects "active" or "deactive"
    db.commit()
    return {"status": "success"}