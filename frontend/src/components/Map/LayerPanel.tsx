// src/components/Map/LayerPanel.tsx
import React from 'react';
import { Panel } from './Panel.js';
import { IconButton } from './MapIcons.js';
import { layerLabel, normType } from './MapUtils.js';
import { type GISLayer, type PanelPosition } from './types.js';

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
  moveLayerBefore: (sourceId: string, targetId: string) => void;
  toggleLayer: (id: string | number, visible: boolean) => void;
  setAttributeLayer: (id: string | number | null) => void;
  downloadMap: () => void;
  setCaptureMode: (val: boolean) => void;
  setPanelVisible: (panel: any, val: boolean) => void;
}

const LayerPanel: React.FC<LayerPanelProps> = ({
  gisLayers, visibleLayers, draggingLayerId, pos, width, showLegend, attributeLayer,
  onDrag, onClose, onLayerDragStart, moveLayerBefore, toggleLayer, setAttributeLayer,
  downloadMap, setCaptureMode, setPanelVisible
}) => {
  return (
    <LayerPanelBase 
        gisLayers={gisLayers} visibleLayers={visibleLayers} draggingLayerId={draggingLayerId} 
        pos={pos} width={width} showLegend={showLegend} attributeLayer={attributeLayer}
        onDrag={onDrag} onClose={onClose} onLayerDragStart={onLayerDragStart} 
        moveLayerBefore={moveLayerBefore} toggleLayer={toggleLayer} setAttributeLayer={setAttributeLayer}
        downloadMap={downloadMap} setCaptureMode={setCaptureMode} setPanelVisible={setPanelVisible}
    />
  );
};

// Internal implementation to keep the code clean
const LayerPanelBase: React.FC<LayerPanelProps> = (props) => (
    <Panel
      type="layers" title="لایه‌ها" pos={props.pos} width={props.width} onDrag={props.onDrag} onClose={props.onClose}
      actions={<><IconButton title="خروجی (PNG)" icon="download" onClick={props.downloadMap} /><IconButton title="محدوده خروجی" icon="crop" onClick={() => props.setCaptureMode(true)} /><IconButton title="راهنما" icon={props.showLegend ? "visibilityOff" : "visibility"} onClick={() => props.setPanelVisible("legend", !props.showLegend)} /></>}
    >
      <div className="map-layer-list">
        {props.gisLayers.map((layer, index) => {
          const id = String(layer.id);
          const checked = props.visibleLayers[id] ?? true;
          return (
            <div key={id} className="map-layer-row" draggable onDragStart={(e) => props.onLayerDragStart(e, id)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => props.moveLayerBefore(e.dataTransfer.getData("text/plain"), id)} style={{ background: props.draggingLayerId === id ? "rgba(74,113,252,.18)" : checked ? "rgba(10,16,28,.72)" : "rgba(10,16,28,.36)" }}>
              <input type="checkbox" checked={checked} onChange={(e) => props.toggleLayer(id, e.target.checked)} />
              <span style={{ flex: 1 }}>{layerLabel(layer)} <em>({normType(layer.layer_type)})</em></span>
              <IconButton icon="expand" title="جدول" onClick={() => props.setAttributeLayer(props.attributeLayer === id ? null : id)} small />
              <span style={{ fontSize: 11, opacity: 0.5 }}>{index + 1}</span>
            </div>
          );
        })}
      </div>
    </Panel>
);

export default LayerPanel;