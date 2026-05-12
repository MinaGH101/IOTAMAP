// src/components/Map/MapIcons.tsx
import React from 'react';

export const ICONS: Record<string, string> = {
  layers: "M12 3 2 8l10 5 10-5-10-5Zm0 12L4.2 11.1 2 12.2l10 5 10-5-2.2-1.1L12 15Zm0 4L4.2 15.1 2 16.2l10 5 10-5-2.2-1.1L12 19Z",
  filter: "M3 5h18l-7 8v5l-4 2v-7L3 5Z",
  download: "M5 20h14v-2H5v2Zm7-18v11.17l-4.59-4.58L6 10l6 6 6-6-1.41-1.41L13 13.17V2h-1Z",
  crop: "M7 17V3H5v2H3v2h2v10c0 1.1.9 2 2 2h10v2h2v-2h2v-2H7Zm10-2h2V7c0-1.1-.9-2-2-2H9v2h8v8Z",
  visibility: "M12 6.5c3.79 0 6.17 2.13 7.5 5.5-1.33 3.37-3.71 5.5-7.5 5.5S5.83 15.37 4.5 12C5.83 8.63 8.21 6.5 12 6.5Zm0 2A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5Z",
  visibilityOff: "M2.8 4.2 4.2 2.8l17 17-1.4 1.4-3.05-3.05A9.6 9.6 0 0 1 12 19.5c-4.75 0-7.75-2.83-9.5-7.5a11.7 11.7 0 0 1 3.1-4.55L2.8 4.2Zm9.2.3c4.75 0 7.75 2.83 9.5 7.5a11.8 11.8 0 0 1-2.58 4.02l-2.16-2.16A3.5 3.5 0 0 0 12.14 9.24L9.86 6.96A8.2 8.2 0 0 1 12 4.5Z",
  close: "M18.3 5.71 16.89 4.3 12 9.17 7.11 4.3 5.7 5.71 10.59 10.6 5.7 15.49 7.11 16.9 12 12.01l4.89 4.89 1.41-1.41-4.89-4.89 4.89-4.89Z",
  collapse: "M6 11h12v2H6v-2Z",
  expand: "M7 7h10v10H7V7Zm2 2v6h6V9H9Z",
  trash: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12ZM8 4l1-1h6l1 1h4v2H4V4h4Z",
};

export const Icon: React.FC<{ name: string; size?: number }> = ({ name, size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d={ICONS[name]} />
  </svg>
);

interface IconButtonProps {
  title: string;
  icon: string;
  onClick: (e: React.MouseEvent) => void;
  small?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({ title, icon, onClick, small = false }) => (
  <button 
    type="button" 
    title={title} 
    onClick={onClick} 
    className={`map-icon-button ${small ? "map-icon-button-small" : ""}`.trim()}
  >
    <Icon name={icon} size={small ? 16 : 18} />
  </button>
);