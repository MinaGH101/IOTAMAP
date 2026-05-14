// src/components/Map/LayerPanel.tsx
import React from 'react';
import { Panel } from './Panel'; 
import { IconButton } from './MapIcons';
import { layerLabel, normType } from './MapUtils';
import { type GISLayer, type PanelPosition } from './types';

interface LayerPanelProps {
  gisLayers: GISLayer[];
  visibleLayers: Record<string, boolean>;
  draggingLayerId: string | null;
  pos: PanelPosition;
  width: number;
  showLegend: boolean;
  attributeLayer: string | number | null;
  onDrag: (event: React.PointerEvent, type: string) => void;
  onClose: () => void;
  onLayerDragStart: (event: React.DragEvent, id: string) => void;
  moveLayerBefore: (sourceId: string, targetId: string | null) => void;
  toggleLayer: (id: string | number, visible: boolean) => void;
  setAttributeLayer: (id: string | number | null) => void;
  downloadMap: () => void;
  captureMode: boolean;
  setCaptureMode: (val: boolean) => void;
  setPanelVisible: (panel: string, val: boolean) => void;
}

const LayerPanel: React.FC<LayerPanelProps> = (props) => {
  const {
    gisLayers,
    visibleLayers,
    draggingLayerId,
    pos,
    width,
    showLegend,
    attributeLayer,
    onDrag,
    onClose,
    onLayerDragStart,
    moveLayerBefore,
    toggleLayer,
    setAttributeLayer,
    downloadMap,
    setCaptureMode,
    setPanelVisible
  } = props;

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain");
    if (sourceId && sourceId !== targetId) {
      moveLayerBefore(sourceId, targetId);
    }
  };

  return (
    <Panel
      type="layers"
      title="لایه‌ها"
      pos={pos}
      width={width}
      onDrag={(e) => onDrag(e, "layers")}
      onClose={onClose}
      actions={
        <>
          <IconButton title="خروجی (PNG)" icon="download" onClick={downloadMap} small />
          {/* <IconButton title="محدوده خروجی" icon="crop" onClick={() => setCaptureMode(true)} small /> */}
          <IconButton title="راهنما" icon={showLegend ? "visibilityOff" : "visibility"} onClick={() => setPanelVisible("legend", !showLegend)} small />
        </>
      }
    >
      <div className="map-layer-list" style={{ maxHeight: '65vh', overflowY: 'auto', padding: '2px' }}>
        {gisLayers.map((layer, index) => {
          const id = String(layer.id);
          const isVisible = visibleLayers[id] ?? true;
          const isDragging = draggingLayerId === id;
          const isTableOpen = String(attributeLayer) === id;

          return (
            <div
              key={id}
              className="map-layer-row"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", id);
                onLayerDragStart(e, id);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '2px 8px', // پدینگ بسیار کم برای کاهش ارتفاع
                marginBottom: '1px',
                borderRadius: '3px',
                gap: '8px',
                background: isDragging 
                  ? "rgba(74,113,252,.3)" 
                  : isVisible 
                    ? "rgba(30, 41, 59, 0.6)" 
                    : "rgba(15, 23, 42, 0.2)",
                borderRight: isTableOpen ? "3px solid #4A71FC" : "3px solid transparent",
                transition: 'background 0.2s',
                cursor: 'grab',
                minHeight: '28px' // حداقل ارتفاع برای حفظ ظاهر دکمه‌ها
              }}
            >
              {/* Visibility Checkbox */}
              <input
                type="checkbox"
                checked={isVisible}
                onChange={(e) => toggleLayer(id, e.target.checked)}
                style={{ cursor: "pointer", width: '13px', height: '13px', margin: 0 }}
              />
              
              {/* Layer Info - اسم و نوع در یک ردیف */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <span style={{ 
                  fontSize: "12px", 
                  fontWeight: 500, 
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  color: isVisible ? '#fff' : '#64748b'
                }}>
                  {layerLabel(layer)}
                </span>
                <span style={{ 
                  fontSize: "9px", 
                  opacity: 0.5, 
                  color: '#94a3b8', 
                  whiteSpace: 'nowrap',
                  marginTop: '1px' 
                }}>
                  ({normType(layer.layer_type)})
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IconButton
                  icon="table" 
                  title="جدول اطلاعات"
                  onClick={() => setAttributeLayer(isTableOpen ? null : id)}
                  small
                  style={{
                    padding: '1px',
                    backgroundColor: isTableOpen ? '#4A71FC' : 'transparent',
                    color: isTableOpen ? '#fff' : '#94a3b8'
                  }}
                />
                <span style={{ fontSize: '9px', opacity: 0.2, fontFamily: 'monospace', minWidth: '12px' }}>
                  {index + 1}
                </span>
              </div>
            </div>
          );
        })}
        
        {gisLayers.length === 0 && (
          <div style={{ padding: "20px", textAlign: "center", opacity: 0.4, fontSize: '12px' }}>
            لایه‌ای موجود نیست
          </div>
        )}
      </div>
    </Panel>
  );
};

export default LayerPanel;