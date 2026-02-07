import type { ReactNode } from 'react';
import styles from './Badge.module.css';

// ═══════════════════════════════════════════════════════════════════════════
// BADGE COMPONENT
// Small status labels and tags
// ═══════════════════════════════════════════════════════════════════════════

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'amber';
  size?: 'sm' | 'md';
  icon?: ReactNode;
  children: ReactNode;
}

export function Badge({
  variant = 'default',
  size = 'md',
  icon,
  children,
}: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${styles[size]}`}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </span>
  );
}
