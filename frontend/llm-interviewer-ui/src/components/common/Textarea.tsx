import React, { type TextareaHTMLAttributes } from 'react'; // Use type-only import
import styles from './Textarea.module.css'; // To be created

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  labelClassName?: string;
  errorClassName?: string;
  containerClassName?: string;
  textareaClassName?: string;
}

const Textarea: React.FC<TextareaProps> = ({
  label,
  id,
  error,
  className = '', // Overall container class
  textareaClassName = '',
  labelClassName = '',
  errorClassName = '',
  containerClassName = '',
  rows = 3,
  ...rest
}) => {
  const fieldId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`${styles.textareaContainer} ${containerClassName} ${className}`}>
      {label && (
        <label htmlFor={fieldId} className={`${styles.label} ${labelClassName}`}>
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        className={`${styles.textareaElement} ${textareaClassName} ${error ? styles.textareaError : ''}`}
        rows={rows}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${fieldId}-error`} className={`${styles.errorMessage} ${errorClassName}`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Textarea;
