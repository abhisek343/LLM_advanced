import React from 'react';
import styles from './Spinner.module.css'; // To be created

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string; // Allows custom color, though CSS will define default
  className?: string;
  text?: string; // Optional text to display below or next to the spinner
}

const Spinner: React.FC<SpinnerProps> = ({
  size = 'medium',
  color,
  className = '',
  text,
}) => {
  const spinnerClasses = `
    ${styles.spinnerContainer}
    ${className}
  `.trim();

  const spinnerStyle: React.CSSProperties = {};
  if (color) {
    spinnerStyle.borderColor = `${color} transparent transparent transparent`; // For a border-based spinner
    // If using a different spinner style, adjust accordingly
  }
  
  // The actual spinner element might be more complex depending on the chosen CSS animation
  // This is a basic structure for a border-based spinner
  return (
    <div className={spinnerClasses}>
      <div className={`${styles.spinner} ${styles[size]}`} style={spinnerStyle} role="status" aria-live="polite">
        <span className="visually-hidden">Loading...</span> {/* For screen readers */}
      </div>
      {text && <span className={styles.spinnerText}>{text}</span>}
    </div>
  );
};

export default Spinner;
