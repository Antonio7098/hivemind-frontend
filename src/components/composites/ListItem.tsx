import type { ReactNode, MouseEventHandler } from 'react';
import { motion } from 'motion/react';
import styles from './ListItem.module.css';

interface ListItemProps {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: MouseEventHandler;
  selected?: boolean;
  delay?: number;
  className?: string;
}

export function ListItem({
  icon,
  title,
  subtitle,
  trailing,
  onClick,
  selected = false,
  delay = 0,
  className = '',
}: ListItemProps) {
  return (
    <motion.div
      className={`${styles.item} ${selected ? styles.selected : ''} ${className}`}
      onClick={onClick}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.2 }}
    >
      {icon && <div className={styles.icon}>{icon}</div>}
      <div className={styles.content}>
        <span className={styles.title}>{title}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>
      {trailing && <div className={styles.trailing}>{trailing}</div>}
    </motion.div>
  );
}
