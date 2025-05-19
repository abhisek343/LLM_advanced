import React, { useEffect, useRef } from 'react';
import styles from './Modal.module.css'; // To be created
// import { XIcon } from '@heroicons/react/outline'; // Example for an icon

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  className?: string; // Custom class for the modal dialog
  overlayClassName?: string; // Custom class for the overlay
  // Add other props like 'closeOnOverlayClick' if needed
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footerContent,
  size = 'medium',
  className = '',
  overlayClassName = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle Escape key press to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      // Focus trapping can be added here
      modalRef.current?.focus(); // Focus the modal itself or a focusable element within
    }
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset'; // Cleanup on unmount
    };
  }, [isOpen]);


  if (!isOpen) {
    return null;
  }

  const modalDialogClasses = [
    styles.modalDialog,
    styles[size], // e.g. styles.medium, styles.fullscreen
    className,
  ].filter(Boolean).join(' ');

  const modalOverlayClasses = [
    styles.modalOverlay,
    overlayClassName,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={modalOverlayClasses}
      onClick={onClose} // Basic close on overlay click, can be made optional
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      tabIndex={-1} // Make overlay focusable for screen readers if needed, though dialog itself is better
    >
      <div
        ref={modalRef}
        className={modalDialogClasses}
        onClick={(e) => e.stopPropagation()} // Prevent click inside modal from closing it
        tabIndex={-1} // For focusing the modal programmatically
      >
        <header className={styles.modalHeader}>
          {title && <h2 id="modal-title" className={styles.modalTitle}>{title}</h2>}
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            {/* Replace with actual X icon component or SVG */}
            <span aria-hidden="true">&times;</span>
          </button>
        </header>
        <div className={styles.modalBody}>
          {children}
        </div>
        {footerContent && (
          <footer className={styles.modalFooter}>
            {footerContent}
          </footer>
        )}
      </div>
    </div>
  );
};

export default Modal;
