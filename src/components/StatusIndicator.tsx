import { motion } from 'motion/react';
import type { TaskState, TaskFlowState } from '../types';
import styles from './StatusIndicator.module.css';

// ═══════════════════════════════════════════════════════════════════════════
// STATUS INDICATOR COMPONENT
// Visual status badges with animated glows for task/flow states
// ═══════════════════════════════════════════════════════════════════════════

interface StatusIndicatorProps {
  status: TaskState | TaskFlowState | 'healthy' | 'degraded' | 'offline';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  pulse?: boolean;
}

const statusConfig: Record<string, { color: string; label: string; animate: boolean }> = {
  // Task states
  pending: { color: 'var(--state-pending)', label: 'Pending', animate: false },
  running: { color: 'var(--state-running)', label: 'Running', animate: true },
  verifying: { color: 'var(--state-verifying)', label: 'Verifying', animate: true },
  success: { color: 'var(--state-success)', label: 'Success', animate: false },
  retry: { color: 'var(--state-retry)', label: 'Retry', animate: true },
  failed: { color: 'var(--state-failed)', label: 'Failed', animate: false },
  escalated: { color: 'var(--state-escalated)', label: 'Escalated', animate: true },
  // Flow states
  created: { color: 'var(--state-pending)', label: 'Created', animate: false },
  paused: { color: 'var(--amber-500)', label: 'Paused', animate: false },
  completed: { color: 'var(--state-success)', label: 'Completed', animate: false },
  aborted: { color: 'var(--state-failed)', label: 'Aborted', animate: false },
  // Runtime states
  healthy: { color: 'var(--state-success)', label: 'Healthy', animate: false },
  degraded: { color: 'var(--amber-500)', label: 'Degraded', animate: true },
  offline: { color: 'var(--state-failed)', label: 'Offline', animate: false },
};

export function StatusIndicator({
  status,
  size = 'md',
  showLabel = false,
  pulse = true,
}: StatusIndicatorProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const shouldAnimate = pulse && config.animate;

  const sizeMap = {
    sm: 6,
    md: 8,
    lg: 10,
  };

  return (
    <div className={styles.wrapper}>
      <motion.div
        className={styles.indicator}
        style={{
          '--status-color': config.color,
          width: sizeMap[size],
          height: sizeMap[size],
        } as React.CSSProperties}
        animate={
          shouldAnimate
            ? {
                boxShadow: [
                  `0 0 4px ${config.color}`,
                  `0 0 12px ${config.color}`,
                  `0 0 4px ${config.color}`,
                ],
              }
            : {}
        }
        transition={
          shouldAnimate
            ? {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }
            : {}
        }
      />
      {showLabel && (
        <span className={styles.label} style={{ color: config.color }}>
          {config.label}
        </span>
      )}
    </div>
  );
}
