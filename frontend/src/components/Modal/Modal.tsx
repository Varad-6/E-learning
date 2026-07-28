import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './Modal.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = '600px',
  icon,
  className = ''
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay-backdrop" onClick={onClose}>
      <div 
        className={`modal-shell-container glass-panel animate-fade-in ${className}`}
        style={{ maxWidth }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Sticky Header Zone (Pinned Top) */}
        <div className="modal-header-zone">
          <div className="modal-title-row">
            {icon && <div className="modal-title-icon">{icon}</div>}
            <div>
              <h2 className="modal-title-heading">{title}</h2>
              {subtitle && <p className="modal-subtitle-text">{subtitle}</p>}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close Modal" type="button">
            <X size={20} />
          </button>
        </div>

        {/* 2. Scrollable Body Zone (Only Content Scrolls) */}
        <div className="modal-body-scroll-zone">
          {children}
        </div>

        {/* 3. Sticky Footer Zone (Pinned Bottom) */}
        {footer && (
          <div className="modal-footer-zone">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
