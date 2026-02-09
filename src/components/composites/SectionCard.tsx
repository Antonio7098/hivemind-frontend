import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import styles from './SectionCard.module.css';

interface SectionCardProps {
  icon?: ReactNode;
  title: string;
  delay?: number;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ icon, title, delay = 0, children, className = '' }: SectionCardProps) {
  return (
    <motion.div
      className={`${styles.section} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className={styles.header}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <h3 className={styles.title}>{title}</h3>
      </div>
      <div className={styles.content}>{children}</div>
    </motion.div>
  );
}
