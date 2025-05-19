import React from 'react';
import type { TextareaHTMLAttributes } from 'react'; // Type-only import
import styles from './Textarea.module.css';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  // value, onChange, name, id, rows, placeholder are part of TextareaHTMLAttributes
}

const Textarea: React.FC<TextareaProps> = ({
  label,
  id,
  name,
  value,
  onChange,
  placeholder,
  rows = 4, // Default rows
  disabled = false,
  error,
  className = '',
  required = false,
  ...props
}) => {
  const textareaWrapperClasses = `
    ${styles.textareaWrapper}
    ${error ? styles.hasError : ''}
    ${disabled ? styles.disabled : ''}
    ${className}
  `.trim();

  const textareaId = id || name; // Ensure there's an id for the label

  return (
    <div className={textareaWrapperClasses}>
      {label && <label htmlFor={textareaId} className={styles.label}>{label}</label>}
      <textarea
        id={textareaId}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        required={required}
        className={styles.textareaField}
        aria-invalid={!!error}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        {...props}
      />
      {error && <p id={`${textareaId}-error`} className={styles.errorMessage} role="alert">{error}</p>}
    </div>
  );
};

export default Textarea;
