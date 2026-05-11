from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas, database
import uuid
from typing import List

router = APIRouter(prefix="/api/v1", tags=["Project Manager"])

@router.get("/projects", response_model=List[schemas.ProjectOut])
def get_projects(team_id: str = "1", db: Session = Depends(database.get_db)):
    return db.query(models.GISProject).filter(models.GISProject.team_id == team_id).all()

@router.get("/project", response_model=schemas.ProjectOut)
def get_project(project_id: str, db: Session = Depends(database.get_db)):
    project = db.query(models.GISProject).filter(models.GISProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.post("/project", response_model=schemas.ProjectOut)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(database.get_db)):
    # Generate 12-char hex project_id
    project_id = uuid.uuid4().hex[:12]
    
    db_project = models.GISProject(
        id=project_id,
        name=project.name,
        team_id=project.team_id,
        owner_id=project.owner_id,
        status="true"
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@router.patch("/project")
def update_project(project_data: schemas.ProjectUpdate, db: Session = Depends(database.get_db)):
    db_project = db.query(models.GISProject).filter(models.GISProject.id == project_data.id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        if key != "id":
            setattr(db_project, key, value)
    
    db.commit()
    return {"status": "success"}

@router.delete("/project")
def delete_project(request: schemas.ProjectDelete, db: Session = Depends(database.get_db)):
    db_project = db.query(models.GISProject).filter(models.GISProject.id == request.id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(db_project)
    db.commit()
    return {"status": "success"}