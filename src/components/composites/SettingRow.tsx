import type { ReactNode } from 'react';
import styles from './SettingRow.module.css';

interface SettingRowProps {
  label: string;
  description?: string;
  control: ReactNode;
  className?: string;
}

export function SettingRow({ label, description, control, className = '' }: SettingRowProps) {
  return (
    <div className={`${styles.row} ${className}`}>
      <div className={styles.info}>
        <span className={styles.label}>{label}</span>
        {description && <span className={styles.desc}>{description}</span>}
      </div>
      <div className={styles.control}>{control}</div>
    </div>
  );
}
