// src/components/Map/MapView.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "ol/ol.css";
import Map from "ol/Map.js";
import View from "ol/View.js";
import TileLayer from "ol/layer/Tile.js";
import VectorLayer from "ol/layer/Vector.js";
import OSM from "ol/source/OSM.js";
import VectorSource from "ol/source/Vector.js";
import GeoJSON from "ol/format/GeoJSON.js";
import { fromLonLat, toLonLat } from "ol/proj.js";
import { ScaleLine, defaults as defaultControls } from "ol/control.js";
import type { Feature } from "ol";
import type { FeatureLike } from "ol/Feature.js";

import { IconButton } from "./MapIcons.js";
import LayerPanel from "./LayerPanel.js";
import FilterPanel from "./FilterPanel.js";
import AttributeTable from "./AttributeTable.js";
import Legend from "./Legend.js";
import { 
  normalPointStyle, normalPolygonStyle, hiddenStyle, 
  polygonStyle, passes, evaluateExpression, defaultExpression,
} from "./MapUtils.js";
import { 
  type GISLayer, type MapFilter, type PanelPosition, 
  type PanelVisibility, type LayerRefs, type SourceRefs 
} from "./types.js";

const API_BASE = "http://localhost:8000";
const PANEL_WIDTH = { layers: 310, filters: 440, legend: 210 };

