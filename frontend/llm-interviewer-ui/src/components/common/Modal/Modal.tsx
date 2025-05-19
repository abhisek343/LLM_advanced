import React, { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import styles from './Modal.module.css'; // To be created
import Button from '../Button/Button'; // For close button

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footerContent?: ReactNode;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footerContent,
  size = 'medium',
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
      // Set focus to the modal or an element within it
      // Focusing the close button is a common pattern
      closeButtonRef.current?.focus(); 
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const modalClasses = `
    ${styles.modal}
    ${styles[size]}
    ${className}
  `.trim();

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby={title ? 'modal-title' : undefined}>
      <div ref={modalRef} className={modalClasses} onClick={(e) => e.stopPropagation()} tabIndex={-1}>
        <div className={styles.modalHeader}>
          {title && <h2 id="modal-title" className={styles.modalTitle}>{title}</h2>}
          <Button ref={closeButtonRef} onClick={onClose} className={styles.closeButton} variant="link" aria-label="Close modal">
            &times; {/* Or an icon component */}
          </Button>
        </div>
        <div className={styles.modalBody}>
          {children}
        </div>
        {footerContent && (
          <div className={styles.modalFooter}>
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
