// src/components/Map/MapUtils.ts
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import type { Feature } from "ol";
import { type MapFilter, type GISLayer } from "./types";

const hatchCache = new Map<string, CanvasPattern>();

export function hexToRgba(hex: string, alpha: number = 0.35) {
  const cleanHex = String(hex || "#4A71FC").replace("#", "");
  const n = parseInt(cleanHex, 16);
  if (Number.isNaN(n)) return `rgba(74, 113, 252, ${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// این تابع برای رنگ‌آمیزی نقاط بر اساس فیلتر است
export const pointStyle = (color: string) => new Style({
  image: new CircleStyle({ 
    radius: 6, 
    fill: new Fill({ color: color }), 
    stroke: new Stroke({ color: '#fff', width: 2 }) 
  })
});

export const normalPointStyle = new Style({
  image: new CircleStyle({ 
    radius: 6, 
    fill: new Fill({ color: "#4A71FC" }), 
    stroke: new Stroke({ color: "#fff", width: 2 }) 
  }),
});

export const normalPolygonStyle = new Style({
  fill: new Fill({ color: "rgba(74,113,252, .18)" }),
  stroke: new Stroke({ color: "#4A71FC", width: 2 }),
});

export const hiddenStyle = new Style({});

export const normType = (value: string | undefined) => 
  String(value || "").toLowerCase().includes("polygon") ? "پلیگون" : "نقاط";

export const layerLabel = (layer: GISLayer | undefined) => 
  String(layer?.name || layer?.title || layer?.layer_name || `لایه ${layer?.id || ""}`).trim();

export const fRef = (index: number) => `F${index + 1}`;

// تابع ساخت عبارت پیش‌فرض (F1 AND F2 AND ...)
export function defaultExpression(filters: MapFilter[]) {
  return filters.map((_, index) => fRef(index)).join(" AND ");
}

export function passes(feature: Feature, filter: MapFilter) {
  if (filter.active === false || !filter.field || filter.value === "") return true;
  const raw = feature.get(filter.field);
  if (raw == null) return false;
  const rawText = String(raw).trim().toLowerCase();
  const targetText = String(filter.value).trim().toLowerCase();
  const rawNum = parseFloat(String(raw));
  const targetNum = parseFloat(String(filter.value));
  const isNumeric = !isNaN(rawNum) && !isNaN(targetNum);

  switch (filter.operator) {
    case "=": return isNumeric ? rawNum === targetNum : rawText === targetText;
    case ">=": return isNumeric ? rawNum >= targetNum : false;
    case ">":  return isNumeric ? rawNum > targetNum : false;
    case "<=": return isNumeric ? rawNum <= targetNum : false;
    case "<":  return isNumeric ? rawNum < targetNum : false;
    default: return true;
  }
}

export function evaluateExpression(expression: string, filters: MapFilter[], feature: Feature, layerId: string) {
    const layerFilters = filters.filter(f => String(f.layerId) === String(layerId));
    if (!layerFilters.length) return true;
    const byRef = Object.fromEntries(filters.map((f, i) => [`F${i + 1}`, f]));
    const tokens = String(expression || defaultExpression(filters))
      .replace(/\(/g, " ( ").replace(/\)/g, " ) ").trim().split(/\s+/).filter(Boolean).map(t => t.toUpperCase());
    let i = 0;
    const primary: () => boolean = () => {
      const token = tokens[i++];
      if (!token) return false;
      if (token === "(") { const val = or(); if (tokens[i] === ")") i++; return val; }
      if (/^F\d+$/.test(token)) {
        const f = byRef[token];
        if (!f || String(f.layerId) !== String(layerId)) return true;
        return passes(feature, f);
      }
      return false;
    };
    const and = () => { let val = primary(); while (tokens[i] === "AND") { i++; val = val && primary(); } return val; };
    const or = () => { let val = and(); while (tokens[i] === "OR") { i++; val = val || and(); } return val; };
    try { return or(); } catch { return true; }
}

export function filterLabel(filter: MapFilter, layersById: Record<string, GISLayer> = {}, refIndex: number | null = null) {
  const ref = refIndex ? `F${refIndex} · ` : "";
  const layer = layersById[String(filter.layerId)];
  const prefix = layer ? `${layerLabel(layer)}: ` : "";
  if (!filter.field || filter.value === "") return `${ref}${prefix}فیلتر ناتمام`;
  return `${ref}${prefix}${filter.field} ${filter.operator} ${filter.value}`;
}

export function polygonStyle(color: string) {
  return new Style({
    fill: new Fill({ color: hexToRgba(color, 0.35) }),
    stroke: new Stroke({ color: color, width: 2.5 }),
  });
}