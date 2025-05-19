import React, { useState } from 'react';
import type { KeyboardEvent } from 'react'; // Corrected import for KeyboardEvent
import styles from './TagInput.module.css';

interface TagInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
  label?: string;
  id?: string;
  placeholder?: string;
  className?: string;
}

const TagInput: React.FC<TagInputProps> = ({
  tags,
  setTags,
  label,
  id,
  placeholder = "Add a skill and press Enter...",
  className = ''
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag on backspace if input is empty
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove: number) => {
    setTags(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className={`${styles.tagInputContainer} ${className}`}>
      {label && <label htmlFor={id || 'tag-input'} className={styles.label}>{label}</label>}
      <div className={styles.tagsWrapper}>
        {tags.map((tag, index) => (
          <div key={index} className={styles.tag}>
            {tag}
            <button
              type="button"
              className={styles.removeTagButton}
              onClick={() => removeTag(index)}
            >
              &times;
            </button>
          </div>
        ))}
        <input
          type="text"
          id={id || 'tag-input'}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className={styles.input}
        />
      </div>
    </div>
  );
};

export default TagInput;
