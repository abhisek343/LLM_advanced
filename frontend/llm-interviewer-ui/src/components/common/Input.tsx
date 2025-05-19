import React, { type InputHTMLAttributes } from 'react'; // Use type-only import
import styles from './Input.module.css'; // To be created

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  inputClassName?: string; // For direct styling of the input element itself
  labelClassName?: string;
  errorClassName?: string;
  containerClassName?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  id,
  type = 'text',
  error,
  iconLeft,
  iconRight,
  className = '', // Overall container class
  inputClassName = '',
  labelClassName = '',
  errorClassName = '',
  containerClassName = '',
  ...rest
}) => {
  const fieldId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`${styles.inputContainer} ${containerClassName} ${className}`}>
      {label && (
        <label htmlFor={fieldId} className={`${styles.label} ${labelClassName}`}>
          {label}
        </label>
      )}
      <div className={`${styles.inputWrapper} ${error ? styles.inputWrapperError : ''}`}>
        {iconLeft && <span className={`${styles.icon} ${styles.iconLeft}`}>{iconLeft}</span>}
        <input
          type={type}
          id={fieldId}
          className={`${styles.inputElement} ${inputClassName} ${iconLeft ? styles.withIconLeft : ''} ${iconRight ? styles.withIconRight : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          {...rest}
        />
        {iconRight && <span className={`${styles.icon} ${styles.iconRight}`}>{iconRight}</span>}
      </div>
      {error && (
        <p id={`${fieldId}-error`} className={`${styles.errorMessage} ${errorClassName}`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
