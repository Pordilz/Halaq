import React from 'react';

/**
 * Wrapper for Google Material Symbols Outlined
 * @param {{ name: string, fill?: boolean, size?: number, className?: string, style?: object }} props
 */
export default function MaterialIcon({ name, fill = false, size = 24, className = '', style = {} }) {
  // Use font-variation-settings for standard material symbols styling
  const variationStyle = {
    fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
    fontSize: `${size}px`,
    ...style
  };

  return (
    <span 
      className={`material-symbols-outlined ${className}`}
      style={variationStyle}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
