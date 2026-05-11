import { useEffect, useMemo, useRef, useState } from "react";
import "ol/ol.css";

import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { fromLonLat, toLonLat } from "ol/proj";
import { ScaleLine, defaults as defaultControls } from "ol/control";
import { extend as extendExtent, createEmpty as createEmptyExtent } from "ol/extent";

import Style from "ol/style/Style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import CircleStyle from "ol/style/Circle";



const API_BASE = "http://localhost:8000";
const EXPORT_SCALE = 3;
const PANEL_WIDTH = { layers: 310, filters: 440, legend: 210 };

const ICONS = {
  layers: "M12 3 2 8l10 5 10-5-10-5Zm0 12L4.2 11.1 2 12.2l10 5 10-5-2.2-1.1L12 15Zm0 4L4.2 15.1 2 16.2l10 5 10-5-2.2-1.1L12 19Z",
  filter: "M3 5h18l-7 8v5l-4 2v-7L3 5Z",
  download: "M5 20h14v-2H5v2Zm7-18v11.17l-4.59-4.58L6 10l6 6 6-6-1.41-1.41L13 13.17V2h-1Z",
  crop: "M7 17V3H5v2H3v2h2v10c0 1.1.9 2 2 2h10v2h2v-2h2v-2H7Zm10-2h2V7c0-1.1-.9-2-2-2H9v2h8v8Z",
  visibility: "M12 6.5c3.79 0 6.17 2.13 7.5 5.5-1.33 3.37-3.71 5.5-7.5 5.5S5.83 15.37 4.5 12C5.83 8.63 8.21 6.5 12 6.5Zm0 2A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5Z",
  visibilityOff: "M2.8 4.2 4.2 2.8l17 17-1.4 1.4-3.05-3.05A9.6 9.6 0 0 1 12 19.5c-4.75 0-7.75-2.83-9.5-7.5a11.7 11.7 0 0 1 3.1-4.55L2.8 4.2Zm9.2.3c4.75 0 7.75 2.83 9.5 7.5a11.8 11.8 0 0 1-2.58 4.02l-2.16-2.16A3.5 3.5 0 0 0 12.14 9.24L9.86 6.96A8.2 8.2 0 0 1 12 4.5Z",
  close: "M18.3 5.71 16.89 4.3 12 9.17 7.11 4.3 5.7 5.71 10.59 10.6 5.7 15.49 7.11 16.9 12 12.01l4.89 4.89 1.41-1.41-4.89-4.89 4.89-4.89Z",
  collapse: "M6 11h12v2H6v-2Z",
  expand: "M7 7h10v10H7V7Zm2 2v6h6V9H9Z",
  trash: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12ZM8 4l1-1h6l1 1h4v2H4V4h4Z",
};

const hatchCache = new globalThis.Map();
const normalPointStyle = new Style({
  image: new CircleStyle({ radius: 6, fill: new Fill({ color: "#4A71FC" }), stroke: new Stroke({ color: "#fff", width: 2 }) }),
});
const normalPolygonStyle = new Style({
  fill: new Fill({ color: "rgba(74,113,252,.18)" }),
  stroke: new Stroke({ color: "#4A71FC", width: 2 }),
});
const hiddenStyle = new Style({});




function Icon({ name, size = 18 }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor"><path d={ICONS[name]} /></svg>;
}

function IconButton({ title, icon, onClick, small = false }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} className={`map-icon-button ${small ? "map-icon-button-small" : ""}`.trim()}>
      <Icon name={icon} size={small ? 16 : 18} />
    </button>
  );
}

function Panel({ type, title, pos, width, onDrag, onClose, actions, children }) {
  return (
    <div className="map-control-panel map-filter-panel" style={{ right: pos.x, top: pos.y, width }}>
      <div className="map-filter-header" onPointerDown={(event) => onDrag(event, type)}>
        <div className="map-filter-title">{title}</div>
        <div className="map-filter-actions" onPointerDown={(event) => event.stopPropagation()}>
          {actions}
          <IconButton title={`بستن ${title}`} icon="close" onClick={onClose} />
        </div>
      </div>
      {children}
    </div>
  );
}

const normType = (value) => String(value || "").toLowerCase().includes("polygon") ? "پلیگون" : "نقاط";
const layerLabel = (layer) => String(layer?.name || layer?.title || layer?.layer_name || `لایه ${layer?.id || ""}`).trim();
const fRef = (index) => `F${index + 1}`;
const hasOr = (expr) => /\bOR\b/i.test(String(expr || ""));

function unwrapLayers(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["content", "data", "results", "layers"]) if (Array.isArray(payload?.[key])) return payload[key];
  for (const a of ["content", "data"]) for (const b of ["content", "data", "layers"]) if (Array.isArray(payload?.[a]?.[b])) return payload[a][b];
  return [];
}

