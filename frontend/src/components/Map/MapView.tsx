// src/components/Map/MapView.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import type { Feature } from "ol";

import { IconButton } from "./MapIcons";
import LayerPanel from "./LayerPanel";
import FilterPanel from "./FilterPanel";
import AttributeTable from "./AttributeTable";
import Legend from "./Legend";
import { 
  normalPointStyle, normalPolygonStyle, hiddenStyle, 
  polygonStyle, pointStyle, // <--- حتماً pointStyle را اینجا اضافه کنید
  passes, evaluateExpression, defaultExpression, // <--- و defaultExpression را هم همینطور
  layerLabel, filterLabel
} from "./MapUtils";
import { 
  type GISLayer, type MapFilter, type PanelPosition, 
  type PanelVisibility, type LayerRefs, type SourceRefs 
} from "./types";

import DragBox from 'ol/interaction/DragBox'; // این را در بالای فایل ایمپورت کنید
import { platformModifierKeyOnly } from 'ol/events/condition';
import { always } from 'ol/events/condition'; // اضافه شده
import html2canvas from 'html2canvas'; // اضافه شده برای اسکرین‌شات

const API_BASE = "http://localhost:8000";
const PANEL_WIDTH = { layers: 310, filters: 440, legend: 210 };

export default function MapView() {
  const [captureMode, setCaptureMode] = useState(false);
  const queryParams = new URLSearchParams(window.location.search);
  const projectId = queryParams.get("project_id");

  const pageRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const layerRefs = useRef<LayerRefs>({});
  const sourceRefs = useRef<SourceRefs>({});
  const activeFiltersRef = useRef<MapFilter[]>([]);
  const expressionRef = useRef<string>("");

  // --- STATE ---
  const [gisLayers, setGisLayers] = useState<GISLayer[]>([]);
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({});
  const [fieldsByLayer, setFieldsByLayer] = useState<Record<string, string[]>>({});
  const [filters, setFilters] = useState<MapFilter[]>([]);
  const [filterExpression, setFilterExpression] = useState("");
  const [activeFilters, setActiveFilters] = useState<MapFilter[]>([]);
  const [coords, setCoords] = useState({ x: "0.0000", y: "0.0000" });
  const [attributeLayer, setAttributeLayer] = useState<string | number | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [tableHeight, setTableHeight] = useState(300);
  const [tableWidth, setTableWidth] = useState(800);
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [show, setShow] = useState<PanelVisibility>({ layers: true, filters: true, legend: true });
  
  const [pos, setPos] = useState<Record<string, PanelPosition>>({ 
    layers: { x: 16, y: 64 }, 
    filters: { x: 1300, y: 20 }, 
    legend: { x: 16, y: 280 },
    attributeTable: { x: 380, y: 500 }
  });

  // 1. Add the missing Refs
  const mapContainerRef = useRef<HTMLDivElement>(null); 
  const panelDragRef = useRef<{ target: string; offsetX: number; offsetY: number } | null>(null);

  // 2. Add the Global Dragging Logic
  const handleGlobalPointerMove = (e: React.PointerEvent) => {
    if (!panelDragRef.current) return;
    const { target, offsetX, offsetY } = panelDragRef.current;
    setPos(prev => ({
      ...prev,
      [target]: {
        x: offsetX - e.clientX,
        y: e.clientY - offsetY
      }
    }));
  };

  // 3. Add the Apply Filters function
  const applyFilters = () => {
      const valid = filters.filter(f => f.field && f.value !== "");
      activeFiltersRef.current = valid;
      expressionRef.current = filterExpression || defaultExpression(valid);
      setActiveFilters(valid);
      Object.values(layerRefs.current).forEach(l => l?.changed());
  };

  // --- DERIVED DATA ---
  const layersById = useMemo(() => Object.fromEntries(gisLayers.map(l => [String(l.id), l])), [gisLayers]);
  const filterableLayers = useMemo(() => gisLayers.filter(l => String(l.layer_type || "").toLowerCase().match(/point|polygon/)), [gisLayers]);

  const legendData = useMemo(() => {
    const layerItems = gisLayers.map(l => ({
      id: String(l.id),
      label: layerLabel(l),
      type: String(l.layer_type).toLowerCase().includes("polygon") ? "polygon" : "point",
      disabled: !visibleLayers[String(l.id)]
    }));
    const filterItems = activeFilters.map((f, index) => ({
      id: f.id,
      label: filterLabel(f, layersById, index + 1),
      type: f.layerType === "polygons" ? "polygon" : "point",
      color: f.color
    }));
    return { layerItems, filterItems, showCrosshatchNote: filterItems.length > 0 };
  }, [gisLayers, visibleLayers, activeFilters, layersById]);

  const tableData = useMemo(() => {
    const id = String(attributeLayer || "");
    const sourceObj = sourceRefs.current[id];
    if (!attributeLayer || !sourceObj || !sourceObj.source) return [];
    return sourceObj.source.getFeatures().map(f => {
      const p = { ...f.getProperties() };
      delete p.geometry;
      return p;
    }).filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(tableSearch.toLowerCase())));
  }, [attributeLayer, tableSearch]);

  const getUniqueValues = (layerId: string, field: string) => {
    const source = sourceRefs.current[layerId]?.source;
    if (!source || !field) return [];
    const vals = source.getFeatures().map(f => String(f.get(field) ?? ""));
    return [...new Set(vals)].sort();
  };

  // --- HANDLERS ---

  // RTL DRAGGING LOGIC
  const handlePanelDrag = (e: React.PointerEvent, key: string) => {
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = pos[key] || { x: 16, y: 64 };

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = startX - moveEvent.clientX; // Math for RTL (Right is the anchor)
      const dy = moveEvent.clientY - startY;
      setPos(prev => ({ ...prev, [key]: { x: startPos.x + dx, y: startPos.y + dy } }));
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const moveLayerBefore = (draggedId: string, targetId: string | null) => {
    setGisLayers(prev => {
      const result = [...prev];
      const draggedIdx = result.findIndex(l => String(l.id) === draggedId);
      if (draggedIdx === -1) return prev;
      const [item] = result.splice(draggedIdx, 1);
      const targetIdx = targetId ? result.findIndex(l => String(l.id) === targetId) : result.length;
      result.splice(targetIdx, 0, item);
      result.forEach((layerInfo, idx) => {
        const olLayer = layerRefs.current[String(layerInfo.id)];
        if (olLayer) olLayer.setZIndex(1000 + result.length - idx);
      });
      return result;
    });
    setDraggingLayerId(null);
  };

  const downloadMap = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    map.once("rendercomplete", () => {
      const mapCanvas = document.createElement("canvas");
      const size = map.getSize();
      if (!size) return;
      mapCanvas.width = size[0]; mapCanvas.height = size[1];
      const mapContext = mapCanvas.getContext("2d");
      if (!mapContext) return;
      map.getViewport().querySelectorAll('.ol-layer canvas').forEach((canvas: any) => {
        if (canvas.width > 0) {
          const opacity = canvas.parentNode.style.opacity;
          mapContext.globalAlpha = opacity === "" ? 1 : Number(opacity);
          const transform = canvas.style.transform;
          let matrix = [1, 0, 0, 1, 0, 0];
          const parts = transform.match(/^matrix\(([^\)]+)\)$/);
          if (parts) matrix = parts[1].split(',').map(Number);
          mapContext.setTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
          mapContext.drawImage(canvas, 0, 0);
        }
      });
      const link = document.createElement("a");
      link.download = `snapshot-${Date.now()}.png`;
      link.href = mapCanvas.toDataURL("image/png");
      link.click();
    });
    map.renderSync();
  };

  // --- MAP INITIALIZATION & AUTO-ZOOM ---
  useEffect(() => {
    if (!projectId || !mapRef.current) return;
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch(`${API_BASE}/api/projects/${projectId}/gis/layers`);
        const layers: GISLayer[] = await res.json();
        if (cancelled) return;

        setGisLayers(layers);
        setVisibleLayers(Object.fromEntries(layers.map(l => [l.id, true])));

        // Combined extent for auto-zoom
        const masterExtent = createEmptyExtent();

        const vectorLayers = layers.map((info, index) => {
          const id = String(info.id);
          const type: 'polygons' | 'points' = String(info.layer_type).toLowerCase().includes("polygon") ? "polygons" : "points";
          const source = new VectorSource({
            url: `${API_BASE}/api/projects/${projectId}/gis/layers/${id}/features`,
            format: new GeoJSON()
          });

          const layer = new VectorLayer({ source, style: (f) => styleFeature(f, id, type) });
          layer.setZIndex(1000 + layers.length - index);

          // AUTO-ZOOM LOGIC: Accumulate extents as features load
          source.once("featuresloadend", () => {
            if (cancelled) return;
            const features = source.getFeatures();
            
            // 1. Extract fields for attribute table
            const fields = new Set<string>();
            features.forEach(f => Object.keys(f.getProperties()).forEach(k => {
              if (k !== 'geometry' && !k.startsWith('_')) fields.add(k);
            }));
            setFieldsByLayer(prev => ({ ...prev, [id]: [...fields].sort() }));

            // 2. Expand master extent and fit map
            const layerExtent = source.getExtent();
            if (layerExtent && layerExtent[0] !== Infinity) {
              extendExtent(masterExtent, layerExtent);
              mapInstanceRef.current?.getView().fit(masterExtent, { 
                padding: [100, 100, 100, 100], 
                duration: 1200 
              });
            }
          });

          layerRefs.current[id] = layer as any;
          sourceRefs.current[id] = { source, type };
          return layer;
        });

        const map = new Map({
          target: mapContainerRef.current!,
          layers: [new TileLayer({ source: new OSM({ crossOrigin: 'anonymous' }), zIndex: 0 }), ...vectorLayers],
          view: new View({ center: fromLonLat([50.9, 34.6]), zoom: 6 }),
          controls: defaultControls().extend([new ScaleLine({ units: 'metric' })])
        });

        map.on("pointermove", (e) => {
          if (e.coordinate) {
            const arr = toLonLat(e.coordinate);
            setCoords({ x: arr[0].toFixed(4), y: arr[1].toFixed(4) });
          }
        });

        mapInstanceRef.current = map;
      } catch (err) { console.error("Map Load Error:", err); }
    }

    init();
    return () => { cancelled = true; mapInstanceRef.current?.setTarget(undefined); };
  }, [projectId]);

