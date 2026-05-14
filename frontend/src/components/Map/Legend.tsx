// src/components/Map/Legend.tsx
import React from 'react';
import { IconButton } from './MapIcons';
import { hexToRgba } from './MapUtils';
import { type PanelPosition } from './types';

interface LegendProps {
  legendData: {
    layerItems: any[];
    filterItems: any[];
    showCrosshatchNote: boolean;
  };
  pos: PanelPosition;
  setPanelVisible: (panel: 'legend', val: boolean) => void;
  startPanelDrag: (e: React.PointerEvent, target: string) => void;
}

const Legend: React.FC<LegendProps> = ({
  legendData, pos, setPanelVisible, startPanelDrag
}) => {
  return (
    <div className="map-legend-box" style={{ right: pos.x, top: pos.y, left: "auto", position: 'absolute', zIndex: 1002 }}>
      <div 
        className="map-legend-header" 
        onPointerDown={(event) => startPanelDrag(event, "legend")}
        style={{ cursor: 'move', userSelect: 'none' }}
      >
        <span>راهنمای نقشه</span>
        <div onPointerDown={(event) => event.stopPropagation()}>
          <IconButton 
            small 
            title="مخفی‌سازی راهنما" 
            icon="visibilityOff" 
            onClick={() => setPanelVisible("legend", false)} 
          />
        </div>
      </div>

      <div className="map-legend-body">
        <div className="map-legend-section-title">لایه‌ها</div>
        {legendData.layerItems.length === 0 && (
          <div className="map-legend-empty">لایه‌ای وجود ندارد</div>
        )}
        {legendData.layerItems.map((item) => (
          <div key={item.id} className={`map-legend-row ${item.disabled ? "is-disabled" : ""}`}>
            <span className={`map-legend-symbol ${item.type}`} />
            <span title={item.label} className="map-legend-label">{item.label}</span>
          </div>
        ))}

        {legendData.filterItems.length > 0 && (
          <>
            <div className="map-legend-section-title" style={{ marginTop: '12px' }}>فیلترها</div>
            {legendData.filterItems.map((item) => (
              <div key={item.id} className="map-legend-row">
                <span 
                  className={`map-legend-symbol ${item.type}`} 
                  style={{ 
                    borderColor: item.color, 
                    background: item.type === "polygon" ? hexToRgba(item.color, 0.35) : item.color 
                  }} 
                />
                <span title={item.label} className="map-legend-label">{item.label}</span>
              </div>
            ))}
          </>
        )}
        
        {legendData.filterItems.length === 0 && (
            <div style={{ marginTop: '12px' }}>
                <div className="map-legend-section-title">فیلترها</div>
                <div className="map-legend-empty">فیلتر فعالی وجود ندارد</div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Legend;