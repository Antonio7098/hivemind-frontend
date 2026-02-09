import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import styles from './MetricCard.module.css';

interface MetricCardProps {
  icon: ReactNode;
  value: number | string;
  label: string;
  color: string;
  className?: string;
}

export function MetricCard({ icon, value, label, color, className = '' }: MetricCardProps) {
  return (
    <div className={`${styles.card} ${className}`}>
      <div className={styles.icon} style={{ color }}>
        {icon}
      </div>
      <div className={styles.content}>
        <motion.span
          className={styles.value}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {value}
        </motion.span>
        <span className={styles.label}>{label}</span>
      </div>
      <div className={styles.glow} style={{ background: color }} />
    </div>
  );
}
