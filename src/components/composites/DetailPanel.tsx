import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import styles from './DetailPanel.module.css';

interface DetailPanelProps {
  open: boolean;
  onClose: () => void;
  header?: ReactNode;
  children: ReactNode;
  width?: number;
  position?: 'right' | 'bottom';
}

export function DetailPanel({
  open,
  onClose,
  header,
  children,
  width = 420,
  position = 'right',
}: DetailPanelProps) {
  const isRight = position === 'right';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`${styles.panel} ${styles[position]}`}
          style={isRight ? { width } : undefined}
          initial={isRight ? { x: '100%' } : { y: '100%' }}
          animate={isRight ? { x: 0 } : { y: 0 }}
          exit={isRight ? { x: '100%' } : { y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          {header && (
            <div className={styles.header}>
              <div className={styles.headerContent}>{header}</div>
              <button className={styles.closeBtn} onClick={onClose}>
                &times;
              </button>
            </div>
          )}
          <div className={styles.body}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
