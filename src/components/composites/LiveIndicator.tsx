import { Dot } from '../primitives/Dot';
import styles from './LiveIndicator.module.css';

interface LiveIndicatorProps {
  live: boolean;
  className?: string;
}

export function LiveIndicator({ live, className = '' }: LiveIndicatorProps) {
  return (
    <span className={`${styles.indicator} ${live ? styles.live : styles.paused} ${className}`}>
      {live ? (
        <>
          <Dot color="var(--status-success)" size={6} pulse />
          <span>Live</span>
        </>
      ) : (
        <span>Paused</span>
      )}
    </span>
  );
}
