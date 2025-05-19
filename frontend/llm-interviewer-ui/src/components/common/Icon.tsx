import React from 'react';
import styles from './Icon.module.css'; // To be created

// This is a very basic placeholder.
// A real Icon component would likely:
// - Use an SVG sprite sheet
// - Import individual SVG components
// - Use an icon font library (e.g., Font Awesome, Material Icons)

export interface IconProps {
  name: string; // Identifier for the icon (e.g., "user", "settings", "delete")
  size?: string | number; // e.g., "1em", "24px", 24
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string; // For accessibility (tooltip)
}

const Icon: React.FC<IconProps> = ({
  name,
  size,
  color,
  className = '',
  style,
  title,
}) => {
  // Placeholder rendering - just displays the name.
  // In a real implementation, this would render an <svg> or <i> tag.
  
  const iconStyle: React.CSSProperties = {
    fontSize: size,
    color: color,
    ...style,
  };

  // Example of how one might map names to simple text icons (very basic)
  let iconContent = `[${name}]`; // Default placeholder
  if (name === 'user') iconContent = '👤';
  else if (name === 'settings') iconContent = '⚙️';
  else if (name === 'delete') iconContent = '🗑️';
  else if (name === 'close') iconContent = '✕';
  // Add more mappings as needed or implement a proper SVG/font icon system

  return (
    <span
      className={`${styles.iconBase} ${className}`}
      style={iconStyle}
      role="img" // If it's purely decorative, role="presentation" or hide with aria-hidden
      aria-label={title || name} // Provide an accessible name
      title={title} // Tooltip on hover
    >
      {iconContent}
    </span>
  );
};

export default Icon;
