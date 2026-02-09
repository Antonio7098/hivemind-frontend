import { motion } from 'motion/react';
import type { TaskState, TaskExecState, FlowState, GraphState, MergeStatus } from '../types';
import styles from './StatusIndicator.module.css';

// ═══════════════════════════════════════════════════════════════════════════
// STATUS INDICATOR COMPONENT
// Visual status badges with animated glows for all Hivemind states
// ═══════════════════════════════════════════════════════════════════════════

type StatusValue =
  | TaskState
  | TaskExecState
  | FlowState
  | GraphState
  | MergeStatus
  | 'healthy' | 'degraded' | 'offline';

interface StatusIndicatorProps {
  status: StatusValue;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  pulse?: boolean;
}

const statusConfig: Record<string, { color: string; label: string; animate: boolean }> = {
  // Task states (Open/Closed)
  open: { color: 'var(--state-success)', label: 'Open', animate: false },
  closed: { color: 'var(--text-tertiary)', label: 'Closed', animate: false },
  // Task execution states (within flows)
  pending: { color: 'var(--state-pending)', label: 'Pending', animate: false },
  ready: { color: 'var(--status-info)', label: 'Ready', animate: true },
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
  // Graph states
  draft: { color: 'var(--text-tertiary)', label: 'Draft', animate: false },
  validated: { color: 'var(--status-info)', label: 'Validated', animate: false },
  locked: { color: 'var(--accent-500)', label: 'Locked', animate: false },
  // Merge states
  prepared: { color: 'var(--status-info)', label: 'Prepared', animate: false },
  approved: { color: 'var(--state-success)', label: 'Approved', animate: false },
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
