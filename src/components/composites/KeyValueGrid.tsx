import styles from './KeyValueGrid.module.css';

interface KVPair {
  label: string;
  value: string | number;
}

interface KeyValueGridProps {
  items: KVPair[];
  columns?: number;
  className?: string;
}

export function KeyValueGrid({ items, columns = 2, className = '' }: KeyValueGridProps) {
  return (
    <div
      className={`${styles.grid} ${className}`}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {items.map((item, i) => (
        <div key={i} className={styles.item}>
          <span className={styles.label}>{item.label}</span>
          <span className={styles.value}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