function dedupeLayers(payload) {
  const seen = new Set();
  return unwrapLayers(payload).filter((layer) => {
    if (!layer || layer.id == null) return false;
    const key = `${String(layer.layer_type || layer.type || layer.geometry_type).toLowerCase()}::${layerLabel(layer).toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hexToRgba(hex, alpha = 0.35) {
  const n = parseInt(String(hex || "#4A71FC").replace("#", ""), 16);
  if (Number.isNaN(n)) return `rgba(74,113,252,${alpha})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function hatch(color) {
  const key = String(color || "#F59E0B").toLowerCase();
  if (hatchCache.has(key)) return hatchCache.get(key);

  const canvas = document.createElement("canvas");
  canvas.width = 12;
  canvas.height = 12;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = hexToRgba(color, 0.18);
  ctx.fillRect(0, 0, 12, 12);
  ctx.strokeStyle = hexToRgba(color, 0.88);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  [[-2,12,12,-2],[0,14,14,0],[-2,0,12,14],[0,-2,14,12]].forEach(([a,b,c,d]) => { ctx.moveTo(a,b); ctx.lineTo(c,d); });
  ctx.stroke();

  const pattern = ctx.createPattern(canvas, "repeat");
  hatchCache.set(key, pattern);
  return pattern;
}

function polygonStyle(color, crosshatch = false) {
  return new Style({
    fill: new Fill({ color: crosshatch ? hatch(color) : hexToRgba(color, 0.35) }),
    stroke: new Stroke({ color, width: 2 }),
  });
}

function collectFields(features) {
  const fields = new Set();
  features.forEach((feature) => Object.keys(feature.getProperties()).forEach((key) => {
    if (key !== "geometry" && !key.startsWith("_")) fields.add(key);
  }));
  return [...fields].sort();
}

function uniqueValues(source, field) {
  if (!source || !field) return [];
  const values = source.getFeatures()
    .map((feature) => feature.get(field))
    .filter((value) => value !== undefined && value !== null && value !== "")
    .map(String);
  return [...new Set(values)].sort((a, b) => {
    const an = Number(a), bn = Number(b);
    return !Number.isNaN(an) && !Number.isNaN(bn) ? an - bn : a.localeCompare(b);
  });
}

function isComplete(filter) {
  return Boolean(filter?.active !== false && filter?.layerId && filter?.field && filter?.value !== "");
}

function passes(feature, filter) {
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

function defaultExpression(filters) {
  return filters.map((filter) => `F${filter.refIndex}`).join(" AND ");
}

function evaluateExpression(expression, filters, feature, layerId) {
  const active = filters.filter(isComplete);
  if (!active.length) return true;

  const byRef = Object.fromEntries(active.map((filter) => [`F${filter.refIndex}`, filter]));
  const tokens = String(expression || defaultExpression(active))
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.toUpperCase());

  let i = 0;
  const primary = () => {
    const token = tokens[i++];
    if (token === "(") {
      const value = or();
      if (tokens[i] === ")") i += 1;
      return value;
    }
    if (/^F\d+$/.test(token)) {
      const filter = byRef[token];
      return Boolean(filter && String(filter.layerId) === String(layerId) && passes(feature, filter));
    }
    return false;
  };
  const and = () => {
    let value = primary();
    while (tokens[i] === "AND") { i += 1; value = value && primary(); }
    return value;
  };
  const or = () => {
    let value = and();
    while (tokens[i] === "OR") { i += 1; value = value || and(); }
    return value;
  };

  try { return or(); }
  catch { return active.filter((filter) => String(filter.layerId) === String(layerId)).every((filter) => passes(feature, filter)); }
}

function newFilter(layer, fieldsByLayer) {
  const layerId = String(layer.id);
  const typeStr = String(layer.layer_type || "").toLowerCase();
  const isPolygon = typeStr.includes("polygon");
  return {
    id: crypto.randomUUID(),
    active: true,
    layerId,
    layerType: isPolygon ? "polygons" : "points",
    field: fieldsByLayer[layerId]?.[0] || "",
    operator: ">=",
    value: "",
    color: isPolygon ? "#F59E0B" : "#4A71FC",
    priority: 1,
    collapsed: false,
  };
}

function filterLabel(filter, layersById = {}, refIndex = null) {
  const ref = refIndex ? `F${refIndex} · ` : "";
  const layer = layersById[String(filter.layerId)];
  const prefix = layer ? `${layerLabel(layer)}: ` : "";
  if (!filter.field || filter.value === "") return `${ref}${prefix}فیلتر ناتمام`;
  const typeLabel = filter.layerType === "polygons" ? "پلیگون" : "نقاط";
  const priority = filter.layerType === "polygons" ? ` | اولویت ${filter.priority || 1}` : "";
  return `${ref}${prefix}${filter.field} ${filter.operator} ${filter.value}${priority}`;
}

function drawLegendSymbol(ctx, x, y, color, type, scale = 1, crosshatched = false) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * scale;

  if (type === "point") {
    ctx.beginPath();
    ctx.arc(x - 8 * scale, y + 8 * scale, 5 * scale, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.fillStyle = hexToRgba(color, 0.35);
  ctx.fillRect(x - 18 * scale, y + 2 * scale, 18 * scale, 12 * scale);
  ctx.strokeRect(x - 18 * scale, y + 2 * scale, 18 * scale, 12 * scale);

  if (crosshatched) {
    ctx.beginPath();
    ctx.lineWidth = 1 * scale;
    for (let i = -28; i < 10; i += 6) {
      ctx.moveTo(x + i * scale, y + 16 * scale); ctx.lineTo(x + (i + 16) * scale, y);
      ctx.moveTo(x + i * scale, y); ctx.lineTo(x + (i + 16) * scale, y + 16 * scale);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawLegend(ctx, data, position, scale) {
  const rows = [
    ...(data.layerItems.length ? [{ kind: "header", label: "لایه‌ها" }, ...data.layerItems.map((item) => ({ kind: "item", ...item }))] : []),
    ...(data.filterItems.length ? [{ kind: "header", label: "فیلترها" }, ...data.filterItems.map((item) => ({ kind: "item", ...item }))] : []),
    ...(data.showCrosshatchNote ? [{ kind: "note", label: "هاشور = تطبیق با همه" }] : []),
  ];
  if (!rows.length) return;

  const pad = 12 * scale, rowH = 17 * scale, titleH = 22 * scale, w = 190 * scale;
  const x = (window.innerWidth - position.x) * scale, y = position.y * scale, h = titleH + pad + rows.length * rowH + pad;
  const leftX = x - w;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "rgba(10,14,24,.92)";
  ctx.strokeStyle = "rgba(255,255,255,.16)";
  ctx.lineWidth = scale;
  ctx.beginPath();
  ctx.roundRect(leftX, y, w, h, 8 * scale);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = `${11 * scale}px Tahoma, Arial`;
  ctx.textAlign = "right";
  ctx.fillText("راهنمای نقشه", x - pad, y + 18 * scale);

  let cy = y + titleH + pad * 0.65;
  rows.forEach((row) => {
    if (row.kind === "header") {
      ctx.fillStyle = "#9CA3AF";
      ctx.font = `${9 * scale}px Tahoma, Arial`;
      ctx.fillText(row.label, x - pad, cy + 10 * scale);
    } else if (row.kind === "note") {
      drawLegendSymbol(ctx, x - pad, cy, "#F59E0B", "polygon", scale, true);
      ctx.fillStyle = "#D1D5DB";
      ctx.font = `${9 * scale}px Tahoma, Arial`;
      ctx.fillText(row.label, x - pad - 24 * scale, cy + 10 * scale);
    } else {
      drawLegendSymbol(ctx, x - pad, cy, row.color, row.type, scale, false);
      ctx.fillStyle = row.disabled ? "#6B7280" : "#E5E7EB";
      ctx.font = `${9 * scale}px Tahoma, Arial`;
      ctx.fillText(row.label.slice(0, 28), x - pad - 24 * scale, cy + 10 * scale);
    }
    cy += rowH;
  });
  ctx.restore();
}

export default function MapView({ reloadKey = 0 }) {
  // CRITICAL FIX: Extract current project_id from URL
  const queryParams = new URLSearchParams(window.location.search);
  const projectId = queryParams.get("project_id");

  const pageRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerRefs = useRef({});
  const sourceRefs = useRef({});
  const activeFiltersRef = useRef([]);
  const expressionRef = useRef("");
  const panelDragRef = useRef(null);
  const layerDragRef = useRef(null);
  const captureStartRef = useRef(null);

  const [selectedFeature, setSelectedFeature] = useState(null);
  const [show, setShow] = useState({ layers: true, filters: true, legend: true });
  const [pos, setPos] = useState({ layers: { x: 16, y: 64 }, filters: { x: 340, y: 64 }, legend: { x: 16, y: 16 } });

  const [gisLayers, setGisLayers] = useState([]);
  const [draggingLayerId, setDraggingLayerId] = useState(null);
  const [visibleLayers, setVisibleLayers] = useState({});
  const [fieldsByLayer, setFieldsByLayer] = useState({});

  const [filters, setFilters] = useState([]);
  const [filterExpression, setFilterExpression] = useState("");
  const [activeFilters, setActiveFilters] = useState([]);
  const [captureMode, setCaptureMode] = useState(false);
  const [captureRect, setCaptureRect] = useState(null);

  const layersById = useMemo(() => Object.fromEntries(gisLayers.map((layer) => [String(layer.id), layer])), [gisLayers]);
  const filterableLayers = useMemo(() => gisLayers.filter((layer) => {
    const type = String(layer.layer_type || "").toLowerCase();
    return type.includes("point") || type.includes("polygon");
  }), [gisLayers]);
  
  const hasFields = Object.values(fieldsByLayer).some((fields) => fields.length > 0);
  const activeExpression = expressionRef.current || defaultExpression(activeFilters);

  const legendData = useMemo(() => ({
    layerItems: gisLayers.map((layer) => ({
      id: `layer-${layer.id}`,
      label: `${layerLabel(layer)} (${normType(layer.layer_type)})`,
      color: "#4A71FC",
      type: String(layer.layer_type || "").toLowerCase().includes("polygon") ? "polygon" : "point",
      disabled: visibleLayers[layer.id] === false,
    })),
    filterItems: activeFilters.map((filter) => ({
      id: `filter-${filter.id}`,
      label: filterLabel(filter, layersById, filter.refIndex),
      color: filter.layerType === "polygons" ? filter.color || "#F59E0B" : "#4A71FC",
      type: filter.layerType === "polygons" ? "polygon" : "point",
    })),
    showCrosshatchNote: hasOr(activeExpression) && activeFilters.filter((filter) => filter.layerType === "polygons").length > 1,
  }), [gisLayers, visibleLayers, activeFilters, layersById, activeExpression]);

  const [layerOpacities, setLayerOpacities] = useState({});
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const [attributeLayer, setAttributeLayer] = useState(null);
  const [tableSearch, setTableSearch] = useState("");
  const [tablePos, setTablePos] = useState({ x: 20, y: 100 });
  const [tableHeight, setTableHeight] = useState(300);

  const tableData = useMemo(() => {
    if (!attributeLayer || !sourceRefs.current[attributeLayer]) return [];
    const source = sourceRefs.current[attributeLayer].source;
    return source.getFeatures().map(f => {
      const props = { ...f.getProperties() };
      delete props.geometry;
      return props;
    }).filter(row => 
      Object.values(row).some(val => String(val).toLowerCase().includes(tableSearch.toLowerCase()))
    );
  }, [attributeLayer, tableSearch, gisLayers]);

  useEffect(() => {
    const move = (event) => {
      if (!panelDragRef.current) return;
      const rect = pageRef.current?.getBoundingClientRect();
      const target = panelDragRef.current.target;
      const width = rect?.width || window.innerWidth;
      const height = rect?.height || window.innerHeight;
      
      const next = {
        x: Math.max(8, Math.min((rect?.right || width) - event.clientX - panelDragRef.current.offsetX, width - (PANEL_WIDTH[target] || 320) - 8)),
        y: Math.max(8, Math.min(event.clientY - (rect?.top || 0) - panelDragRef.current.offsetY, height - 70)),
      };
      if (target === 'attributeTable') {
        setTablePos(next);
      } else {
        setPos((current) => ({ ...current, [target]: next }));
      }
    };
    const up = () => { panelDragRef.current = null; };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      if (!projectId) return; // Wait for project_id to exist

      if (mapInstanceRef.current) mapInstanceRef.current.setTarget(null);
      if (mapRef.current) mapRef.current.innerHTML = "";

      layerRefs.current = {};
      sourceRefs.current = {};
      activeFiltersRef.current = [];
      expressionRef.current = "";
      setActiveFilters([]);
      setFilters([]);
      setFilterExpression("");
      setFieldsByLayer({});

      // UPDATED: Use dynamic projectId
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/gis/layers`);
      if (cancelled) return;

      const layers = dedupeLayers(await response.json());
      if (cancelled) return;

      setGisLayers(layers);
      setVisibleLayers(Object.fromEntries(layers.map((layer) => [layer.id, true])));

      const vectorLayers = layers.map((layerInfo, index) => {
        const layerId = String(layerInfo.id);
        const typeStr = String(layerInfo.layer_type || "").toLowerCase();
        const layerType = typeStr.includes("polygon") ? "polygons" : "points";
        
        // UPDATED: Use dynamic projectId
        const source = new VectorSource({
          url: `${API_BASE}/api/projects/${projectId}/gis/layers/${layerInfo.id}/features`,
          format: new GeoJSON(),
        });

        const vectorLayer = new VectorLayer({
          source,
          visible: true,
          zIndex: 1000 + layers.length - index,
          style: (feature) => styleFeature(feature, layerId, layerType),
        });

        vectorLayer.setProperties({ layerId, layerName: layerLabel(layerInfo), layerType });

        source.on("featuresloadend", () => {
          if (cancelled) return;
          setFieldsByLayer((current) => ({ ...current, [layerId]: collectFields(source.getFeatures()) }));
          fitToSources();
        });

        layerRefs.current[layerId] = vectorLayer;
        sourceRefs.current[layerId] = { source, type: layerType };
        return vectorLayer;
      });

      const map = new Map({
        target: mapRef.current,
        layers: [new TileLayer({ source: new OSM({ crossOrigin: "anonymous" }), zIndex: 0 }), ...vectorLayers],
        view: new View({ center: fromLonLat([50.9, 34.6]), zoom: 8 }),
        controls: defaultControls().extend([new ScaleLine({ units: 'metric' })]), // Feature: Scale Bar
      });

      // Feature: Coordinate Display
      map.on("pointermove", (event) => {
        const lonLat = toLonLat(event.coordinate);
        setCoords({ x: lonLat[0].toFixed(4), y: lonLat[1].toFixed(4) });
      });

      mapInstanceRef.current = map;

      setTimeout(() => { map.updateSize(); }, 100);

      map.on("singleclick", (event) => {
        if (captureMode) return;
        let found = null;
        map.forEachFeatureAtPixel(event.pixel, (feature) => (found = feature));
        if (!found) return setSelectedFeature(null);
        const props = { ...found.getProperties() };
        delete props.geometry;
        setSelectedFeature(props);
      });
    }

    initializeMap();
    return () => {
      cancelled = true;
      if (mapInstanceRef.current) mapInstanceRef.current.setTarget(null);
      if (mapRef.current) mapRef.current.innerHTML = "";
      layerRefs.current = {};
      sourceRefs.current = {};
    };
  }, [reloadKey, projectId]); // Added projectId dependency

  function styleFeature(feature, layerId, layerType) {
    const active = activeFiltersRef.current;
    const layerFilters = active.filter((filter) => String(filter.layerId) === layerId);
    if (!layerFilters.length) return layerType === "polygons" ? normalPolygonStyle : normalPointStyle;

    if (!evaluateExpression(expressionRef.current, active, feature, layerId)) return hiddenStyle;
    if (layerType !== "polygons") return normalPointStyle;

    const matching = layerFilters
      .filter((filter) => passes(feature, filter))
      .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
    if (!matching.length) return normalPolygonStyle;

    const allPolygonFilters = layerFilters.filter((filter) => filter.layerType === "polygons");
    const matchesAll = allPolygonFilters.length > 1 && allPolygonFilters.every((filter) => passes(feature, filter));
    return polygonStyle(matching[0].color || "#F59E0B", hasOr(expressionRef.current) && matchesAll);
  }

  function fitToSources() {
    const map = mapInstanceRef.current;
    if (!map) return;
    const extent = createEmptyExtent();
    Object.values(sourceRefs.current).forEach(({ source }) => {
      const sourceExtent = source.getExtent();
      if (sourceExtent.every(Number.isFinite)) extendExtent(extent, sourceExtent);
    });
    if (extent.every(Number.isFinite)) map.getView().fit(extent, { padding: [45, 45, 45, 45], maxZoom: 14, duration: 250 });
  }

  const setPanelVisible = (panel, value) => setShow((current) => ({ ...current, [panel]: value }));

  function startPanelDrag(event, target) {
    if (event.target.closest("button, input, select, textarea, label")) return;
    event.preventDefault();
    const rect = pageRef.current?.getBoundingClientRect();
    const currentRight = (rect?.right || window.innerWidth) - event.clientX;
    
    // Logic for the specific table state vs standard panels
    const currentPos = target === 'attributeTable' ? tablePos : pos[target];
    
    panelDragRef.current = { 
      target, 
      offsetX: currentRight - currentPos.x, 
      offsetY: event.clientY - currentPos.y 
    };
  }

  const refreshLayers = () => Object.values(layerRefs.current).forEach((layer) => layer.changed());

  function toggleLayer(layerId, isVisible) {
    setVisibleLayers((current) => ({ ...current, [layerId]: isVisible }));
    layerRefs.current[String(layerId)]?.setVisible(isVisible);
  }

  function changeLayerOpacity(layerId, value) {
      const opacity = parseFloat(value);
      setLayerOpacities(prev => ({ ...prev, [layerId]: opacity }));
      const layer = layerRefs.current[String(layerId)];
      if (layer) layer.setOpacity(opacity);
    }

  function applyLayerOrder(orderedLayers) {
    orderedLayers.forEach((layerInfo, index) => layerRefs.current[String(layerInfo.id)]?.setZIndex(1000 + orderedLayers.length - index));
  }

  function moveLayerBefore(sourceLayerId, targetLayerId) {
    const sourceId = String(sourceLayerId || ""), targetId = String(targetLayerId || "");
    if (!sourceId || !targetId || sourceId === targetId) return;

    setGisLayers((current) => {
      const from = current.findIndex((layer) => String(layer.id) === sourceId);
      const to = current.findIndex((layer) => String(layer.id) === targetId);
      if (from < 0 || to < 0 || from === to) return current;

      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      applyLayerOrder(next);
      return next;
    });
  }

  function onLayerDragStart(event, layerId) {
    const id = String(layerId);
    layerDragRef.current = id;
    setDraggingLayerId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }

  function addFilter() {
    const layer = filterableLayers[0];
    if (layer) setFilters((current) => [...current, newFilter(layer, fieldsByLayer)]);
  }

  function updateFilter(id, patch) {
    setFilters((current) => current.map((filter) => {
      if (filter.id !== id) return filter;
      const next = { ...filter, ...patch };
      if (patch.layerId && String(patch.layerId) !== String(filter.layerId)) {
        const layer = layersById[String(patch.layerId)];
        const typeStr = String(layer?.layer_type || "").toLowerCase();
        next.layerType = typeStr.includes("polygon") ? "polygons" : "points";
        next.field = fieldsByLayer[String(patch.layerId)]?.[0] || "";
        next.value = "";
        next.color = next.layerType === "polygons" ? "#F59E0B" : "#4A71FC";
        next.priority = 1;
      }
      if (patch.field && patch.field !== filter.field) next.value = "";
      return next;
    }));
  }

  function removeFilter(id) {
    setFilters((current) => current.filter((filter) => filter.id !== id));
    activeFiltersRef.current = activeFiltersRef.current.filter((filter) => filter.id !== id);
    setActiveFilters(activeFiltersRef.current);
    refreshLayers();
  }

  function applyFilters() {
    const valid = filters
      .map((filter, index) => ({ ...filter, refIndex: index + 1 }))
      .filter(isComplete);

    activeFiltersRef.current = valid;
    expressionRef.current = filterExpression.trim() || defaultExpression(valid);
    setActiveFilters(valid);
    refreshLayers();
  }

  function clearFilters() {
    activeFiltersRef.current = [];
    expressionRef.current = "";
    setActiveFilters([]);
    setFilters([]);
    setFilterExpression("");
    refreshLayers();
  }

  function makeMapCanvas(includeLegend = true) {
    const map = mapInstanceRef.current;
    if (!map) return Promise.resolve(null);

    return new Promise((resolve) => {
      map.once("rendercomplete", () => {
        const size = map.getSize();
        if (!size) return resolve(null);

        const out = document.createElement("canvas");
        out.width = size[0] * EXPORT_SCALE;
        out.height = size[1] * EXPORT_SCALE;
        const ctx = out.getContext("2d");

        Array.prototype.forEach.call(map.getViewport().querySelectorAll(".ol-layer canvas, canvas.ol-layer"), (canvas) => {
          if (canvas.width <= 0) return;

          ctx.globalAlpha = Number(canvas.parentNode.style.opacity || canvas.style.opacity || 1);
          const transform = canvas.style.transform;
          const matrix = transform
            ? transform.match(/^matrix\(([^)]*)\)$/)[1].split(",").map(Number)
            : [parseFloat(canvas.style.width) / canvas.width, 0, 0, parseFloat(canvas.style.height) / canvas.height, 0, 0];

          CanvasRenderingContext2D.prototype.setTransform.apply(ctx, matrix.map((value) => value * EXPORT_SCALE));
          ctx.drawImage(canvas, 0, 0);
        });

        ctx.globalAlpha = 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (includeLegend && show.legend) drawLegend(ctx, legendData, pos.legend, EXPORT_SCALE);
        resolve(out);
      });
      map.renderSync();
    });
  }

  async function downloadMap(rect = null) {
    const canvas = await makeMapCanvas(true);
    if (!canvas) return;

    const output = rect ? document.createElement("canvas") : canvas;
    if (rect) {
      output.width = Math.round(rect.width * EXPORT_SCALE);
      output.height = Math.round(rect.height * EXPORT_SCALE);
      output.getContext("2d").drawImage(
        canvas,
        rect.x * EXPORT_SCALE,
        rect.y * EXPORT_SCALE,
        rect.width * EXPORT_SCALE,
        rect.height * EXPORT_SCALE,
        0,
        0,
        rect.width * EXPORT_SCALE,
        rect.height * EXPORT_SCALE
      );
    }

    const link = document.createElement("a");
    link.download = rect ? "نقشه-منتخب-با-کیفیت.png" : "نقشه-فیلتر-شده-با-کیفیت.png";
    link.href = output.toDataURL("image/png");
    link.click();
  }

  function capturePointer(type, event) {
    if (type === "down") {
      const rect = event.currentTarget.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      captureStartRef.current = point;
      setCaptureRect({ ...point, width: 0, height: 0 });
      return;
    }

    if (!captureStartRef.current) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const current = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    const start = captureStartRef.current;
    const rect = { x: Math.min(start.x, current.x), y: Math.min(start.y, current.y), width: Math.abs(current.x - start.x), height: Math.abs(current.y - start.y) };

    if (type === "move") setCaptureRect(rect);
    if (type === "up") {
      captureStartRef.current = null;
      setCaptureMode(false);
      setCaptureRect(null);
      if (rect.width >= 10 && rect.height >= 10) downloadMap(rect);
    }
  }

  const expressionHint = filters.some(isComplete)
    ? defaultExpression(filters.map((filter, index) => ({ ...filter, refIndex: index + 1 })).filter(isComplete))
    : "F1 AND F2 OR (F3 AND F4)";

  return (
    <div ref={pageRef} className="map-page" style={{ direction: "rtl", textAlign: "right" }}>
      <div ref={mapRef} className="map-container" />

      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 24, display: "flex", gap: 8, direction: "rtl" }}>
        <IconButton title="نمایش لایه‌ها" icon="layers" onClick={() => setPanelVisible("layers", true)} />
        <IconButton title="نمایش فیلترها" icon="filter" onClick={() => setPanelVisible("filters", true)} />
      </div>

      {show.layers && (
        <Panel
          type="layers"
          title="لایه‌ها"
          pos={pos.layers}
          width={PANEL_WIDTH.layers}
          onDrag={startPanelDrag}
          onClose={() => setPanelVisible("layers", false)}
          actions={
            <>
              <IconButton title="خروجی عکس (PNG)" icon="download" onClick={() => downloadMap()} />
              <IconButton title="انتخاب محدوده برای خروجی" icon="crop" onClick={() => { setCaptureMode(true); setCaptureRect(null); setSelectedFeature(null); }} />
              <IconButton title={show.legend ? "مخفی‌سازی راهنما" : "نمایش راهنما"} icon={show.legend ? "visibilityOff" : "visibility"} onClick={() => setPanelVisible("legend", !show.legend)} />
            </>
          }
        >
          <div className="map-section">
            {gisLayers.length === 0 && <div className="active-filter-box">هیچ لایه‌ای بارگذاری نشده است.</div>}

            <div className="map-layer-list">
              {gisLayers.map((layer, index) => {
                const layerId = String(layer.id);
                
                const checked = visibleLayers[layer.id] ?? true;
                const isDragging = draggingLayerId === layerId;

                return (
                  <div
                    key={layer.id}
                    className="map-checkbox-row map-layer-row"
                    draggable
                    onDragStart={(event) => onLayerDragStart(event, layer.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      moveLayerBefore(event.dataTransfer.getData("text/plain") || layerDragRef.current, layer.id);
                      setDraggingLayerId(null);
                    }}
                    onDragEnd={() => setDraggingLayerId(null)}
                    title="برای تغییر ترتیب لایه‌ها بکشید. لایه‌های بالاتر در جلو نمایش داده می‌شوند."
                    style={{
                      padding: "7px 8px",
                      border: "1px solid rgba(255,255,255,.06)",
                      background: isDragging ? "rgba(74,113,252,.18)" : checked ? "rgba(10,16,28,.72)" : "rgba(10,16,28,.36)",
                      opacity: isDragging ? 0.55 : 1,
                      cursor: "grab",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1, flex: "0 0 auto", userSelect: "none" }}>⋮⋮</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => toggleLayer(layer.id, event.target.checked)}
                      onClick={(event) => event.stopPropagation()}
                      style={{ flex: "0 0 auto" }}
                    />
                    <span title={layerLabel(layer)} style={{ flex: "1 1 auto", textAlign: "right" }}>
                      {layerLabel(layer)} <em style={{ fontSize: "0.8em", opacity: 0.7 }}>({normType(layer.layer_type)})</em>
                    </span>
                    <IconButton 
                      title="جدول اطلاعات" 
                      icon="expand" 
                      onClick={(e) => { e.stopPropagation(); setAttributeLayer(attributeLayer === layer.id ? null : layer.id); }} 
                      small 
                    />
                    <span title="اولویت ترسیم" style={{ color: "var(--text-muted)", fontSize: 11, flex: "0 0 auto" }}>{index + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      )}

      {show.filters && (
        <Panel type="filters" title="فیلترها" pos={pos.filters} width={PANEL_WIDTH.filters} onDrag={startPanelDrag} onClose={() => setPanelVisible("filters", false)}>
          <div className="map-section">
            <div className="map-section-title">عبارت منطقی</div>
            <div className="map-field-group">
              <label>استفاده از شناسه فیلترها مانند F1 AND F2 OR (F3 AND F4)</label>
              <input type="text" style={{ direction: "ltr" }} value={filterExpression} placeholder={expressionHint} onChange={(event) => setFilterExpression(event.target.value)} />
            </div>
            <div className="active-filter-box" style={{ marginTop: 8 }}>عبارت خالی به معنای ترکیب تمام فیلترهای فعال با AND است.</div>
          </div>

          <div className="map-section">
            <div className="map-section-header">
              <div className="map-section-title">لیست فیلترها</div>
              <button type="button" className="map-chip-button" onClick={addFilter} disabled={!hasFields || filterableLayers.length === 0}>+ افزودن فیلتر</button>
            </div>

            {filters.length === 0 && <div className="active-filter-box">فیلتری اضافه نشده است.</div>}

            <div className="map-filter-list">
              {filters.map((filter, index) => {
                const layer = layersById[String(filter.layerId)];
                const fields = fieldsByLayer[String(filter.layerId)] || [];
                const values = uniqueValues(sourceRefs.current[String(filter.layerId)]?.source, filter.field);

                return (
                  <div key={filter.id} className="filter-card" style={filter.active === false ? { opacity: 0.62 } : undefined}>
                    <div className="filter-card-header">
                      <div className="filter-summary">
                        <input type="checkbox" checked={filter.active !== false} title="فعال" onChange={(event) => updateFilter(filter.id, { active: event.target.checked })} style={{ accentColor: "var(--blue)", margin: 0 }} />
                        {filter.layerType === "polygons" && <span className="filter-color-dot" style={{ background: filter.color }} />}
                        <span>{filter.collapsed ? filterLabel(filter, layersById, index + 1) : `${fRef(index)} · فیلتر ${index + 1}`}</span>
                      </div>
                      <div className="filter-card-actions">
                        <IconButton small title={filter.collapsed ? "باز کردن" : "بستن"} icon={filter.collapsed ? "expand" : "collapse"} onClick={() => updateFilter(filter.id, { collapsed: !filter.collapsed })} />
                        <IconButton small title="حذف" icon="trash" onClick={() => removeFilter(filter.id)} />
                      </div>
                    </div>

                    {!filter.collapsed && (
                      <div className="filter-grid filter-grid-two-columns">
                        <div className="map-field-group">
                          <label>لایه</label>
                          <select value={filter.layerId} onChange={(event) => updateFilter(filter.id, { layerId: event.target.value })}>
                            {filterableLayers.map((layerOption) => <option key={layerOption.id} value={layerOption.id}>{layerLabel(layerOption)} ({normType(layerOption.layer_type)})</option>)}
                          </select>
                        </div>

                        <div className="map-field-group">
                          <label>فیلد</label>
                          <select value={filter.field} onChange={(event) => updateFilter(filter.id, { field: event.target.value })}>
                            <option value="">انتخاب فیلد</option>
                            {fields.map((field) => <option key={field} value={field}>{field}</option>)}
                          </select>
                        </div>

                        <div className="map-field-group">
                          <label>عملگر</label>
                          <select value={filter.operator} style={{ direction: "ltr" }} onChange={(event) => updateFilter(filter.id, { operator: event.target.value })}>
                            {["=", ">=", ">", "<=", "<"].map((op) => <option key={op} value={op}>{op}</option>)}
                          </select>
                        </div>

                        <div className="map-field-group">
                          <label>مقدار</label>
                          <select value={filter.value} onChange={(event) => updateFilter(filter.id, { value: event.target.value })}>
                            <option value="">انتخاب مقدار</option>
                            {values.map((value) => <option key={value} value={value}>{value}</option>)}
                          </select>
                        </div>

                        {filter.layerType === "polygons" && (
                          <>
                            <div className="map-field-group"><label>رنگ</label><input type="color" value={filter.color} onChange={(event) => updateFilter(filter.id, { color: event.target.value })} /></div>
                            <div className="map-field-group"><label>اولویت</label><input type="number" min="1" value={filter.priority} onChange={(event) => updateFilter(filter.id, { priority: event.target.value })} /></div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="map-button-group">
              <button type="button" className="map-btn map-btn-primary" onClick={applyFilters}>اعمال فیلترها</button>
              <button type="button" className="map-btn map-btn-secondary" onClick={clearFilters}>پاکسازی همه</button>
            </div>

            {activeFilters.length > 0 && (
              <div className="active-filter-box">
                عبارت فعال: <span style={{ direction: "ltr", display: "inline-block" }}>{expressionRef.current || defaultExpression(activeFilters)}</span>
                {activeFilters.map((filter) => (
                  <div key={filter.id} className="active-filter-row">
                    {filter.layerType === "polygons" && <span className="filter-color-dot" style={{ background: filter.color }} />}
                    <span>{filterLabel(filter, layersById, filter.refIndex)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      )}

      {show.legend && (
        <div className="map-legend-box" style={{ right: pos.legend.x, top: pos.legend.y, left: "auto" }}>
          <div className="map-legend-header" onPointerDown={(event) => startPanelDrag(event, "legend")}>
            <span>راهنمای نقشه</span>
            <div onPointerDown={(event) => event.stopPropagation()}>
              <IconButton small title="مخفی‌سازی راهنما" icon="visibilityOff" onClick={() => setPanelVisible("legend", false)} />
            </div>
          </div>

          <div className="map-legend-body">
            <div className="map-legend-section-title">لایه‌ها</div>
            {gisLayers.length === 0 && <div className="map-legend-empty">لایه ای وجود ندارد</div>}
            {gisLayers.map((layer) => (
              <div key={layer.id} className={`map-legend-row ${visibleLayers[layer.id] === false ? "is-disabled" : ""}`}>
                <span className={`map-legend-symbol ${String(layer.layer_type || "").toLowerCase().includes("polygon") ? "polygon" : "point"}`} />
                <span title={layerLabel(layer)}>{layerLabel(layer)}</span>
                <div className="layer-opacity-container" style={{ padding: '0 10px 5px' }}>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={layerOpacities[layer.id] ?? 1} 
                    onChange={(e) => changeLayerOpacity(layer.id, e.target.value)}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>
              </div>
            ))}

            <div className="map-legend-section-title">فیلترها</div>
            {activeFilters.length === 0 && <div className="map-legend-empty">فیلتر فعالی وجود ندارد</div>}
            {activeFilters.map((filter) => (
              <div key={filter.id} className="map-legend-row">
                <span className={`map-legend-symbol ${filter.layerType === "polygons" ? "polygon" : "point"}`} style={filter.layerType === "polygons" ? { borderColor: filter.color, background: hexToRgba(filter.color, 0.35) } : undefined} />
                <span title={filterLabel(filter, layersById, filter.refIndex)}>{filterLabel(filter, layersById, filter.refIndex)}</span>
              </div>
            ))}

            {hasOr(activeExpression) && activeFilters.filter((filter) => filter.layerType === "polygons").length > 1 && (
              <div className="map-legend-row"><span className="map-legend-symbol polygon hatch" /><span>هاشور = تطبیق با تمام فیلترهای پلیگون</span></div>
            )}
          </div>
        </div>
      )}

      {captureMode && (
        <div className="map-capture-overlay" onPointerDown={(event) => capturePointer("down", event)} onPointerMove={(event) => capturePointer("move", event)} onPointerUp={(event) => capturePointer("up", event)}>
          <div className="map-capture-hint">یک کادر برای خروجی گرفتن از آن ناحیه بکشید</div>
          {captureRect && <div className="map-capture-selection" style={{ left: captureRect.x, top: captureRect.y, width: captureRect.width, height: captureRect.height }} />}
        </div>
      )}

      {selectedFeature && (
        <div className="feature-info-panel" style={{ left: 16, right: "auto" }}>
          <div className="feature-info-header">اطلاعات<button type="button" className="feature-info-close" onClick={() => setSelectedFeature(null)}>×</button></div>
          <div className="feature-info-body">
            {Object.entries(selectedFeature).map(([key, value]) => (
              <div key={key} className="feature-info-row"><div className="feature-info-label">{key}</div><div className="feature-info-value">{String(value)}</div></div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Right Coordinate Display */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.6)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        pointerEvents: 'none',
        zIndex: 1000
      }}>
        Lon: {coords.x} | Lat: {coords.y}
      </div>
{attributeLayer && (
  <div 
    className="map-control-panel map-attribute-drawer" 
    style={{
          position: 'absolute', 
          right: tablePos.x, 
          top: tablePos.y, 
          width: 'calc(100% - 40px)', 
          maxWidth: '1200px',
          height: tableHeight, // State-controlled height
          zIndex: 3000, 
          direction: 'rtl',
          overflow: 'hidden', // Required for resize
          display: 'flex',
          flexDirection: 'column'
        }}
  >
    {/* Header is now Draggable */}
    <div 
      className="map-filter-header"
      onPointerDown={(e) => startPanelDrag(e, 'attributeTable')}
      style={{ cursor: 'move', flexShrink: 0 }}
    >
      <div className="map-filter-title">
        جدول اطلاعات: {layerLabel(layersById[attributeLayer])}
      </div>
      <div className="map-filter-actions" onPointerDown={(e) => e.stopPropagation()}>
        <input 
          placeholder="جستجو..." 
          value={tableSearch} 
          onChange={(e) => setTableSearch(e.target.value)}
          style={{ background: '#1F2937', color: '#fff', border: '1px solid #374151', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', width: '150px', marginLeft: '10px' }}
        />
        <IconButton icon="close" onClick={() => setAttributeLayer(null)} small />
      </div>
    </div>

    {/* Table Body - Scrollable */}
    <div style={{ overflow: 'auto', flex: 1, background: 'rgba(10, 14, 24, 0.95)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', color: '#D1D5DB', fontSize: '12px', textAlign: 'right' }}>
        <thead style={{ position: 'sticky', top: 0, background: '#111827', zIndex: 1 }}>
          <tr>
            {fieldsByLayer[attributeLayer]?.map(field => (
              <th key={field} style={{ padding: '10px', border: '1px solid #1F2937', color: '#4A71FC' }}>{field}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, i) => (
            <tr key={i} className="table-hover-row" style={{ borderBottom: '1px solid #1F2937' }}>
              {fieldsByLayer[attributeLayer]?.map(field => (
                <td key={field} style={{ padding: '8px', border: '1px solid #1F2937', whiteSpace: 'nowrap' }}>
                  {String(row[field] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    
    {/* Resize Handle Hint */}
    <div style={{ height: '4px', background: '#374151', cursor: 'ns-resize', flexShrink: 0 }} />
  </div>
)}
  onMouseUp={(e) => {
    const newHeight = e.currentTarget.offsetHeight;
    setTableHeight(newHeight);
  }}
    </div>
  );
}