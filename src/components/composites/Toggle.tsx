import styles from './Toggle.module.css';

interface ToggleProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Toggle({ checked = false, onChange, disabled = false, className = '' }: ToggleProps) {
  return (
    <label className={`${styles.toggle} ${disabled ? styles.disabled : ''} ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
        className={styles.input}
      />
      <span className={styles.slider} />
    </label>
  );
}
