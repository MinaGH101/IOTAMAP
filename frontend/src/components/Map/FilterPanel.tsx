// src/components/Map/FilterPanel.tsx
import React from 'react';
import { Panel } from './Panel';
import { IconButton } from './MapIcons';
import { normType, layerLabel, fRef, filterLabel } from './MapUtils';
import { type GISLayer, type MapFilter, type PanelPosition } from './types';

interface FilterPanelProps {
  filters: MapFilter[];
  filterExpression: string;
  setFilterExpression: (val: string) => void;
  pos: PanelPosition;
  width: number;
  onDrag: (event: React.PointerEvent, type: string) => void;
  onClose: () => void;
  addFilter: () => void;
  updateFilter: (id: string, patch: Partial<MapFilter>) => void;
  removeFilter: (id: string) => void;
  applyFilters: () => void;
  clearFilters: () => void;
  filterableLayers: GISLayer[];
  layersById: Record<string, GISLayer>;
  fieldsByLayer: Record<string, string[]>;
  getUniqueValues: (layerId: string, field: string) => string[];
  hasFields: boolean;
  activeFilters: MapFilter[];
}

const FilterPanel: React.FC<FilterPanelProps> = (props) => {
  
  // تابع کمکی برای تولید خودکار عبارت منطقی بر اساس وضعیت دکمه‌های لینک
  const generateExpression = (filters: MapFilter[]) => {
    if (filters.length === 0) return "";
    let expr = "";
    let inGroup = false;

    filters.forEach((f, i) => {
      const currentRef = fRef(i);
      if (f.linked && !inGroup) {
        expr += "(";
        inGroup = true;
      }
      expr += currentRef;
      if (i < filters.length - 1) {
        const nextLogic = f.logic || 'AND';
        if (!f.linked && inGroup) {
          expr += ") " + nextLogic + " ";
          inGroup = false;
        } else {
          expr += " " + nextLogic + " ";
        }
      } else if (inGroup) {
        expr += ")";
      }
    });
    return expr;
  };

  const handleLogicChange = (index: number, patch: Partial<MapFilter>) => {
    const filterId = props.filters[index]?.id;
    if (filterId) {
      props.updateFilter(filterId, patch);
      const updatedFilters = props.filters.map((f, i) => i === index ? { ...f, ...patch } : f);
      props.setFilterExpression(generateExpression(updatedFilters));
    }
  };

  return (
    <Panel 
      type="filters" 
      title="فیلترها" 
      pos={props.pos} 
      width={props.width} 
      onDrag={props.onDrag} 
      onClose={props.onClose}
    >
      <div className="map-section">
        <div className="map-section-title">عبارت منطقی ترکیب</div>
        <div className="map-field-group">
          <input 
            type="text" 
            className="map-table-search"
            style={{ direction: "ltr", textAlign: 'center', fontWeight: 'bold', width: '100%', height: '32px' }} 
            value={props.filterExpression} 
            onChange={(e) => props.setFilterExpression(e.target.value)} 
            placeholder="مثلاً: (F1 AND F2) OR F3"
          />
        </div>
      </div>

      <div className="map-section" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div className="map-section-header" style={{ marginBottom: '12px' }}>
          <div className="map-section-title">لیست فیلترها</div>
          <button 
            type="button" 
            className="map-chip-button" 
            onClick={props.addFilter} 
            disabled={!props.hasFields || props.filterableLayers.length === 0}
          >
            + افزودن فیلتر جدید
          </button>
        </div>

        {/* لیست فیلترها با اسکرول فیکس شده */}
        <div className="map-filter-list" style={{ overflowY: 'auto', maxHeight: '380px', paddingLeft: '6px' }}>
          {props.filters.map((filter, index) => {
            const fields = props.fieldsByLayer[String(filter.layerId)] || [];
            const values = props.getUniqueValues(String(filter.layerId), filter.field);

            return (
              <React.Fragment key={filter.id}>
                <div 
                  className="filter-card" 
                  style={{ 
                    opacity: filter.active === false ? 0.6 : 1,
                    borderRight: `4px solid ${filter.color || '#4A71FC'}`,
                    marginBottom: '4px'
                  }}
                >
                  <div className="filter-card-header">
                    <div className="filter-summary">
                      <input 
                        type="checkbox" 
                        checked={filter.active} 
                        onChange={(e) => props.updateFilter(filter.id, { active: e.target.checked })} 
                        style={{ margin: 0, cursor: 'pointer' }}
                      />
                      <span style={{ marginRight: '8px', fontWeight: 'bold', color: '#4A71FC', minWidth: '24px' }}>{fRef(index)}</span>
                      <span style={{ fontSize: '12px' }}>
                        {filter.collapsed ? filterLabel(filter, props.layersById, index + 1) : `فیلتر شماره ${index + 1}`}
                      </span>
                    </div>
                    <div className="filter-card-actions">
                      <IconButton small icon={filter.collapsed ? "expand" : "collapse"} onClick={() => props.updateFilter(filter.id, { collapsed: !filter.collapsed })} />
                      <IconButton small icon="trash" onClick={() => props.removeFilter(filter.id)} />
                    </div>
                  </div>

                  {!filter.collapsed && (
                    <div className="filter-grid filter-grid-two-columns" style={{ padding: '8px', gap: '8px' }}>
                      <div className="map-field-group">
                        <label>لایه هدف</label>
                        <select value={filter.layerId} onChange={(e) => props.updateFilter(filter.id, { layerId: e.target.value })}>
                          {props.filterableLayers.map((layer) => (
                            <option key={layer.id} value={layer.id}>{layerLabel(layer)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="map-field-group">
                        <label>انتخاب فیلد</label>
                        <select value={filter.field} onChange={(e) => props.updateFilter(filter.id, { field: e.target.value })}>
                          <option value="">انتخاب...</option>
                          {fields.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div className="map-field-group">
                        <label>عملگر</label>
                        <select value={filter.operator} style={{ direction: "ltr" }} onChange={(e) => props.updateFilter(filter.id, { operator: e.target.value })}>
                          {["=", ">=", ">", "<=", "<"].map((op) => <option key={op} value={op}>{op}</option>)}
                        </select>
                      </div>
                      <div className="map-field-group">
                        <label>مقدار فیلتر</label>
                        <select value={filter.value} onChange={(e) => props.updateFilter(filter.id, { value: e.target.value })}>
                          <option value="">انتخاب...</option>
                          {values.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>

                      {/* بخش رنگ و اولویت برای همه انواع لایه‌ها */}
                      <div className="map-field-group">
                        <label>رنگ نمایش</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="color" 
                            value={filter.color || '#4A71FC'} 
                            onChange={(e) => props.updateFilter(filter.id, { color: e.target.value })}
                            style={{ width: '100%', height: '28px', padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }}
                          />
                        </div>
                      </div>
                      <div className="map-field-group">
                        <label>اولویت</label>
                        <input 
                          type="number" 
                          min="1" 
                          value={filter.priority || 1} 
                          onChange={(e) => props.updateFilter(filter.id, { priority: Number(e.target.value) })}
                          style={{ height: '28px' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* دکمه‌های منطقی بین کارت‌ها */}
                {index < props.filters.length - 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', margin: '6px 0', position: 'relative' }}>
                    <button
                      className="map-logic-toggle"
                      onClick={() => handleLogicChange(index, { logic: filter.logic === 'OR' ? 'AND' : 'OR' })}
                      style={{
                        background: filter.logic === 'OR' ? '#f59e0b' : '#334155',
                        color: 'white', border: 'none', borderRadius: '4px', padding: '2px 10px', fontSize: '10px', cursor: 'pointer', zIndex: 1
                      }}
                    >
                      {filter.logic || 'AND'}
                    </button>

                    <button
                      title="لینک کردن (گروه‌بندی با پرانتز)"
                      onClick={() => handleLogicChange(index, { linked: !filter.linked })}
                      style={{
                        background: filter.linked ? '#4A71FC' : '#1e293b',
                        color: filter.linked ? 'white' : '#64748b',
                        border: `1px solid ${filter.linked ? '#4A71FC' : '#334155'}`,
                        borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
                      </svg>
                    </button>
                    <div style={{ position: 'absolute', top: '-10px', bottom: '-10px', right: '50%', borderRight: '1px dashed #334155' }}></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="map-button-group" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button type="button" className="map-btn map-btn-primary" style={{ flex: 1 }} onClick={props.applyFilters}>اعمال فیلترها</button>
          <button type="button" className="map-btn map-btn-secondary" onClick={props.clearFilters}>پاکسازی</button>
        </div>
      </div>
    </Panel>
  );
};

export default FilterPanel;