from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
from pathlib import Path
import pandas as pd
import math
import shutil
import uuid

from database import engine, Base, get_db
import models
from models import GISLayer, GISFeature
from gis_processing import extract_zip, find_shapefiles, read_arcmap_excel, read_shapefile, clean_properties

from sqlalchemy.orm import Session
from geoalchemy2.shape import from_shape
from geoalchemy2.functions import ST_AsGeoJSON
from routers import users, projects

app = FastAPI()

# Database initialization
Base.metadata.create_all(bind=engine)

BASE_DIR = Path(__file__).resolve().parent
MAP_DIR = BASE_DIR / "data" / "map"

# Register Routers strictly following MapYar API paths
app.include_router(users.router)
app.include_router(projects.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def clean_value(value):
    if pd.isna(value):
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def clean_dict(row_dict):
    return {key: clean_value(value) for key, value in row_dict.items()}


@app.get("/")
def root():
    return {"message": "Geo map backend is running"}


@app.get("/api/map/points")
def get_points():
    with open(MAP_DIR / "geochem_points_with_ranks.geojson", encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/map/polygons")
def get_polygons():
    with open(MAP_DIR / "qom_polygons.geojson", encoding="utf-8") as f:
        polygons = json.load(f)

    ranks_df = pd.read_excel(MAP_DIR / "qom_sediment_arcmap.xlsx")
    ranks_df["Id"] = ranks_df["Id"].astype(str)

    ranks_by_id = {
        str(row["Id"]): clean_dict(row.to_dict())
        for _, row in ranks_df.iterrows()
    }

    for feature in polygons["features"]:
        props = feature.get("properties", {})
        polygon_id = str(props.get("Id"))

        rank_props = ranks_by_id.get(polygon_id)

        if rank_props:
            props.update(rank_props)

        feature["properties"] = props

    return polygons


@app.get("/api/map/heavy-minerals")
def get_heavy_minerals():
    with open(MAP_DIR / "heavy_mineral_samples.geojson", encoding="utf-8") as f:
        return json.load(f)


@app.post("/api/projects/{project_id}/gis/upload")
async def upload_gis_files(
    project_id: str,
    shapefiles_zip: UploadFile = File(...),
    ranks_excel: UploadFile = File(...),
    join_field: str = Form("Id"),
    db: Session = Depends(get_db),
):
    # Check if project exists to satisfy foreign key constraints
    project = db.query(models.GISProject).filter(models.GISProject.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=404, 
            detail=f"Project ID {project_id} does not exist. Please create the project first."
        )

    upload_id = str(uuid.uuid4())
    upload_dir = BASE_DIR / "uploads" / project_id / upload_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    zip_path = upload_dir / shapefiles_zip.filename
    excel_path = upload_dir / ranks_excel.filename

    with open(zip_path, "wb") as buffer:
        shutil.copyfileobj(shapefiles_zip.file, buffer)

    with open(excel_path, "wb") as buffer:
        shutil.copyfileobj(ranks_excel.file, buffer)

    extract_dir = upload_dir / "extracted"
    extract_zip(zip_path, extract_dir)

    shapefile_paths = find_shapefiles(extract_dir)
    ranks_df = read_arcmap_excel(excel_path)

    if join_field in ranks_df.columns:
        ranks_df[join_field] = ranks_df[join_field].astype(str)
        ranks_by_id = {
            str(row[join_field]): row.to_dict()
            for _, row in ranks_df.iterrows()
        }
    else:
        ranks_by_id = {}

    imported_layers = []

    for shp_path in shapefile_paths:
        gdf, layer_type = read_shapefile(shp_path)

        if layer_type not in ["point", "polygon"]:
            continue

        layer = GISLayer(
            project_id=project_id,
            name=shp_path.stem,
            layer_type=layer_type,
            geometry_type=", ".join(sorted(gdf.geometry.geom_type.dropna().unique())),
            source_filename=shp_path.name,
            crs="EPSG:4326",
        )

        db.add(layer)
        db.flush()

        feature_count = 0

        for _, row in gdf.iterrows():
            properties = row.drop(labels=["geometry"]).to_dict()

            feature_key = None
            if join_field in properties:
                feature_key = str(properties[join_field])

            if feature_key and feature_key in ranks_by_id:
                properties.update(ranks_by_id[feature_key])

            properties = clean_properties(properties)

            feature = GISFeature(
                project_id=project_id,
                layer_id=layer.id,
                feature_key=feature_key,
                geom=from_shape(row.geometry, srid=4326),
                properties=properties,
            )

            db.add(feature)
            feature_count += 1

        imported_layers.append(
            {
                "layer_id": layer.id,
                "name": layer.name,
                "type": layer.layer_type,
                "features": feature_count,
            }
        )

    db.commit()

    return {
        "status": "success",
        "message": "GIS files imported successfully",
        "project_id": project_id,
        "layers": imported_layers,
    }


@app.get("/api/projects/{project_id}/gis/layers")
def get_project_layers(project_id: str, db: Session = Depends(get_db)):
    layers = (
        db.query(GISLayer)
        .filter(GISLayer.project_id == project_id)
        .order_by(GISLayer.id)
        .all()
    )

    return [
        {
            "id": layer.id,
            "name": layer.name,
            "layer_type": layer.layer_type,
            "geometry_type": layer.geometry_type,
            "source_filename": layer.source_filename,
            "crs": layer.crs,
        }
        for layer in layers
    ]


@app.get("/api/projects/{project_id}/gis/layers/{layer_id}/features")
def get_layer_features(
    project_id: str,
    layer_id: int,
    db: Session = Depends(get_db),
):
    features = (
        db.query(
            GISFeature.id,
            GISFeature.properties,
            ST_AsGeoJSON(GISFeature.geom).label("geometry"),
        )
        .filter(GISFeature.project_id == project_id)
        .filter(GISFeature.layer_id == layer_id)
        .all()
    )

    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "id": feature.id,
                "geometry": json.loads(feature.geometry),
                "properties": feature.properties,
            }
            for feature in features
        ],
    }