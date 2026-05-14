import React from 'react';

interface IconButtonProps {
  icon: string;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  active?: boolean;
  small?: boolean;
  className?: string;
  style?: React.CSSProperties; // Added this to fix the error
}

export const IconButton: React.FC<IconButtonProps> = ({ 
  icon, onClick, title, active, small, className = "", style 
}) => {
  const getIconPath = (name: string) => {
    switch (name) {
      case 'layers': return "M12 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.37 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.64 1.27L12 16z";
      case 'filter': return "M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z";
      case 'close': return "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z";
      case 'expand': return "M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z";
      case 'collapse': return "M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z";
      case 'download': return "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z";
      case 'crop': return "M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z";
      case 'visibility': return "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 3.39 6 6.5 11 6.5s9.27-3.11 11-6.5c-1.73-3.39-6-6.5-11-6.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z";
      case 'visibilityOff': return "M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.82l2.92 2.92c1.51-1.39 2.7-3.13 3.44-5.06-1.73-3.39-6-6.5-11-6.5-1.57 0-3.01.3-4.32.84l2.45 2.45c.59-.15 1.22-.25 1.87-.25zM4.27 3L3 4.27l2.04 2.04C3.27 7.73 2.01 9.72 1.34 11.75c1.73 3.39 6 6.5 11 6.5 1.47 0 2.87-.26 4.14-.73L19.73 21 21 19.73 4.27 3zM9.51 9.51l3.46 3.46C12.68 12.8 12.35 13 12 13c-1.66 0-3-1.34-3-3 0-.35.2-.68.49-.97z";
      case 'trash': return "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z";
      default: return "";
    }
  };

  return (
    <button 
      title={title}
      onClick={onClick}
      className={`map-icon-button ${active ? 'is-active' : ''} ${small ? 'is-small' : ''} ${className}`}
      style={style}
    >
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d={getIconPath(icon)} />
      </svg>
    </button>
  );
};