from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import crud, schemas, database

router = APIRouter(prefix="/api/v1", tags=["User Manager"])

@router.post("/authorization")
def login(request: schemas.LoginRequest, db: Session = Depends(database.get_db)):
    # Exact path from Page 48 of the API PDF
    user = db.query(models.User).filter(models.User.username == request.username).first()
    if not user or user.password != request.password:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    return {"status": "success", "user_id": user.id} [cite: 3360, 3373]

@router.get("/users")
def read_users(db: Session = Depends(database.get_db)):
    return crud.get_users(db) [cite: 3376]

@router.post("/user")
def create_new_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    return crud.create_user(db=db, user=user) [cite: 3406]


@router.patch("/user")
def update_user(user_data: schemas.UserUpdate, db: Session = Depends(database.get_db)):
    # Exact structure from Page 51
    db_user = crud.get_user(db, user_id=user_data.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    for key, value in user_data.dict(exclude_unset=True).items():
        setattr(db_user, key, value)
    
    db.commit()
    return {"status": "success"}

@router.delete("/user")
def delete_user(request: schemas.UserDelete, db: Session = Depends(database.get_db)):
    # Body-based delete from Page 52
    db_user = crud.get_user(db, user_id=request.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return {"status": "success"}

@router.patch("/user/password")
def update_password(request: schemas.UserPasswordUpdate, db: Session = Depends(database.get_db)):
    # Path from Page 52
    db_user = crud.get_user(db, user_id=request.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.password = request.password
    db.commit()
    return {"status": "success"}

@router.patch("/user/status/")
def update_status(request: schemas.UserStatusUpdate, db: Session = Depends(database.get_db)):
    # Note the trailing slash from Page 53
    db_user = crud.get_user(db, user_id=request.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.state = request.state
    db.commit()
    return {"status": "success"}