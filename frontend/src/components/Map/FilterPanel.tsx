// src/components/Map/FilterPanel.tsx
import React from 'react';
import { Panel } from './Panel.js';
import { IconButton } from './MapIcons.js';
import { normType, layerLabel, fRef, filterLabel } from './MapUtils.js';
import { type GISLayer, type MapFilter, type PanelPosition } from './types.js';

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
  const expressionHint = props.filters.length > 0 ? "F1 AND F2 OR (F3 AND F4)" : "";

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
        <div className="map-section-title">عبارت منطقی</div>
        <div className="map-field-group">
          <label>استفاده از شناسه فیلترها مانند F1 AND F2</label>
          <input 
            type="text" 
            style={{ direction: "ltr" }} 
            value={props.filterExpression} 
            placeholder={expressionHint} 
            onChange={(e) => props.setFilterExpression(e.target.value)} 
          />
        </div>
        <div className="active-filter-box" style={{ marginTop: 8 }}>
          عبارت خالی به معنای ترکیب تمام فیلترهای فعال با AND است.
        </div>
      </div>

      <div className="map-section">
        <div className="map-section-header">
          <div className="map-section-title">لیست فیلترها</div>
          <button 
            type="button" 
            className="map-chip-button" 
            onClick={props.addFilter} 
            disabled={!props.hasFields || props.filterableLayers.length === 0}
          >
            + افزودن فیلتر
          </button>
        </div>

        {props.filters.length === 0 && <div className="active-filter-box">فیلتری اضافه نشده است.</div>}

        <div className="map-filter-list">
          {props.filters.map((filter, index) => {
            const fields = props.fieldsByLayer[String(filter.layerId)] || [];
            const values = props.getUniqueValues(String(filter.layerId), filter.field);

            return (
              <div key={filter.id} className="filter-card" style={filter.active === false ? { opacity: 0.62 } : undefined}>
                <div className="filter-card-header">
                  <div className="filter-summary">
                    <input 
                      type="checkbox" 
                      checked={filter.active} 
                      onChange={(e) => props.updateFilter(filter.id, { active: e.target.checked })} 
                      style={{ accentColor: "var(--blue)", margin: 0 }} 
                    />
                    {filter.layerType === "polygons" && <span className="filter-color-dot" style={{ background: filter.color }} />}
                    <span>{filter.collapsed ? filterLabel(filter, props.layersById, index + 1) : `${fRef(index)} · فیلتر ${index + 1}`}</span>
                  </div>
                  <div className="filter-card-actions">
                    <IconButton 
                      small 
                      title={filter.collapsed ? "باز کردن" : "بستن"} 
                      icon={filter.collapsed ? "expand" : "collapse"} 
                      onClick={() => props.updateFilter(filter.id, { collapsed: !filter.collapsed })} 
                    />
                    <IconButton 
                      small 
                      title="حذف" 
                      icon="trash" 
                      onClick={() => props.removeFilter(filter.id)} 
                    />
                  </div>
                </div>

                {!filter.collapsed && (
                  <div className="filter-grid filter-grid-two-columns">
                    <div className="map-field-group">
                      <label>لایه</label>
                      <select value={filter.layerId} onChange={(e) => props.updateFilter(filter.id, { layerId: e.target.value })}>
                        {props.filterableLayers.map((layer) => (
                          <option key={layer.id} value={layer.id}>
                            {layerLabel(layer)} ({normType(layer.layer_type)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="map-field-group">
                      <label>فیلد</label>
                      <select value={filter.field} onChange={(e) => props.updateFilter(filter.id, { field: e.target.value })}>
                        <option value="">انتخاب فیلد</option>
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
                      <label>مقدار</label>
                      <select value={filter.value} onChange={(e) => props.updateFilter(filter.id, { value: e.target.value })}>
                        <option value="">انتخاب مقدار</option>
                        {values.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>

                    {filter.layerType === "polygons" && (
                      <>
                        <div className="map-field-group">
                          <label>رنگ</label>
                          <input type="color" value={filter.color} onChange={(e) => props.updateFilter(filter.id, { color: e.target.value })} />
                        </div>
                        <div className="map-field-group">
                          <label>اولویت</label>
                          <input type="number" min="1" value={filter.priority} onChange={(e) => props.updateFilter(filter.id, { priority: Number(e.target.value) })} />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="map-button-group">
          <button type="button" className="map-btn map-btn-primary" onClick={props.applyFilters}>اعمال فیلترها</button>
          <button type="button" className="map-btn map-btn-secondary" onClick={props.clearFilters}>پاکسازی همه</button>
        </div>
      </div>
    </Panel>
  );
};

export default FilterPanel;