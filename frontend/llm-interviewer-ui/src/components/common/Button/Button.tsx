import React from 'react';
import type { ReactNode } from 'react'; // Type-only import
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'link';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode; // children is fine as it's used in JSX
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  isLoading = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  type = 'button',
  className = '',
  ...props
}, ref) => {
  const buttonClasses = `
    ${styles.button}
    ${styles[variant]}
    ${styles[size]}
    ${fullWidth ? styles.fullWidth : ''}
    ${isLoading ? styles.loading : ''}
    ${className}
  `.trim();

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={buttonClasses}
      {...props}
    >
      {isLoading ? (
        <span className={styles.spinner} role="status" aria-live="polite">
          <span className="visually-hidden">Loading...</span> {/* For screen readers */}
        </span>
      ) : (
        <>
          {iconLeft && <span className={styles.iconWrapperLeft} aria-hidden="true">{iconLeft}</span>}
          {children}
          {iconRight && <span className={styles.iconWrapperRight} aria-hidden="true">{iconRight}</span>}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button'; // Optional: for better debugging names

export default Button;
