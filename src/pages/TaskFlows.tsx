import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GitBranch,
  Play,
  Pause,
  Square,
  Clock,
  AlertTriangle,
  ArrowRight,
  Hash,
  RotateCcw,
} from 'lucide-react';
import { useHivemindStore } from '../stores/hivemindStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { StatusIndicator } from '../components/StatusIndicator';
import { PageHeader } from '../components/composites/PageHeader';
import { ProgressBar } from '../components/composites/ProgressBar';
import { EmptyState } from '../components/composites/EmptyState';
import { IconBox } from '../components/primitives/IconBox';
import { Stack } from '../components/primitives/Stack';
import { Text } from '../components/primitives/Text';
import { KeyValueGrid } from '../components/composites/KeyValueGrid';
import type { TaskFlow, TaskExecState } from '../types';
import styles from './TaskFlows.module.css';

// ─── Execution state color mapping ───

const EXEC_STATE_COLORS: Record<TaskExecState, string> = {
  pending: 'var(--state-pending)',
  ready: 'var(--state-running)',
  running: 'var(--state-running)',
  verifying: 'var(--state-verifying)',
  success: 'var(--state-success)',
  retry: 'var(--state-retry)',
  failed: 'var(--state-failed)',
  escalated: 'var(--state-escalated)',
};

const EXEC_STATE_LABELS: Record<TaskExecState, string> = {
  pending: 'Pending',
  ready: 'Ready',
  running: 'Running',
  verifying: 'Verifying',
  success: 'Success',
  retry: 'Retry',
  failed: 'Failed',
  escalated: 'Escalated',
};

// ─── Helpers ───

function getExecStats(flow: TaskFlow) {
  const execs = Object.values(flow.task_executions);
  const total = execs.length;
  const byState = (s: TaskExecState) => execs.filter((e) => e.state === s).length;
  return { total, byState };
}

function getFlowIcon(state: string) {
  switch (state) {
    case 'running':
      return Play;
    case 'paused':
      return Pause;
    case 'completed':
      return ArrowRight;
    case 'aborted':
      return Square;
    default:
      return GitBranch;
  }
}

// ─── Component ───