// Inside MapView.tsx
// Inside MapView.tsx
useEffect(() => {
  if (!mapInstanceRef.current || !captureMode) return;
  const map = mapInstanceRef.current;

  // 1. Create the box interaction
  const dragBox = new DragBox({ condition: always });
  map.addInteraction(dragBox);

  dragBox.on('boxend', async () => {
    if (!mapRef.current) return;

    // 2. Get the area coordinates and calculate pixels IMMEDIATELY
    const extent = dragBox.getGeometry().getExtent();
    const pixelTopLeft = map.getPixelFromCoordinate([extent[0], extent[3]]);
    const pixelBottomRight = map.getPixelFromCoordinate([extent[2], extent[1]]);
    const mapRect = map.getTargetElement().getBoundingClientRect();
    
    const cropX = (pixelTopLeft[0] + mapRect.left) * window.devicePixelRatio;
    const cropY = (pixelTopLeft[1] + mapRect.top) * window.devicePixelRatio;
    const cropWidth = (pixelBottomRight[0] - pixelTopLeft[0]) * window.devicePixelRatio;
    const cropHeight = (pixelBottomRight[1] - pixelTopLeft[1]) * window.devicePixelRatio;

    // 3. REMOVE visual cues before taking the photo
    map.removeInteraction(dragBox);
    setCaptureMode(false);

    // 4. WAIT for the browser to hide the selection box from the screen
    requestAnimationFrame(async () => {
      const canvas = await html2canvas(mapRef.current!, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#0a0e18', // FIXED: Solid background color
        scale: window.devicePixelRatio,
        logging: false,
        // FIXED: Explicitly ignore any remaining selection box elements
        ignoreElements: (el) => el.classList.contains('ol-dragbox') 
      });

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropWidth / window.devicePixelRatio;
      cropCanvas.height = cropHeight / window.devicePixelRatio;
      const ctx = cropCanvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(
          canvas, 
          cropX, cropY, cropWidth, cropHeight, 
          0, 0, cropCanvas.width, cropCanvas.height
        );
        
        const link = document.createElement('a');
        link.download = `iota-snip-${Date.now()}.png`;
        link.href = cropCanvas.toDataURL('image/png');
        link.click();
      }
    });
  });

  map.getTargetElement().style.cursor = 'crosshair';

  return () => {
    map.removeInteraction(dragBox);
    if (map.getTargetElement()) map.getTargetElement().style.cursor = '';
  };
}, [captureMode]);

    function styleFeature(feature: any, layerId: string, layerType: 'polygons' | 'points') {
    if (!feature || !feature.getProperties) return hiddenStyle;
    
    const active = activeFiltersRef.current;
    const lFilters = active.filter(f => String(f.layerId) === layerId);
    
    // ۱. اگر فیلتری برای این لایه وجود ندارد، استایل پیش‌فرض (آبی) را برگردان
    if (!lFilters.length) {
        return layerType === "polygons" ? normalPolygonStyle : normalPointStyle;
    }
    
    // ۲. بررسی عبارت منطقی (F1 AND F2...) - اگر برقرار نبود مخفی کن
    if (!evaluateExpression(expressionRef.current, active, feature as Feature, layerId)) {
        return hiddenStyle;
    }
    
    // ۳. پیدا کردن فیلترهای منطبق با این فیچر و مرتب‌سازی بر اساس اولویت
    const matching = lFilters.filter(f => passes(feature as Feature, f)).sort((a, b) => b.priority - a.priority);
    const topFilter = matching[0];

    // ۴. اعمال رنگ فیلتر (هم برای نقطه و هم برای پلیگون)
    if (topFilter) {
        if (layerType === "polygons") {
        return polygonStyle(topFilter.color);
        } else {
        // استفاده از تابع جدید برای اعمال رنگ به نقاط
        return pointStyle(topFilter.color);
        }
    }
    
    // اگر هیچ فیلتری منطبق نبود اما لایه فعال بود
    return layerType === "polygons" ? normalPolygonStyle : normalPointStyle;
    }

