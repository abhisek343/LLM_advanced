import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Button.module.css';
import Spinner from './Spinner'; // Import the Spinner component

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'link';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  isLoading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  to?: string; // For Link-like behavior if not disabled/loading
  className?: string; // Allow custom classes to be passed
  // Add any other props like aria-label, etc., as needed for accessibility
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  isLoading = false,
  iconLeft,
  iconRight,
  type = 'button',
  fullWidth = false,
  to,
  className = '',
  ...rest // Capture any other standard button attributes
}) => {
  const buttonClasses = [
    styles.buttonBase,
    styles[variant], // e.g., styles.primary, styles.secondary
    styles[size],   // e.g., styles.small, styles.medium
    fullWidth ? styles.fullWidth : '',
    isLoading ? styles.loading : '',
    disabled ? styles.disabled : '',
    className,
  ].filter(Boolean).join(' '); // Filter(Boolean) removes any falsy values (e.g. empty strings from undefined classes)

  const content = (
    <>
      {isLoading && <Spinner size="small" className={styles.spinnerWithinButton} />}
      {!isLoading && iconLeft && <span className={styles.iconWrapper + ' ' + styles.iconLeft}>{iconLeft}</span>}
      <span className={styles.buttonText}>{children}</span>
      {!isLoading && iconRight && <span className={styles.iconWrapper + ' ' + styles.iconRight}>{iconRight}</span>}
    </>
  );

  if (to && !disabled && !isLoading) {
    return (
      <Link to={to} className={buttonClasses} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={buttonClasses}
      disabled={disabled || isLoading}
      {...rest}
    >
      {content}
    </button>
  );
};

export default Button;
