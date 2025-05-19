import React from 'react';
import styles from './AlertMessage.module.css'; // To be created
// import { XIcon } from '@heroicons/react/solid'; // Example for an icon, replace with actual icon solution

export interface AlertMessageProps {
  message: React.ReactNode;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  closable?: boolean;
  onClose?: () => void;
  className?: string;
  icon?: React.ReactNode; // Allow passing a custom icon
}

const AlertMessage: React.FC<AlertMessageProps> = ({
  message,
  type,
  title,
  closable = false,
  onClose,
  className = '',
  icon,
}) => {
  const alertClasses = [
    styles.alertBase,
    styles[type], // e.g., styles.success, styles.error
    className,
  ].filter(Boolean).join(' ');

  // Default icons based on type (can be overridden by `icon` prop)
  let defaultIcon = null;
  if (!icon) {
    switch (type) {
      case 'success':
        defaultIcon = <span className={styles.defaultIcon}>✓</span>; // Placeholder
        break;
      case 'error':
        defaultIcon = <span className={styles.defaultIcon}>✕</span>; // Placeholder
        break;
      case 'warning':
        defaultIcon = <span className={styles.defaultIcon}>⚠</span>; // Placeholder
        break;
      case 'info':
        defaultIcon = <span className={styles.defaultIcon}>ℹ</span>; // Placeholder
        break;
    }
  }
  const displayIcon = icon || defaultIcon;

  return (
    <div className={alertClasses} role="alert">
      {displayIcon && <div className={styles.iconWrapper}>{displayIcon}</div>}
      <div className={styles.contentWrapper}>
        {title && <h4 className={styles.alertTitle}>{title}</h4>}
        <div className={styles.alertMessage}>{message}</div>
      </div>
      {closable && onClose && (
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close alert"
        >
          {/* Replace with actual X icon component or SVG */}
          <span aria-hidden="true">&times;</span> 
        </button>
      )}
    </div>
  );
};

export default AlertMessage;
