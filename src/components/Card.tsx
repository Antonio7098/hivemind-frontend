import { motion } from 'motion/react';
import type { ReactNode, MouseEventHandler } from 'react';
import styles from './Card.module.css';

// ═══════════════════════════════════════════════════════════════════════════
// CARD COMPONENT
// Elevated surface container with optional header and footer
// ═══════════════════════════════════════════════════════════════════════════

interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: ReactNode;
  footer?: ReactNode;
  hoverable?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
  className?: string;
  children: ReactNode;
}

export function Card({
  variant = 'default',
  padding = 'md',
  header,
  footer,
  hoverable = false,
  onClick,
  className = '',
  children,
}: CardProps) {
  const cardClassName = `${styles.card} ${styles[variant]} ${styles[`padding-${padding}`]} ${className}`;

  if (hoverable) {
    return (
      <motion.div
        className={cardClassName}
        onClick={onClick}
        whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)' }}
        transition={{ duration: 0.2 }}
      >
        {header && <div className={styles.header}>{header}</div>}
        <div className={styles.content}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </motion.div>
    );
  }

  return (
    <div className={cardClassName} onClick={onClick}>
      {header && <div className={styles.header}>{header}</div>}
      <div className={styles.content}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
