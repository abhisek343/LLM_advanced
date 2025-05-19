import React from 'react';
import type { ReactNode } from 'react';
import styles from './Card.module.css'; // To be created

interface CardProps {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  cardStyle?: React.CSSProperties; // Allow passing inline styles for the card itself
  headerStyle?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  actionsStyle?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({
  title,
  children,
  actions,
  className = '',
  cardStyle,
  headerStyle,
  bodyStyle,
  actionsStyle,
}) => {
  const cardClasses = `${styles.card} ${className}`.trim();

  return (
    <div className={cardClasses} style={cardStyle}>
      {title && (
        <div className={styles.cardHeader} style={headerStyle}>
          <h2 className={styles.cardTitle}>{title}</h2>
        </div>
      )}
      <div className={styles.cardBody} style={bodyStyle}>
        {children}
      </div>
      {actions && (
        <div className={styles.cardActions} style={actionsStyle}>
          {actions}
        </div>
      )}
    </div>
  );
};

export default Card;
