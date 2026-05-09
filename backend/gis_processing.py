from pathlib import Path
import zipfile
import geopandas as gpd
import pandas as pd


def extract_zip(zip_path: Path, extract_dir: Path):
    extract_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(extract_dir)

    return extract_dir


def find_shapefiles(folder: Path):
    return list(folder.rglob("*.shp"))


def read_arcmap_excel(excel_path: Path):
    return pd.read_excel(excel_path)


def detect_layer_type(gdf):
    geom_types = set(gdf.geometry.geom_type.dropna().unique())

    if geom_types.issubset({"Point", "MultiPoint"}):
        return "point"

    if geom_types.issubset({"Polygon", "MultiPolygon"}):
        return "polygon"

    return "other"


def clean_value(value):
    if pd.isna(value):
        return None
    return value


def clean_properties(properties):
    return {
        key: clean_value(value)
        for key, value in properties.items()
    }


def read_shapefile(shp_path: Path):
    gdf = gpd.read_file(shp_path)

    if gdf.crs is None:
        raise ValueError(f"{shp_path.name} has no CRS.")

    gdf = gdf.to_crs(epsg=4326)

    layer_type = detect_layer_type(gdf)

    return gdf, layer_type
