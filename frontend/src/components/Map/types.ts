import { Map } from 'ol';

export interface LayerData {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  olLayer: any; // The actual OpenLayers layer object
}

export interface MapProps {
  projectId: string;
  mapInstance: Map | null;
}
