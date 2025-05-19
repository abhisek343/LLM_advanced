import React from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import styles from './Checkbox.module.css'; // To be created

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  label?: string | ReactNode; // Allow ReactNode for complex labels like those with links
  // 'checked', 'onChange', 'name', 'id', 'disabled' are part of InputHTMLAttributes
}

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  id,
  name,
  checked,
  onChange,
  disabled = false,
  className = '',
  required = false,
  ...props
}) => {
  const checkboxWrapperClasses = `
    ${styles.checkboxWrapper}
    ${disabled ? styles.disabled : ''}
    ${className}
  `.trim();

  const checkboxId = id || name;

  return (
    <div className={checkboxWrapperClasses}>
      <input
        type="checkbox"
        id={checkboxId}
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={styles.checkboxInput}
        {...props}
      />
      {label && (
        <label htmlFor={checkboxId} className={styles.checkboxLabel}>
          {label}
        </label>
      )}
    </div>
  );
};

export default Checkbox;
