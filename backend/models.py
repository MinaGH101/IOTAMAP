from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from database import Base
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    nickname = Column(String)
    rule_id = Column(String)
    time_expiration = Column(String, default="0")
    mobile = Column(String)
    state = Column(String, default="active")
    features = Column(Text, nullable=True)
    
    projects = relationship("GISProject", back_populates="owner")

class GISProject(Base):
    __tablename__ = "gis_projects"
    

    id = Column(String, primary_key=True, index=True) # The project_id (12 hex chars)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    team_id = Column(String, index=True, nullable=False) 
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="true") 
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="projects")
    layers = relationship("GISLayer", back_populates="project", cascade="all, delete-orphan")

class GISLayer(Base):
    __tablename__ = "gis_layers"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(12), ForeignKey("gis_projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    layer_type = Column(String, nullable=False)
    geometry_type = Column(String, nullable=True)
    source_filename = Column(String, nullable=True)
    crs = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("GISProject", back_populates="layers")

class GISFeature(Base):
    __tablename__ = "gis_features"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("gis_projects.id"), index=True, nullable=False)
    layer_id = Column(Integer, ForeignKey("gis_layers.id"), index=True, nullable=False)
    feature_key = Column(String, index=True, nullable=True)
    geom = Column(Geometry("GEOMETRY", srid=4326), nullable=False)
    properties = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())