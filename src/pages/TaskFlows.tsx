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
  const {
    flows,
    graphs,
    selectedProjectId,
    startFlow,
    tickFlow,
    pauseFlow,
    resumeFlow,
    abortFlow,
    cleanupWorktrees,
    prepareMerge,
    replayFlow,
    listWorktrees,
    inspectWorktree,
    inspectAttempt,
    fetchVerifyResults,
    fetchAttemptDiff,
    completeCheckpoint,
    refreshFromApi,
    addNotification,
    apiError,
  } = useHivemindStore();
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [abortReason, setAbortReason] = useState('');
  const [abortForce, setAbortForce] = useState(false);
  const [mergeTargetBranch, setMergeTargetBranch] = useState('');
  const [attemptId, setAttemptId] = useState('');
  const [checkpointId, setCheckpointId] = useState('');
  const [checkpointSummary, setCheckpointSummary] = useState('');
  const [inspectTaskId, setInspectTaskId] = useState('');
  const [opOutput, setOpOutput] = useState<string>('');

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

  const runFlowAction = async (label: string, action: () => Promise<void>) => {
    setBusyAction(label);
    try {
      await action();
      addNotification({
        type: 'success',
        title: 'Flow operation complete',
        message: `${label} succeeded`,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: `${label} failed`,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Flows"
        subtitle="Execute and monitor orchestrated workflows"
        actions={
          <Button
            variant="secondary"
            loading={busyAction === 'Refresh state'}
            onClick={() => runFlowAction('Refresh state', async () => refreshFromApi())}
          >
            Refresh
          </Button>
        }
      />

      <Card variant="outlined" className={styles.opsPanel}>
        <div className={styles.opsHeaderRow}>
          <Text variant="h4">Flow operations</Text>
          {apiError && <Text variant="caption" color="warning">{apiError}</Text>}
        </div>

        <div className={styles.opsGrid}>
          <section className={styles.opsSection}>
            <Text variant="overline" color="muted">Selected flow controls</Text>
            <Text variant="caption" color="muted">
              {selectedFlow ? `Flow ${selectedFlow.id}` : 'Select a flow to run controls'}
            </Text>

            <div className={styles.actionRow}>
              <Button
                size="sm"
                variant="primary"
                loading={busyAction === 'Start flow'}
                disabled={!selectedFlow}
                onClick={() =>
                  runFlowAction('Start flow', async () => {
                    if (!selectedFlow) return;
                    await startFlow({ flow_id: selectedFlow.id });
                  })
                }
              >
                Start
              </Button>
              <Button
                size="sm"
                variant="secondary"
                loading={busyAction === 'Tick flow'}
                disabled={!selectedFlow}
                onClick={() =>
                  runFlowAction('Tick flow', async () => {
                    if (!selectedFlow) return;
                    await tickFlow({ flow_id: selectedFlow.id, interactive: false });
                  })
                }
              >
                Tick
              </Button>
            </div>

            <div className={styles.actionRow}>
              <Button
                size="sm"
                variant="secondary"
                loading={busyAction === 'Pause flow'}
                disabled={!selectedFlow}
                onClick={() =>
                  runFlowAction('Pause flow', async () => {
                    if (!selectedFlow) return;
                    await pauseFlow({ flow_id: selectedFlow.id });
                  })
                }
              >
                Pause
              </Button>
              <Button
                size="sm"
                variant="primary"
                loading={busyAction === 'Resume flow'}
                disabled={!selectedFlow}
                onClick={() =>
                  runFlowAction('Resume flow', async () => {
                    if (!selectedFlow) return;
                    await resumeFlow({ flow_id: selectedFlow.id });
                  })
                }
              >
                Resume
              </Button>
            </div>
          </section>

          <section className={styles.opsSection}>
            <Text variant="overline" color="muted">Abort and cleanup</Text>
            <input
              className={styles.opInput}
              placeholder="Abort reason"
              value={abortReason}
              onChange={(e) => setAbortReason(e.target.value)}
              disabled={!selectedFlow}
            />
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={abortForce}
                onChange={(e) => setAbortForce(e.target.checked)}
                disabled={!selectedFlow}
              />
              force abort
            </label>
            <Button
              variant="danger"
              loading={busyAction === 'Abort flow'}
              disabled={!selectedFlow}
              onClick={() =>
                runFlowAction('Abort flow', async () => {
                  if (!selectedFlow) return;
                  await abortFlow({
                    flow_id: selectedFlow.id,
                    reason: abortReason.trim() || undefined,
                    force: abortForce,
                  });
                })
              }
            >
              Abort flow
            </Button>

            <Button
              variant="secondary"
              loading={busyAction === 'Cleanup worktrees'}
              disabled={!selectedFlow}
              onClick={() =>
                runFlowAction('Cleanup worktrees', async () => {
                  if (!selectedFlow) return;
                  await cleanupWorktrees({ flow_id: selectedFlow.id });
                })
              }
            >
              Cleanup worktrees
            </Button>
          </section>

          <section className={styles.opsSection}>
            <Text variant="overline" color="muted">Merge preparation</Text>
            <input
              className={styles.opInput}
              placeholder="Target branch (optional)"
              value={mergeTargetBranch}
              onChange={(e) => setMergeTargetBranch(e.target.value)}
              disabled={!selectedFlow}
            />
            <Button
              variant="primary"
              loading={busyAction === 'Prepare merge'}
              disabled={!selectedFlow}
              onClick={() =>
                runFlowAction('Prepare merge', async () => {
                  if (!selectedFlow) return;
                  await prepareMerge({
                    flow_id: selectedFlow.id,
                    target: mergeTargetBranch.trim() || undefined,
                  });
                })
              }
            >
              Prepare merge
            </Button>
          </section>

          <section className={styles.opsSection}>
            <Text variant="overline" color="muted">Diagnostics and artifacts</Text>
            <input
              className={styles.opInput}
              placeholder="Attempt ID"
              value={attemptId}
              onChange={(e) => setAttemptId(e.target.value)}
            />
            <input
              className={styles.opInput}
              placeholder="Task ID for worktree inspect"
              value={inspectTaskId}
              onChange={(e) => setInspectTaskId(e.target.value)}
            />
            <input
              className={styles.opInput}
              placeholder="Checkpoint ID"
              value={checkpointId}
              onChange={(e) => setCheckpointId(e.target.value)}
            />
            <textarea
              className={styles.opTextarea}
              placeholder="Checkpoint summary (optional)"
              value={checkpointSummary}
              onChange={(e) => setCheckpointSummary(e.target.value)}
            />

            <div className={styles.actionRow}>
              <Button
                size="sm"
                variant="secondary"
                loading={busyAction === 'Replay flow'}
                disabled={!selectedFlow}
                onClick={() =>
                  runFlowAction('Replay flow', async () => {
                    if (!selectedFlow) return;
                    const result = await replayFlow({ flow_id: selectedFlow.id });
                    setOpOutput(JSON.stringify(result, null, 2));
                  })
                }
              >
                Replay
              </Button>
              <Button
                size="sm"
                variant="secondary"
                loading={busyAction === 'List worktrees'}
                disabled={!selectedFlow}
                onClick={() =>
                  runFlowAction('List worktrees', async () => {
                    if (!selectedFlow) return;
                    const result = await listWorktrees({ flow_id: selectedFlow.id });
                    setOpOutput(JSON.stringify(result, null, 2));
                  })
                }
              >
                Worktrees
              </Button>
            </div>

            <div className={styles.actionRow}>
              <Button
                size="sm"
                variant="secondary"
                loading={busyAction === 'Inspect worktree'}
                disabled={!inspectTaskId.trim()}
                onClick={() =>
                  runFlowAction('Inspect worktree', async () => {
                    const result = await inspectWorktree({ task_id: inspectTaskId.trim() });
                    setOpOutput(JSON.stringify(result, null, 2));
                  })
                }
              >
                Inspect worktree
              </Button>
              <Button
                size="sm"
                variant="secondary"
                loading={busyAction === 'Inspect attempt'}
                disabled={!attemptId.trim()}
                onClick={() =>
                  runFlowAction('Inspect attempt', async () => {
                    const result = await inspectAttempt({
                      attempt_id: attemptId.trim(),
                      diff: true,
                    });
                    setOpOutput(JSON.stringify(result, null, 2));
                  })
                }
              >
                Inspect attempt
              </Button>
            </div>

            <div className={styles.actionRow}>
              <Button
                size="sm"
                variant="secondary"
                loading={busyAction === 'Fetch verify results'}
                disabled={!attemptId.trim()}
                onClick={() =>
                  runFlowAction('Fetch verify results', async () => {
                    const result = await fetchVerifyResults({
                      attempt_id: attemptId.trim(),
                      output: true,
                    });
                    setOpOutput(JSON.stringify(result, null, 2));
                  })
                }
              >
                Verify results
              </Button>
              <Button
                size="sm"
                variant="secondary"
                loading={busyAction === 'Fetch attempt diff'}
                disabled={!attemptId.trim()}
                onClick={() =>
                  runFlowAction('Fetch attempt diff', async () => {
                    const result = await fetchAttemptDiff({ attempt_id: attemptId.trim() });
                    setOpOutput(JSON.stringify(result, null, 2));
                  })
                }
              >
                Attempt diff
              </Button>
            </div>

            <Button
              variant="primary"
              loading={busyAction === 'Complete checkpoint'}
              disabled={!attemptId.trim() || !checkpointId.trim()}
              onClick={() =>
                runFlowAction('Complete checkpoint', async () => {
                  const result = await completeCheckpoint({
                    attempt_id: attemptId.trim(),
                    checkpoint_id: checkpointId.trim(),
                    summary: checkpointSummary.trim() || undefined,
                  });
                  setOpOutput(JSON.stringify(result, null, 2));
                })
              }
            >
              Complete checkpoint
            </Button>

            <pre className={styles.opOutput}>{opOutput || 'Operation output will appear here...'}</pre>
          </section>
        </div>
      </Card>

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
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<Play size={14} />}
                          loading={busyAction === `Start flow ${flow.id}`}
                          onClick={() =>
                            runFlowAction(`Start flow ${flow.id}`, async () => {
                              await startFlow({ flow_id: flow.id });
                            })
                          }
                        >
                          Start
                        </Button>
                      )}
                      {flow.state === 'running' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Pause size={14} />}
                          loading={busyAction === `Pause flow ${flow.id}`}
                          onClick={() =>
                            runFlowAction(`Pause flow ${flow.id}`, async () => {
                              await pauseFlow({ flow_id: flow.id });
                            })
                          }
                        >
                          Pause
                        </Button>
                      )}
                      {flow.state === 'paused' && (
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<Play size={14} />}
                          loading={busyAction === `Resume flow ${flow.id}`}
                          onClick={() =>
                            runFlowAction(`Resume flow ${flow.id}`, async () => {
                              await resumeFlow({ flow_id: flow.id });
                            })
                          }
                        >
                          Resume
                        </Button>
                      )}
                      {(flow.state === 'running' || flow.state === 'paused') && (
                        <Button
                          size="sm"
                          variant="danger"
                          icon={<Square size={14} />}
                          loading={busyAction === `Abort flow ${flow.id}`}
                          onClick={() =>
                            runFlowAction(`Abort flow ${flow.id}`, async () => {
                              await abortFlow({ flow_id: flow.id });
                            })
                          }
                        >
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
