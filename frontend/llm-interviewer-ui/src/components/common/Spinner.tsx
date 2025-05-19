import React from 'react';
import styles from './Spinner.module.css'; // To be created

export interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string; // Allows overriding the default color via style prop or specific class
  className?: string; // For additional custom styling
  style?: React.CSSProperties; // For inline styles like color
  ariaLabel?: string;
}

const Spinner: React.FC<SpinnerProps> = ({
  size = 'medium',
  color, // If color is provided, it will be used as inline style
  className = '',
  style,
  ariaLabel = 'Loading...',
}) => {
  const spinnerClasses = [
    styles.spinnerBase,
    styles[size], // e.g., styles.small, styles.medium
    className,
  ].filter(Boolean).join(' ');

  const spinnerStyle = color ? { ...style, borderColor: `${color} transparent transparent transparent` } : style;
  // The border color trick is for a simple CSS spinner.
  // A more complex SVG spinner might handle color differently.

  return (
    <div
      className={spinnerClasses}
      style={spinnerStyle}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      {/* The visual spinner is typically created with CSS borders or SVG */}
      {/* This div itself is the spinner via CSS */}
    </div>
  );
};

export default Spinner;
