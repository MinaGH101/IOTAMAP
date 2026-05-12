import Style from "ol/style/Style.js";
import Fill from "ol/style/Fill.js";
import Stroke from "ol/style/Stroke.js";
import CircleStyle from "ol/style/Circle.js";
import { type MapFilter, type GISLayer } from "./types.js";
import type { Feature } from "ol";

const hatchCache = new Map<string, CanvasPattern>();

export const normalPointStyle = new Style({
  image: new CircleStyle({ 
    radius: 6, 
    fill: new Fill({ color: "#4A71FC" }), 
    stroke: new Stroke({ color: "#fff", width: 2 }) 
  }),
});

export const normalPolygonStyle = new Style({
  fill: new Fill({ color: "rgba(74,113,252,.18)" }),
  stroke: new Stroke({ color: "#4A71FC", width: 2 }),
});

export const hiddenStyle = new Style({});

export const normType = (value: string | undefined) => 
  String(value || "").toLowerCase().includes("polygon") ? "پلیگون" : "نقاط";

export const layerLabel = (layer: GISLayer | undefined) => 
  String(layer?.name || layer?.title || layer?.layer_name || `لایه ${layer?.id || ""}`).trim();

export const fRef = (index: number) => `F${index + 1}`;

export const hasOr = (expr: string) => /\bOR\b/i.test(String(expr || ""));

export function hexToRgba(hex: string, alpha: number = 0.35) {
  const cleanHex = String(hex || "#4A71FC").replace("#", "");
  const n = parseInt(cleanHex, 16);
  
  if (Number.isNaN(n)) return `rgba(74,113,252,${alpha})`;
  
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  
  return `rgba(${r},${g},${b},${alpha})`;
}

export function hatch(color: string) {
  const key = String(color || "#F59E0B").toLowerCase();
  if (hatchCache.has(key)) return hatchCache.get(key)!;

  const canvas = document.createElement("canvas");
  canvas.width = 12; canvas.height = 12;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = hexToRgba(color, 0.18);
  ctx.fillRect(0, 0, 12, 12);
  ctx.strokeStyle = hexToRgba(color, 0.88);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  
  const coords: Array<[number, number, number, number]> = [
    [-2, 12, 12, -2],
    [0, 14, 14, 0],
    [-2, 0, 12, 14],
    [0, -2, 14, 12]
  ];

  coords.forEach((c) => { 
    ctx.moveTo(c[0], c[1]); 
    ctx.lineTo(c[2], c[3]); 
  });
  
  ctx.stroke();

  const pattern = ctx.createPattern(canvas, "repeat")!;
  hatchCache.set(key, pattern);
  return pattern;
}

export function polygonStyle(color: string, crosshatch = false) {
  return new Style({
    fill: new Fill({ color: crosshatch ? hatch(color) : hexToRgba(color, 0.35) }),
    stroke: new Stroke({ color, width: 2 }),
  });
}

export function isComplete(filter: MapFilter) {
  return Boolean(filter?.active !== false && filter?.layerId && filter?.field && filter?.value !== "");
}

export function passes(feature: Feature, filter: MapFilter) {
  if (!isComplete(filter)) return true;
  const raw = feature.get(filter.field);
  if (raw == null) return false;

  const rawText = String(raw).trim();
  const targetText = String(filter.value).trim();
  const rawNum = Number(raw);
  const targetNum = Number(filter.value);
  const numeric = !Number.isNaN(rawNum) && !Number.isNaN(targetNum);

  if (filter.operator === "=") return numeric ? rawNum === targetNum : rawText === targetText;
  if (!numeric) return false;
  return filter.operator === ">=" ? rawNum >= targetNum :
    filter.operator === ">" ? rawNum > targetNum :
    filter.operator === "<=" ? rawNum <= targetNum :
    filter.operator === "<" ? rawNum < targetNum : true;
}

export function defaultExpression(filters: MapFilter[]) {
  return filters.map((_, index) => `F${index + 1}`).join(" AND ");
}

export function evaluateExpression(expression: string, filters: MapFilter[], feature: Feature, layerId: string) {
    const active = filters.filter(isComplete);
    if (!active.length) return true;
  
    const byRef = Object.fromEntries(active.map((f, i) => [`F${i + 1}`, f]));
    const tokens = String(expression || defaultExpression(active))
      .replace(/\(/g, " ( ").replace(/\)/g, " ) ").trim().split(/\s+/).filter(Boolean).map(t => t.toUpperCase());
  
    let i = 0;
    const primary: () => boolean = () => {
      const token = tokens[i++];
      if (!token) return false;
      if (token === "(") { const val = or(); if (tokens[i] === ")") i++; return val; }
      if (/^F\d+$/.test(token)) {
        const f = byRef[token];
        return Boolean(f && String(f.layerId) === String(layerId) && passes(feature, f));
      }
      return false;
    };
    const and = () => { let val = primary(); while (tokens[i] === "AND") { i++; val = val && primary(); } return val; };
    const or = () => { let val = and(); while (tokens[i] === "OR") { i++; val = val || and(); } return val; };
  
    try { return or(); }
    catch { return active.filter(f => String(f.layerId) === String(layerId)).every(f => passes(feature, f)); }
}

export function filterLabel(filter: MapFilter, layersById: Record<string, GISLayer> = {}, refIndex: number | null = null) {
  const ref = refIndex ? `F${refIndex} · ` : "";
  const layer = layersById[String(filter.layerId)];
  const prefix = layer ? `${layerLabel(layer)}: ` : "";
  
  if (!filter.field || filter.value === "") return `${ref}${prefix}فیلتر ناتمام`;
  
  const priority = filter.layerType === "polygons" ? ` | اولویت ${filter.priority || 1}` : "";
  return `${ref}${prefix}${filter.field} ${filter.operator} ${filter.value}${priority}`;
}