export default function MapView() {
  const queryParams = new URLSearchParams(window.location.search);
  const projectId = queryParams.get("project_id");

  const pageRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const layerRefs = useRef<LayerRefs>({});
  const sourceRefs = useRef<SourceRefs>({});
  const activeFiltersRef = useRef<MapFilter[]>([]);
  const expressionRef = useRef<string>("");

  const [attributeLayer, setAttributeLayer] = useState<string | number | null>(null);
  const [show, setShow] = useState<PanelVisibility>({ layers: true, filters: true, legend: true });
  const [pos, setPos] = useState<Record<string, PanelPosition>>({ 
    layers: { x: 16, y: 64 }, 
    filters: { x: 340, y: 64 }, 
    legend: { x: 16, y: 16 } 
  });

  const [gisLayers, setGisLayers] = useState<GISLayer[]>([]);
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({});
  const [fieldsByLayer, setFieldsByLayer] = useState<Record<string, string[]>>({});
  const [filters, setFilters] = useState<MapFilter[]>([]);
  const [filterExpression, setFilterExpression] = useState("");
  const [activeFilters, setActiveFilters] = useState<MapFilter[]>([]);
  const [coords, setCoords] = useState({ x: "0", y: "0" });
  const [tableSearch, setTableSearch] = useState("");
  const [tablePos, setTablePos] = useState<PanelPosition>({ x: 20, y: 100 });
  const [tableHeight, setTableHeight] = useState(300);
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);

  const layersById = useMemo(() => Object.fromEntries(gisLayers.map(l => [String(l.id), l])), [gisLayers]);
  
  const filterableLayers = useMemo(() => gisLayers.filter(l => 
    String(l.layer_type || "").toLowerCase().match(/point|polygon/)
  ), [gisLayers]);

  const tableData = useMemo(() => {
    const layerId = String(attributeLayer || "");
    if (!attributeLayer || !sourceRefs.current[layerId]) return [];
    const source = sourceRefs.current[layerId].source;
    return source.getFeatures().map(f => {
      const p = { ...f.getProperties() };
      delete p.geometry;
      return p;
    }).filter(row => 
      Object.values(row).some(v => String(v).toLowerCase().includes(tableSearch.toLowerCase()))
    );
  }, [attributeLayer, tableSearch]);

  const getUniqueValues = (layerId: string, field: string) => {
    const source = sourceRefs.current[layerId]?.source;
    if (!source || !field) return [];
    const vals = source.getFeatures().map(f => String(f.get(field) ?? ""));
    return [...new Set(vals)].sort();
  };

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

            const vectorLayers = layers.map((info) => {
                const id = String(info.id);
                const type: 'polygons' | 'points' = String(info.layer_type).toLowerCase().includes("polygon") ? "polygons" : "points";
                const source = new VectorSource({
                    url: `${API_BASE}/api/projects/${projectId}/gis/layers/${id}/features`,
                    format: new GeoJSON()
                });

                const layer = new VectorLayer({
                    source,
                    style: (f) => styleFeature(f, id, type)
                });

                source.on("featuresloadend", () => {
                    if (cancelled) return;
                    const features = source.getFeatures();
                    const fields = new Set<string>();
                    features.forEach(f => Object.keys(f.getProperties()).forEach(k => {
                        if (k !== 'geometry' && !k.startsWith('_')) fields.add(k);
                    }));
                    setFieldsByLayer(prev => ({ ...prev, [id]: [...fields].sort() }));
                });

                layerRefs.current[id] = layer as any;
                sourceRefs.current[id] = { source, type };
                return layer;
            });

            const map = new Map({
                target: mapRef.current!,
                layers: [new TileLayer({ source: new OSM() }), ...vectorLayers],
                view: new View({ center: fromLonLat([50.9, 34.6]), zoom: 8 }),
                controls: defaultControls().extend([new ScaleLine({ units: 'metric' })])
            });

            map.on("pointermove", (e) => {
                if (e.coordinate) {
                    const lonLatArr = toLonLat(e.coordinate);
                    setCoords({ x: lonLatArr[0].toFixed(4), y: lonLatArr[1].toFixed(4) });
                }
            });

            mapInstanceRef.current = map;
        } catch (error) {
            console.error("Map initialization failed:", error);
        }
    }

    init();
    return () => { 
        cancelled = true; 
        if (mapInstanceRef.current) mapInstanceRef.current.setTarget(undefined); 
    };
  }, [projectId]);

  // FIX FOR ERROR 2532: Explicit check for feature existence
  function styleFeature(feature: FeatureLike, layerId: string, layerType: 'polygons' | 'points') {
    const active = activeFiltersRef.current;
    const lFilters = active.filter(f => String(f.layerId) === layerId);
    
    // Safety check for OpenLayers feature
    if (!feature || typeof (feature as any).getProperties !== 'function') return hiddenStyle;
    const f = feature as Feature;

    if (!lFilters.length) return layerType === "polygons" ? normalPolygonStyle : normalPointStyle;
    
    if (!evaluateExpression(expressionRef.current, active, f, layerId)) return hiddenStyle;
    if (layerType !== "polygons") return normalPointStyle;
    
    const matching = lFilters.filter(filter => passes(f, filter)).sort((a,b) => b.priority - a.priority);
    return matching.length && matching[0] ? polygonStyle(matching[0].color) : normalPolygonStyle;
  }

  const toggleLayer = (id: string | number, visible: boolean) => {
    setVisibleLayers(prev => ({ ...prev, [id]: visible }));
    const layer = layerRefs.current[String(id)];
    if (layer) layer.setVisible(visible);
  };

  const moveLayerBefore = (sId: string, tId: string) => {
    if (sId === tId) return;
    setGisLayers(prev => {
        const next = [...prev];
        const fromIdx = next.findIndex(l => String(l.id) === sId);
        const toIdx = next.findIndex(l => String(l.id) === tId);
        if (fromIdx === -1 || toIdx === -1) return prev;
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        next.forEach((l, i) => {
            const layer = layerRefs.current[String(l.id)];
            if (layer) layer.setZIndex(1000 + next.length - i);
        });
        return next;
    });
  };

  const applyFilters = () => {
    const valid = filters.filter(f => f.field && f.value !== "");
    activeFiltersRef.current = valid;
    expressionRef.current = filterExpression || defaultExpression(valid);
    setActiveFilters(valid);
    Object.values(layerRefs.current).forEach(l => {
        if (l) l.changed();
    });
  };

  // FIX FOR ERROR 2345: Strict guard for first layer
  const handleAddFilter = () => {
    const layers = filterableLayers;
    if (layers.length > 0) {
      const firstLayer = layers[0];
      if (firstLayer) {
        setFilters(prev => [...prev, { 
          id: crypto.randomUUID(), 
          active: true, 
          layerId: String(firstLayer.id), 
          layerType: String(firstLayer.layer_type).toLowerCase().includes("polygon") ? 'polygons' : 'points', 
          field: '', 
          operator: '=', 
          value: '', 
          color: '#4A71FC', 
          priority: 1, 
          collapsed: false 
        }]);
      }
    }
  };

  return (
    <div ref={pageRef} className="map-page" style={{ direction: "rtl", textAlign: "right" }}>
      <div ref={mapRef} className="map-container" />

      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 24, display: "flex", gap: 8 }}>
        <IconButton title="نمایش لایه‌ها" icon="layers" onClick={() => setShow(s => ({...s, layers: true}))} />
        <IconButton title="نمایش فیلترها" icon="filter" onClick={() => setShow(s => ({...s, filters: true}))} />
      </div>

      {show.layers && (
        <LayerPanel 
            gisLayers={gisLayers} visibleLayers={visibleLayers} draggingLayerId={draggingLayerId}
            pos={pos.layers || {x: 16, y: 64}} width={PANEL_WIDTH.layers} showLegend={show.legend}
            attributeLayer={attributeLayer} onDrag={() => {}} onClose={() => setShow(s => ({...s, layers: false}))}
            onLayerDragStart={(e, id) => { setDraggingLayerId(id); e.dataTransfer.setData("text/plain", id); }}
            moveLayerBefore={moveLayerBefore} toggleLayer={toggleLayer} setAttributeLayer={setAttributeLayer}
            downloadMap={() => {}} setCaptureMode={() => {}} setPanelVisible={(p, v) => setShow(s => ({...s, [p]: v}))}
        />
      )}

      {show.filters && (
        <FilterPanel 
            filters={filters} filterExpression={filterExpression} setFilterExpression={setFilterExpression}
            pos={pos.filters || {x: 340, y: 64}} width={PANEL_WIDTH.filters} onDrag={() => {}}
            onClose={() => setShow(s => ({...s, filters: false}))}
            addFilter={handleAddFilter}
            updateFilter={(id, p) => setFilters(prev => prev.map(f => f.id === id ? {...f, ...p} : f))}
            removeFilter={(id) => setFilters(prev => prev.filter(f => f.id !== id))}
            applyFilters={applyFilters} clearFilters={() => { setFilters([]); applyFilters(); }}
            filterableLayers={filterableLayers} layersById={layersById} fieldsByLayer={fieldsByLayer}
            getUniqueValues={getUniqueValues} hasFields={Object.keys(fieldsByLayer).length > 0}
            activeFilters={activeFilters}
        />
      )}

      <Legend legendData={{ layerItems: [], filterItems: [], showCrosshatchNote: false }} pos={pos.legend || {x: 16, y: 16}} setPanelVisible={() => {}} startPanelDrag={() => {}} />

      <AttributeTable 
          attributeLayer={attributeLayer} layersById={layersById} fieldsByLayer={fieldsByLayer}
          tableData={tableData} tablePos={tablePos} tableHeight={tableHeight}
          tableSearch={tableSearch} setTableSearch={setTableSearch} setAttributeLayer={setAttributeLayer}
          startPanelDrag={() => {}} setTableHeight={setTableHeight}
      />

      <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
        Lon: {coords.x} | Lat: {coords.y}
      </div>
    </div>
  );
}