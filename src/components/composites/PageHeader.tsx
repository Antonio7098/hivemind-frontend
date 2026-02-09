import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  titleAccent?: string;
  subtitle?: string;
  actions?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  titleAccent,
  subtitle,
  actions,
  trailing,
  className = '',
}: PageHeaderProps) {
  return (
    <motion.header
      className={`${styles.header} ${className}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.content}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>
            {titleAccent ? (
              <>
                <span className={styles.accent}>{titleAccent}</span>{' '}
                {title}
              </>
            ) : (
              title
            )}
          </h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {trailing && <div className={styles.trailing}>{trailing}</div>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </motion.header>
  );
}
