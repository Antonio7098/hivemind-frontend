import styles from './ProgressBar.module.css';

interface ProgressSegment {
  value: number;
  color: string;
  label?: string;
}

interface ProgressBarProps {
  segments: ProgressSegment[];
  total: number;
  height?: number;
  showLegend?: boolean;
  className?: string;
}

export function ProgressBar({
  segments,
  total,
  height = 4,
  showLegend = false,
  className = '',
}: ProgressBarProps) {
  return (
    <div className={`${styles.wrapper} ${className}`}>
      <div className={styles.bar} style={{ height }}>
        {segments.map((seg, i) =>
          seg.value > 0 ? (
            <div
              key={i}
              className={styles.segment}
              style={{
                width: `${(seg.value / total) * 100}%`,
                background: seg.color,
              }}
              title={seg.label ? `${seg.label}: ${seg.value}` : `${seg.value}`}
            />
          ) : null
        )}
      </div>
      {showLegend && (
        <div className={styles.legend}>
          {segments.map((seg, i) =>
            seg.label ? (
              <div key={i} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: seg.color }} />
                <span>
                  {seg.label} ({seg.value})
                </span>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
