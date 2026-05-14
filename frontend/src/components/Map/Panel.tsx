// src/components/Map/Panel.tsx
import React from 'react';
import { IconButton } from './MapIcons.js';
import { type PanelPosition } from './types.js';

interface PanelProps {
  type: string;
  title: string;
  pos: PanelPosition;
  width: number;
  onDrag: (event: React.PointerEvent, type: string) => void;
  onClose: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ 
  type, title, pos, width, onDrag, onClose, actions, children 
}) => {
  return (
    <div 
      className="map-control-panel map-filter-panel" 
      style={{ right: pos.x, top: pos.y, width }}
    >
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
};