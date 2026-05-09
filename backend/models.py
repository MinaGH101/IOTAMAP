from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from database import Base


class GISLayer(Base):
    __tablename__ = "gis_layers"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    layer_type = Column(String, nullable=False)  # point / polygon
    geometry_type = Column(String, nullable=True)
    source_filename = Column(String, nullable=True)
    crs = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class GISFeature(Base):
    __tablename__ = "gis_features"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, index=True, nullable=False)
    layer_id = Column(Integer, ForeignKey("gis_layers.id"), index=True, nullable=False)
    feature_key = Column(String, index=True, nullable=True)
    geom = Column(Geometry("GEOMETRY", srid=4326), nullable=False)
    properties = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())




class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True) # e.g. "10265a320528"
    username = Column(String, unique=True, index=True)
    password = Column(String)
    nickname = Column(String)
    rule_id = Column(String) # fe673a9f4a2
    time_expiration = Column(String, default="0")
    mobile = Column(String)
    state = Column(String, default="active") # active/deactive
    features = Column(Text, nullable=True)