import React, { type SelectHTMLAttributes } from 'react'; // Use type-only import
import styles from './Select.module.css'; // To be created

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  label?: string;
  error?: string;
  labelClassName?: string;
  errorClassName?: string;
  containerClassName?: string;
  selectClassName?: string;
  placeholder?: string; // For the default "Select an option" type of message
}

const Select: React.FC<SelectProps> = ({
  options,
  label,
  id,
  error,
  className = '', // Overall container class
  selectClassName = '',
  labelClassName = '',
  errorClassName = '',
  containerClassName = '',
  placeholder,
  value, // Ensure value is controlled
  ...rest
}) => {
  const fieldId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`${styles.selectContainer} ${containerClassName} ${className}`}>
      {label && (
        <label htmlFor={fieldId} className={`${styles.label} ${labelClassName}`}>
          {label}
        </label>
      )}
      <div className={`${styles.selectWrapper} ${error ? styles.selectWrapperError : ''}`}>
        <select
          id={fieldId}
          className={`${styles.selectElement} ${selectClassName}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          value={value} // Controlled component
          {...rest}
        >
          {placeholder && <option value="" disabled={value !== ""}>{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <span className={styles.selectArrow}></span> {/* For custom arrow styling */}
      </div>
      {error && (
        <p id={`${fieldId}-error`} className={`${styles.errorMessage} ${errorClassName}`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Select;
