import type { ReactNode } from 'react';
import styles from './FilterBar.module.css';

interface FilterChipData {
  id: string;
  label: string;
  icon?: ReactNode;
  active: boolean;
}

interface FilterBarProps {
  label?: string;
  chips: FilterChipData[];
  onToggle: (id: string) => void;
  className?: string;
}

export function FilterBar({ label, chips, onToggle, className = '' }: FilterBarProps) {
  return (
    <div className={`${styles.bar} ${className}`}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.chips}>
        {chips.map((chip) => (
          <button
            key={chip.id}
            className={`${styles.chip} ${chip.active ? styles.active : ''}`}
            onClick={() => onToggle(chip.id)}
          >
            {chip.icon && <span className={styles.chipIcon}>{chip.icon}</span>}
            <span>{chip.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
