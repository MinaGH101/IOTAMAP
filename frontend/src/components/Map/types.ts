import type VectorLayer from "ol/layer/Vector.js";
import type VectorSource from "ol/source/Vector.js";

export interface GISLayer {
  id: string | number;
  name?: string;
  title?: string;
  layer_name?: string;
  layer_type?: string;
  type?: string;
  geometry_type?: string;
}

export interface MapFilter {
  id: string;
  active: boolean;
  layerId: string;
  layerType: 'points' | 'polygons';
  field: string;
  operator: string;
  value: string | number;
  color: string;
  priority: number;
  collapsed: boolean;
  refIndex?: number;
}

export interface PanelPosition {
  x: number;
  y: number;
}

export interface PanelVisibility {
  layers: boolean;
  filters: boolean;
  legend: boolean;
}

export interface LayerRefs {
  [key: string]: VectorLayer<VectorSource>;
}

export interface SourceRefs {
  [key: string]: {
    source: VectorSource;
    type: 'points' | 'polygons';
  };
}


// src/components/Map/types.ts
export interface MapFilter {
  id: string;
  active: boolean;
  layerId: string;
  layerType: 'points' | 'polygons';
  field: string;
  operator: string;
  value: string|number;
  color: string;
  priority: number;
  collapsed: boolean;
  // فیلدهای جدید برای منطق
  logic?: 'AND' | 'OR'; 
  linked?: boolean;
}