return (
    <div 
      ref={mapRef} /* CAPTURES EVERYTHING: Map, Legend, and Panels */
      className="map-page" 
      style={{ direction: "rtl", textAlign: "right", position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}
      onPointerMove={handleGlobalPointerMove}
      onPointerUp={() => { panelDragRef.current = null; }}
    >
      {/* INTERNAL CONTAINER: Where the actual map lives */}
      <div ref={mapContainerRef} className="map-container" style={{ width: '100%', height: '100%' }} />

      <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', zIndex: 1000 }}>
        Lon: {coords.x} | Lat: {coords.y}
      </div>

      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 24, display: "flex", gap: 8 }}>
        <IconButton 
          title="اسنیپ‌شات (Crop)" 
          icon="crop" 
          active={captureMode} 
          onClick={() => setCaptureMode(!captureMode)} 
          style={captureMode ? { backgroundColor: '#ef4444', color: 'white' } : {}}
        />
        <IconButton title="نمایش لایه‌ها" icon="layers" onClick={() => setShow(s => ({...s, layers: true}))} />
        <IconButton title="نمایش فیلترها" icon="filter" onClick={() => setShow(s => ({...s, filters: true}))} />
      </div>

      {show.layers && (
        <LayerPanel 
            gisLayers={gisLayers} visibleLayers={visibleLayers} draggingLayerId={draggingLayerId}
            pos={pos.layers} width={310} showLegend={show.legend}
            attributeLayer={attributeLayer} onDrag={handlePanelDrag} onClose={() => setShow(s => ({...s, layers: false}))}
            onLayerDragStart={(e: any, id: string) => setDraggingLayerId(id)}
            moveLayerBefore={moveLayerBefore} toggleLayer={(id: any, v: boolean) => {
              setVisibleLayers(prev => ({ ...prev, [id]: v }));
              layerRefs.current[String(id)]?.setVisible(v);
            }} 
            setAttributeLayer={setAttributeLayer}
            downloadMap={downloadMap} 
            captureMode={captureMode}
            setCaptureMode={setCaptureMode} 
            setPanelVisible={(p: any, v: boolean) => setShow(s => ({...s, [p]: v}))}
        />
      )}

      {show.filters && (
        <FilterPanel 
            filters={filters} filterExpression={filterExpression} setFilterExpression={setFilterExpression}
            pos={pos.filters} width={440} onDrag={handlePanelDrag}
            onClose={() => setShow(s => ({...s, filters: false}))}
            addFilter={() => setFilters(prev => [...prev, { id: crypto.randomUUID(), active: true, layerId: String(gisLayers[0]?.id), layerType: 'points', field: '', operator: '=', value: '', color: '#4A71FC', priority: 1, collapsed: false, logic: 'AND', linked: false }])}
            updateFilter={(id, p) => setFilters(prev => prev.map(f => f.id === id ? {...f, ...p} : f))}
            removeFilter={(id) => setFilters(prev => prev.filter(f => f.id !== id))}
            applyFilters={applyFilters} 
            clearFilters={() => { setFilters([]); setActiveFilters([]); activeFiltersRef.current = []; Object.values(layerRefs.current).forEach(l => l?.changed()); }}
            filterableLayers={filterableLayers} layersById={layersById} fieldsByLayer={fieldsByLayer}
            getUniqueValues={getUniqueValues} hasFields={Object.keys(fieldsByLayer).length > 0}
            activeFilters={activeFilters}
        />
      )}

      {show.legend && (
        <Legend legendData={legendData} pos={pos.legend} setPanelVisible={(p, v) => setShow(s => ({...s, [p as keyof PanelVisibility]: v}))} startPanelDrag={handlePanelDrag} />
      )}

      <AttributeTable 
          attributeLayer={attributeLayer} layersById={layersById} fieldsByLayer={fieldsByLayer}
          tableData={tableData} tablePos={pos.attributeTable} tableHeight={tableHeight} tableWidth={tableWidth}
          tableSearch={tableSearch} setTableSearch={setTableSearch} setAttributeLayer={setAttributeLayer}
          startPanelDrag={handlePanelDrag} 
          setTableSize={(w: number, h: number) => { setTableWidth(w); setTableHeight(h); }}
      />
    </div>
  );
}