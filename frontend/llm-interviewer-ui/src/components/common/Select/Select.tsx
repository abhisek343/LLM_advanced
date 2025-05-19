import React from 'react';
import type { SelectHTMLAttributes } from 'react'; // Type-only import
import styles from './Select.module.css';

interface Option {
  value: string | number;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
  error?: string;
  placeholder?: string; // Added placeholder to props interface
  // value, onChange, name, id are part of SelectHTMLAttributes
}

const Select: React.FC<SelectProps> = ({
  label,
  id,
  name,
  value,
  onChange,
  options,
  disabled = false,
  error,
  className = '',
  required = false,
  placeholder,
  ...props
}) => {
  const selectWrapperClasses = `
    ${styles.selectWrapper}
    ${error ? styles.hasError : ''}
    ${disabled ? styles.disabled : ''}
    ${className}
  `.trim();

  const selectId = id || name;

  return (
    <div className={selectWrapperClasses}>
      {label && <label htmlFor={selectId} className={styles.label}>{label}</label>}
      <select
        id={selectId}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={styles.selectField}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p id={`${selectId}-error`} className={styles.errorMessage} role="alert">{error}</p>}
    </div>
  );
};

export default Select;
