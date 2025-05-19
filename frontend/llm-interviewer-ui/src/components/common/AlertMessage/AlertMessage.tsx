import React from 'react';
import styles from './AlertMessage.module.css'; // To be created
import Button from '../Button/Button'; // For close button, if used

interface AlertMessageProps {
  message: string | React.ReactNode;
  type: 'success' | 'error' | 'warning' | 'info';
  closable?: boolean;
  onClose?: () => void;
  className?: string;
}

const AlertMessage: React.FC<AlertMessageProps> = ({
  message,
  type,
  closable = false,
  onClose,
  className = '',
}) => {
  const alertClasses = `
    ${styles.alertMessage}
    ${styles[type]}
    ${className}
  `.trim();

  return (
    <div className={alertClasses} role="alert">
      <span className={styles.messageText}>{message}</span>
      {closable && onClose && (
        <Button 
          onClick={onClose} 
          className={styles.closeButton} 
          variant="link" // Use link variant for a less obtrusive close button
          aria-label="Close alert"
        >
          &times; {/* Or an icon component */}
        </Button>
      )}
    </div>
  );
};

export default AlertMessage;
