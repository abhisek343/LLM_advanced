import React from 'react';
import styles from './Card.module.css'; // To be created

export interface CardProps {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode; // e.g., buttons or links in a footer
  className?: string; // Allow custom classes to be passed
  // Add other props like headerClassName, bodyClassName, footerClassName if more granular control is needed
}

const Card: React.FC<CardProps> = ({
  title,
  children,
  actions,
  className = '',
  ...rest
}) => {
  const cardClasses = [
    styles.cardBase,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} {...rest}>
      {title && (
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{title}</h3>
        </div>
      )}
      <div className={styles.cardBody}>
        {children}
      </div>
      {actions && (
        <div className={styles.cardFooter}>
          {actions}
        </div>
      )}
    </div>
  );
};

export default Card;
