import React, { useRef } from 'react';
import { IconButton } from './MapIcons';
import { layerLabel } from './MapUtils';

const AttributeTable = ({ 
  attributeLayer, layersById, fieldsByLayer, tableData, 
  tablePos, tableHeight, tableWidth, tableSearch, 
  setTableSearch, setAttributeLayer, startPanelDrag, 
  setTableSize 
}: any) => {
  const tableRef = useRef<HTMLDivElement>(null);

  if (!attributeLayer) return null;

  return (
    <div 
      ref={tableRef}
      className="map-control-panel map-attribute-drawer" 
      style={{
        position: 'absolute', 
        right: tablePos.x, 
        top: tablePos.y, 
        width: tableWidth || '800px', 
        height: tableHeight || '300px', 
        zIndex: 3000, 
        direction: 'rtl',
        overflow: 'hidden', 
        display: 'flex',
        flexDirection: 'column',
        resize: 'both' // Enables the handle at bottom-right
      }}
      onMouseUp={() => {
        if (tableRef.current) {
          // Persist the size changes to state
          setTableSize(tableRef.current.offsetWidth, tableRef.current.offsetHeight);
        }
      }}
    >
      <div 
        className="map-filter-header"
        onPointerDown={(e) => startPanelDrag(e, 'attributeTable')}
        style={{ cursor: 'move', flexShrink: 0 }}
      >
        <div className="map-filter-title">جدول اطلاعات: {layerLabel(layersById[String(attributeLayer)])}</div>
        <div className="map-filter-actions" onPointerDown={(e) => e.stopPropagation()}>
          <input 
            className="map-table-search" 
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
              {fieldsByLayer[String(attributeLayer)]?.map((field: string) => (
                <th key={field} style={{ padding: '10px', border: '1px solid #1F2937', color: '#4A71FC' }}>{field}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row: any, i: number) => (
              <tr key={i} className="table-hover-row" style={{ borderBottom: '1px solid #1F2937' }}>
                {fieldsByLayer[String(attributeLayer)]?.map((field: string) => (
                  <td key={field} style={{ padding: '8px', border: '1px solid #1F2937', whiteSpace: 'nowrap' }}>
                    {String(row[field] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttributeTable;