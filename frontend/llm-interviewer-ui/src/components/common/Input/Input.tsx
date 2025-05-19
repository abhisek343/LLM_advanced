import React from 'react';
import type { ReactNode, InputHTMLAttributes } from 'react'; // Type-only imports
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  // Note: 'value' and 'onChange' are part of InputHTMLAttributes
}

const Input: React.FC<InputProps> = ({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
  iconLeft,
  iconRight,
  className = '',
  required = false,
  ...props
}) => {
  const inputWrapperClasses = `
    ${styles.inputWrapper}
    ${error ? styles.hasError : ''}
    ${disabled ? styles.disabled : ''}
    ${className}
  `.trim();

  const inputId = id || name; // Ensure there's an id for the label to associate with

  return (
    <div className={inputWrapperClasses}>
      {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
      <div className={styles.fieldContainer}>
        {iconLeft && <span className={`${styles.icon} ${styles.iconLeft}`}>{iconLeft}</span>}
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            ${styles.inputField}
            ${iconLeft ? styles.withIconLeft : ''}
            ${iconRight ? styles.withIconRight : ''}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {iconRight && <span className={`${styles.icon} ${styles.iconRight}`}>{iconRight}</span>}
      </div>
      {error && <p id={`${inputId}-error`} className={styles.errorMessage} role="alert">{error}</p>}
    </div>
  );
};

export default Input;
