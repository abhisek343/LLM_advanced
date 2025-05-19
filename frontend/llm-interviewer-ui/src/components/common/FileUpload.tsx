import React, { useState, useCallback, type InputHTMLAttributes } from 'react'; // Use type-only import
import styles from './FileUpload.module.css'; // To be created

export interface FileUploadProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  onFileSelect: (file: File | null) => void;
  label?: string; // e.g., "Choose File" or "Drag & Drop Resume"
  acceptedFileTypes?: string; // e.g., ".pdf,.docx", "image/*"
  disabled?: boolean;
  className?: string; // For the overall container
  inputClassName?: string; // For the hidden input
  dropzoneClassName?: string; // For the dropzone area
  fileNameDisplayClassName?: string; // For displaying the selected file name
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  label = 'Drag & drop a file here, or click to select file',
  acceptedFileTypes,
  disabled = false,
  className = '',
  inputClassName = '',
  dropzoneClassName = '',
  fileNameDisplayClassName = '',
  id,
  ...rest
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputId = id || 'file-upload-input';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    setSelectedFile(file || null);
    onFileSelect(file || null);
  };

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // You can add visual cues here if needed
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) {
      // Optional: Check against acceptedFileTypes if needed here, though input's accept attribute does some work
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [disabled, onFileSelect]);

  return (
    <div className={`${styles.fileUploadContainer} ${className}`}>
      <div
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${disabled ? styles.disabled : ''} ${dropzoneClassName}`}
        onClick={() => document.getElementById(inputId)?.click()} // Trigger hidden input click
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-labelledby={`${inputId}-label`}
      >
        <input
          type="file"
          id={inputId}
          accept={acceptedFileTypes}
          onChange={handleFileChange}
          disabled={disabled}
          className={`${styles.hiddenInput} ${inputClassName}`}
          {...rest}
        />
        <span id={`${inputId}-label`} className={styles.dropzoneLabel}>
          {selectedFile ? `Selected: ${selectedFile.name}` : label}
        </span>
      </div>
      {selectedFile && fileNameDisplayClassName && ( // Optional separate display for file name
        <div className={`${styles.fileNameDisplay} ${fileNameDisplayClassName}`}>
          File: {selectedFile.name}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
