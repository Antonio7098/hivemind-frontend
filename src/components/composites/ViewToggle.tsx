import type { ReactNode } from 'react';
import styles from './ViewToggle.module.css';

interface ViewOption {
  id: string;
  icon: ReactNode;
  label?: string;
}

interface ViewToggleProps {
  options: ViewOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export function ViewToggle({ options, value, onChange, className = '' }: ViewToggleProps) {
  return (
    <div className={`${styles.toggle} ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.id}
          className={`${styles.btn} ${value === opt.id ? styles.active : ''}`}
          onClick={() => onChange(opt.id)}
          title={opt.label}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}
