// src/components/Map/AttributeTable.tsx
import React from 'react';
import { IconButton } from './MapIcons.js';
import { layerLabel } from './MapUtils.js';
import { type GISLayer, type PanelPosition } from './types.js';

interface AttributeTableProps {
  attributeLayer: string | number | null;
  layersById: Record<string, GISLayer>;
  fieldsByLayer: Record<string, string[]>;
  tableData: any[];
  tablePos: PanelPosition;
  tableHeight: number;
  tableSearch: string;
  setTableSearch: (val: string) => void;
  setAttributeLayer: (val: string | null) => void;
  startPanelDrag: (e: React.PointerEvent, target: string) => void;
  setTableHeight: (val: number) => void;
}

const AttributeTable: React.FC<AttributeTableProps> = ({
  attributeLayer,
  layersById,
  fieldsByLayer,
  tableData,
  tablePos,
  tableHeight,
  tableSearch,
  setTableSearch,
  setAttributeLayer,
  startPanelDrag,
  setTableHeight
}) => {
  if (!attributeLayer) return null;

  return (
    <div 
      className="map-control-panel map-attribute-drawer" 
      style={{
        position: 'absolute', 
        right: tablePos.x, 
        top: tablePos.y, 
        width: 'calc(100% - 40px)', 
        maxWidth: '1200px',
        height: tableHeight, 
        zIndex: 3000, 
        direction: 'rtl',
        overflow: 'hidden', 
        display: 'flex',
        flexDirection: 'column'
      }}
      onMouseUp={(e) => {
        const newHeight = (e.currentTarget as HTMLElement).offsetHeight;
        setTableHeight(newHeight);
      }}
    >
      <div 
        className="map-filter-header"
        onPointerDown={(e) => startPanelDrag(e, 'attributeTable')}
        style={{ cursor: 'move', flexShrink: 0 }}
      >
        <div className="map-filter-title">
          جدول اطلاعات: {layerLabel(layersById[String(attributeLayer)])}
        </div>
        <div className="map-filter-actions" onPointerDown={(e) => e.stopPropagation()}>
          <input 
            placeholder="جستجو..." 
            value={tableSearch} 
            onChange={(e) => setTableSearch(e.target.value)}
            style={{ background: '#1F2937', color: '#fff', border: '1px solid #374151', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', width: '150px', marginLeft: '10px' }}
          />
          <IconButton icon="close" title="بستن" onClick={() => setAttributeLayer(null)} small />
        </div>
      </div>

      <div style={{ overflow: 'auto', flex: 1, background: 'rgba(10, 14, 24, 0.95)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#D1D5DB', fontSize: '12px', textAlign: 'right' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#111827', zIndex: 1 }}>
            <tr>
              {fieldsByLayer[String(attributeLayer)]?.map(field => (
                <th key={field} style={{ padding: '10px', border: '1px solid #1F2937', color: '#4A71FC' }}>{field}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, i) => (
              <tr key={i} className="table-hover-row" style={{ borderBottom: '1px solid #1F2937' }}>
                {fieldsByLayer[String(attributeLayer)]?.map(field => (
                  <td key={field} style={{ padding: '8px', border: '1px solid #1F2937', whiteSpace: 'nowrap' }}>
                    {String(row[field] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ height: '4px', background: '#374151', cursor: 'ns-resize', flexShrink: 0 }} />
    </div>
  );
};

export default AttributeTable;