export function TaskFlows() {
  const { flows, graphs, selectedProjectId } = useHivemindStore();
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);

  const projectFlows = useMemo(
    () => flows.filter((f) => f.project_id === selectedProjectId),
    [flows, selectedProjectId],
  );

  const graphMap = useMemo(
    () => Object.fromEntries(graphs.map((g) => [g.id, g])),
    [graphs],
  );

  const selectedFlow = selectedFlowId
    ? projectFlows.find((f) => f.id === selectedFlowId) ?? null
    : null;

  const selectedGraph = selectedFlow ? graphMap[selectedFlow.graph_id] ?? null : null;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Flows"
        subtitle="Execute and monitor orchestrated workflows"
      />

      <div className={styles.content}>
        {/* ─── Left Panel: Flow List ─── */}
        <div className={styles.flowList}>
          {projectFlows.map((flow, index) => {
            const graph = graphMap[flow.graph_id];
            const graphName = graph?.name ?? 'Unknown Graph';
            const FlowIcon = getFlowIcon(flow.state);
            const { total, byState } = getExecStats(flow);
            const successCount = byState('success');
            const isSelected = selectedFlowId === flow.id;

            return (
              <motion.div
                key={flow.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  variant={isSelected ? 'elevated' : 'default'}
                  hoverable
                  padding="none"
                  className={`${styles.flowCard} ${isSelected ? styles.selected : ''}`}
                  onClick={() => setSelectedFlowId(flow.id)}
                >
                  <div className={styles.flowCardContent}>
                    {/* Header: Icon + Name + State */}
                    <div className={styles.flowHeader}>
                      <IconBox size="md" color="var(--accent-400)">
                        <FlowIcon size={20} />
                      </IconBox>
                      <div className={styles.flowInfo}>
                        <h3 className={styles.flowName}>{graphName}</h3>
                        <span className={styles.flowId}>{flow.id}</span>
                      </div>
                      <StatusIndicator status={flow.state} showLabel />
                    </div>

                    {/* Progress bar with colored segments */}
                    <div className={styles.progressSection}>
                      <div className={styles.progressInfo}>
                        <span className={styles.progressLabel}>Progress</span>
                        <span className={styles.progressValue}>
                          {successCount}/{total}
                        </span>
                      </div>
                      <ProgressBar
                        height={6}
                        total={total}
                        segments={[
                          { value: byState('success'), color: EXEC_STATE_COLORS.success },
                          { value: byState('running'), color: EXEC_STATE_COLORS.running },
                          { value: byState('verifying'), color: EXEC_STATE_COLORS.verifying },
                          { value: byState('retry'), color: EXEC_STATE_COLORS.retry },
                          { value: byState('failed'), color: EXEC_STATE_COLORS.failed },
                          { value: byState('escalated'), color: EXEC_STATE_COLORS.escalated },
                          { value: byState('ready'), color: 'var(--state-running)' },
                          { value: byState('pending'), color: EXEC_STATE_COLORS.pending },
                        ]}
                      />
                    </div>

                    {/* Meta: task count + started date */}
                    <div className={styles.flowMeta}>
                      <div className={styles.metaItem}>
                        <Hash size={12} />
                        <span>{total} tasks</span>
                      </div>
                      <div className={styles.metaItem}>
                        <Clock size={12} />
                        <span>
                          {flow.started_at
                            ? `Started ${new Date(flow.started_at).toLocaleDateString()}`
                            : 'Not started'}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className={styles.flowActions}>
                      {flow.state === 'created' && (
                        <Button size="sm" variant="primary" icon={<Play size={14} />}>
                          Start
                        </Button>
                      )}
                      {flow.state === 'running' && (
                        <Button size="sm" variant="secondary" icon={<Pause size={14} />}>
                          Pause
                        </Button>
                      )}
                      {flow.state === 'paused' && (
                        <Button size="sm" variant="primary" icon={<Play size={14} />}>
                          Resume
                        </Button>
                      )}
                      {(flow.state === 'running' || flow.state === 'paused') && (
                        <Button size="sm" variant="danger" icon={<Square size={14} />}>
                          Abort
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}

          {projectFlows.length === 0 && (
            <Card variant="outlined">
              <EmptyState
                icon={<GitBranch size={48} strokeWidth={1} />}
                title="No Flows"
                description="Create a flow from a task graph to begin orchestrated execution"
              />
            </Card>
          )}
        </div>

        {/* ─── Right Panel: Task Execution Detail ─── */}
        <AnimatePresence mode="wait">
          {selectedFlow && selectedGraph && (
            <motion.div
              key={selectedFlow.id}
              className={styles.flowDetail}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              {/* Detail header */}
              <div className={styles.detailHeader}>
                <Stack direction="row" gap={3} align="center">
                  <h2>{selectedGraph.name}</h2>
                  <StatusIndicator status={selectedFlow.state} showLabel />
                </Stack>
                <Text variant="mono-sm" color="muted">{selectedFlow.id}</Text>
              </div>

              {/* Info grid */}
              <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
                <KeyValueGrid
                  columns={3}
                  items={[
                    { label: 'Graph', value: selectedGraph.name },
                    {
                      label: 'Started',
                      value: selectedFlow.started_at
                        ? new Date(selectedFlow.started_at).toLocaleString()
                        : 'Not started',
                    },
                    {
                      label: 'Updated',
                      value: new Date(selectedFlow.updated_at).toLocaleString(),
                    },
                  ]}
                />
              </div>

              {/* Task execution nodes */}
              <div className={styles.dagContainer}>
                <div className={styles.dagView}>
                  {Object.entries(selectedFlow.task_executions).map(
                    ([taskId, exec], index) => {
                      const graphTask = selectedGraph.tasks[taskId];
                      const taskTitle = graphTask?.title ?? taskId;
                      const deps = selectedGraph.dependencies[taskId] ?? [];

                      const hasFailedDep = deps.some((depId) => {
                        const depExec = selectedFlow.task_executions[depId];
                        return depExec?.state === 'failed' || depExec?.state === 'escalated';
                      });

                      return (
                        <motion.div
                          key={taskId}
                          className={styles.dagNode}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 + index * 0.05 }}
                        >
                          <div
                            className={`${styles.nodeCard} ${styles[exec.state] ?? ''}`}
                          >
                            {/* Node header: state + attempt count */}
                            <div className={styles.nodeHeader}>
                              <StatusIndicator status={exec.state} size="sm" showLabel />
                              {exec.attempt_count > 0 && (
                                <Badge variant="default" size="sm" icon={<RotateCcw size={10} />}>
                                  {exec.attempt_count}
                                </Badge>
                              )}
                            </div>

                            {/* Task title + ID */}
                            <span className={styles.nodeTitle}>{taskTitle}</span>
                            <span className={styles.nodeId}>{taskId}</span>

                            {/* Blocked reason */}
                            {exec.blocked_reason && (
                              <div className={styles.blockedWarning}>
                                <AlertTriangle size={12} />
                                <span>{exec.blocked_reason}</span>
                              </div>
                            )}

                            {/* Dependencies */}
                            {deps.length > 0 && (
                              <div className={styles.nodeDeps}>
                                <span className={styles.depsLabel}>Depends on:</span>
                                {deps.map((depId) => {
                                  const depTask = selectedGraph.tasks[depId];
                                  return (
                                    <Badge key={depId} variant="default" size="sm">
                                      {depTask?.title ?? depId}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}

                            {/* Failed dependency warning */}
                            {hasFailedDep && !exec.blocked_reason && (
                              <div className={styles.blockedWarning}>
                                <AlertTriangle size={12} />
                                <span>Blocked by failed dependency</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    },
                  )}
                </div>
              </div>

              {/* Footer: full progress bar with legend */}
              <div className={styles.detailFooter}>
                {(() => {
                  const { total, byState } = getExecStats(selectedFlow);
                  const allStates: TaskExecState[] = [
                    'success',
                    'running',
                    'verifying',
                    'ready',
                    'retry',
                    'failed',
                    'escalated',
                    'pending',
                  ];

                  return (
                    <ProgressBar
                      height={8}
                      total={total}
                      showLegend
                      segments={allStates.map((s) => ({
                        value: byState(s),
                        color: EXEC_STATE_COLORS[s],
                        label: EXEC_STATE_LABELS[s],
                      }))}
                    />
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
