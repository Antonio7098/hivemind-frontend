import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import styles from './DetailModal.module.css';

type DetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  mode?: 'modal' | 'panel';
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
};

export function DetailModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  mode = 'modal',
  width = 'lg',
  className = '',
}: DetailModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {mode === 'modal' && (
            <motion.div
              className={styles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
          )}
          <motion.div
            className={`${styles.container} ${styles[mode]} ${styles[`width-${width}`]} ${className}`}
            initial={mode === 'modal' 
              ? { opacity: 0, scale: 0.95, y: 20 }
              : { opacity: 0, x: '100%' }
            }
            animate={mode === 'modal'
              ? { opacity: 1, scale: 1, y: 0 }
              : { opacity: 1, x: 0 }
            }
            exit={mode === 'modal'
              ? { opacity: 0, scale: 0.95, y: 20 }
              : { opacity: 0, x: '100%' }
            }
            transition={{ 
              type: 'spring', 
              stiffness: 400, 
              damping: 30,
              mass: 0.8
            }}
          >
            {(title || subtitle) && (
              <div className={styles.header}>
                <div className={styles.titleGroup}>
                  {title && <h2 className={styles.title}>{title}</h2>}
                  {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                </div>
                <button className={styles.closeButton} onClick={onClose} aria-label="Close">
                  <X size={20} />
                </button>
              </div>
            )}
            <div className={styles.content}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

type DetailToggleProps = {
  mode: 'modal' | 'panel';
  onToggle: () => void;
  className?: string;
};

export function DetailToggle({ mode, onToggle, className = '' }: DetailToggleProps) {
  return (
    <button
      className={`${styles.toggle} ${className}`}
      onClick={onToggle}
      title={mode === 'modal' ? 'Switch to side panel' : 'Switch to modal'}
    >
      <span className={styles.toggleIcon}>
        {mode === 'modal' ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2" width="14" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="3" y="3" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        )}
      </span>
    </button>
  );
}
