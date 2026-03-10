import { type ReactNode } from 'react';
import { motion } from 'motion/react';
import styles from './DataList.module.css';

type DataListProps = {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'compact' | 'cards';
  columns?: 1 | 2 | 3;
};

export function DataList({ children, className = '', variant = 'default', columns = 1 }: DataListProps) {
  return (
    <div className={`${styles.dataList} ${styles[variant]} ${styles[`cols-${columns}`]} ${className}`}>
      {children}
    </div>
  );
}

type DataListItemProps = {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  status?: 'default' | 'success' | 'warning' | 'error' | 'info';
  delay?: number;
  className?: string;
};

export function DataListItem({
  icon,
  title,
  subtitle,
  value,
  trailing,
  onClick,
  selected = false,
  status = 'default',
  delay = 0,
  className = '',
}: DataListItemProps) {
  const Component = onClick ? motion.button : motion.div;

  return (
    <Component
      className={`${styles.item} ${selected ? styles.selected : ''} ${styles[`status-${status}`]} ${onClick ? styles.clickable : ''} ${className}`}
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2 }}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <div className={styles.content}>
        <span className={styles.title}>{title}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>
      {value !== undefined && <span className={styles.value}>{value}</span>}
      {trailing && <span className={styles.trailing}>{trailing}</span>}
    </Component>
  );
}

type DataListHeaderProps = {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function DataListHeader({ children, action, className = '' }: DataListHeaderProps) {
  return (
    <div className={`${styles.header} ${className}`}>
      <span className={styles.headerTitle}>{children}</span>
      {action && <span className={styles.headerAction}>{action}</span>}
    </div>
  );
}

type DataListEmptyProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function DataListEmpty({ icon, title, description, action }: DataListEmptyProps) {
  return (
    <div className={styles.empty}>
      {icon && <span className={styles.emptyIcon}>{icon}</span>}
      <span className={styles.emptyTitle}>{title}</span>
      {description && <span className={styles.emptyDescription}>{description}</span>}
      {action && <span className={styles.emptyAction}>{action}</span>}
    </div>
  );
}
