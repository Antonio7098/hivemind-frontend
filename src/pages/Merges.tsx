import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams } from 'react-router-dom';
import {
  GitMerge,
  CheckCircle2,
  AlertTriangle,
  Clock,
  GitBranch,
  FileWarning,
  ChevronRight,
  ThumbsUp,
  Play,
} from 'lucide-react';
import { useHivemindStore } from '../stores/hivemindStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/composites/PageHeader';
import { EmptyState } from '../components/composites/EmptyState';
import { DetailPanel } from '../components/composites/DetailPanel';
import { KeyValueGrid } from '../components/composites/KeyValueGrid';
import { Stack } from '../components/primitives/Stack';
import { Text } from '../components/primitives/Text';
import { IconBox } from '../components/primitives/IconBox';
import type { MergeStatus } from '../types';
import styles from './Merges.module.css';

const statusBadgeVariant: Record<MergeStatus, 'info' | 'success' | 'default'> = {
  prepared: 'info',
  approved: 'success',
  completed: 'default',
};

const statusIcon: Record<MergeStatus, typeof GitMerge> = {
  prepared: FileWarning,
  approved: ThumbsUp,
  completed: CheckCircle2,
};

export function Merges() {
  const {
    mergeStates,
    flows,
    graphs,
    selectedProjectId,
    setSelectedProject,
    approveMerge,
    executeMerge,
    refreshFromApi,
    addNotification,
    apiError,
  } = useHivemindStore();
  const { id: routeMergeFlowId } = useParams<{ id?: string }>();
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState<'local' | 'pr'>('local');
  const [monitorCi, setMonitorCi] = useState(false);
  const [autoMerge, setAutoMerge] = useState(false);
  const [pullAfter, setPullAfter] = useState(false);

  useEffect(() => {
    if (!routeMergeFlowId) return;
    setSelectedFlowId(routeMergeFlowId);
    const flowFromRoute = flows.find((flow) => flow.id === routeMergeFlowId);
    if (flowFromRoute) {
      setSelectedProject(flowFromRoute.project_id);
    }
  }, [routeMergeFlowId, flows, setSelectedProject]);

  // Filter merges by project through their linked flows
  const projectMerges = useMemo(() => {
    if (!selectedProjectId) return mergeStates;
    return mergeStates.filter((m) => {
      const flow = flows.find((f) => f.id === m.flow_id);
      return flow?.project_id === selectedProjectId;
    });
  }, [mergeStates, flows, selectedProjectId]);

  const selectedMerge = selectedFlowId
    ? projectMerges.find((m) => m.flow_id === selectedFlowId) ?? null
    : null;

  const getFlowName = (flowId: string): string => {
    const flow = flows.find((f) => f.id === flowId);
    if (!flow) return flowId;
    const graph = graphs.find((g) => g.id === flow.graph_id);
    return graph?.name ?? flowId;
  };

  const getFlow = (flowId: string) => flows.find((f) => f.id === flowId);

  const runMergeAction = async (label: string, action: () => Promise<void>) => {
    setBusyAction(label);
    try {
      await action();
      addNotification({
        type: 'success',
        title: 'Merge operation complete',
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
        title="Merges"
        subtitle="Review, approve, and execute merges from completed flows"
        actions={
          <Button
            variant="secondary"
            loading={busyAction === 'Refresh state'}
            onClick={() => runMergeAction('Refresh state', async () => refreshFromApi())}
          >
            Refresh
          </Button>
        }
      />

      {apiError && (
        <Text variant="caption" color="warning" style={{ marginBottom: 'var(--space-3)', display: 'block' }}>
          {apiError}
        </Text>
      )}

      <div className={styles.content}>
        {/* Merge list */}
        <div className={styles.mergeList}>
          {projectMerges.length === 0 ? (
            <Card variant="outlined">
              <EmptyState
                icon={<GitMerge size={48} strokeWidth={1} />}
                title="No Merges"
                description="Merges will appear here when flows produce artifacts ready for integration"
              />
            </Card>
          ) : (
            <Stack gap={3}>
              {projectMerges.map((merge, index) => {
                const isSelected = selectedFlowId === merge.flow_id;
                const flowName = getFlowName(merge.flow_id);
                const StatusIcon = statusIcon[merge.status];

                return (
                  <motion.div
                    key={merge.flow_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      variant={isSelected ? 'elevated' : 'default'}
                      hoverable
                      padding="none"
                      onClick={() => setSelectedFlowId(merge.flow_id)}
                    >
                      <div className={styles.mergeCardContent}>
                        {/* Header */}
                        <Stack direction="row" gap={3} align="center" justify="space-between">
                          <Stack direction="row" gap={3} align="center">
                            <IconBox size="md" color="var(--accent-400)">
                              <GitMerge size={20} />
                            </IconBox>
                            <Stack gap={1}>
                              <Text variant="h4">{flowName}</Text>
                              <Text variant="mono-sm" color="muted">{merge.flow_id}</Text>
                            </Stack>
                          </Stack>
                          <Stack direction="row" gap={2} align="center">
                            <Badge
                              variant={statusBadgeVariant[merge.status]}
                              icon={<StatusIcon size={12} />}
                            >
                              {merge.status}
                            </Badge>
                            {isSelected && <ChevronRight size={16} style={{ color: 'var(--accent-400)' }} />}
                          </Stack>
                        </Stack>

                        {/* Meta */}
                        <Stack direction="row" gap={4} align="center">
                          {merge.target_branch && (
                            <Stack direction="row" gap={1} align="center">
                              <GitBranch size={14} style={{ color: 'var(--text-muted)' }} />
                              <Text variant="caption" color="muted">{merge.target_branch}</Text>
                            </Stack>
                          )}
                          {merge.conflicts.length > 0 && (
                            <Stack direction="row" gap={1} align="center">
                              <AlertTriangle size={14} style={{ color: 'var(--status-warning)' }} />
                              <Text variant="caption" color="warning">{merge.conflicts.length} conflicts</Text>
                            </Stack>
                          )}
                          {merge.commits.length > 0 && (
                            <Stack direction="row" gap={1} align="center">
                              <CheckCircle2 size={14} style={{ color: 'var(--text-muted)' }} />
                              <Text variant="caption" color="muted">{merge.commits.length} commits</Text>
                            </Stack>
                          )}
                          <Stack direction="row" gap={1} align="center" style={{ marginLeft: 'auto' }}>
                            <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                            <Text variant="caption" color="muted">
                              {new Date(merge.updated_at).toLocaleDateString()}
                            </Text>
                          </Stack>
                        </Stack>

                        {/* Action buttons */}
                        <Stack direction="row" gap={2}>
                          {merge.status === 'prepared' && (
                            <Button
                              size="sm"
                              variant="primary"
                              icon={<ThumbsUp size={14} />}
                              loading={busyAction === `Approve merge ${merge.flow_id}`}
                              onClick={() =>
                                runMergeAction(`Approve merge ${merge.flow_id}`, async () => {
                                  await approveMerge({ flow_id: merge.flow_id });
                                })
                              }
                            >
                              Approve
                            </Button>
                          )}
                          {merge.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="primary"
                              icon={<Play size={14} />}
                              loading={busyAction === `Execute merge ${merge.flow_id}`}
                              onClick={() =>
                                runMergeAction(`Execute merge ${merge.flow_id}`, async () => {
                                  await executeMerge({
                                    flow_id: merge.flow_id,
                                    mode: mergeMode,
                                    monitor_ci: monitorCi,
                                    auto_merge: autoMerge,
                                    pull_after: pullAfter,
                                  });
                                })
                              }
                            >
                              Execute Merge
                            </Button>
                          )}
                        </Stack>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </Stack>
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedMerge && (
            <DetailPanel
              open={!!selectedMerge}
              onClose={() => setSelectedFlowId(null)}
              width={480}
              header={
                <Stack direction="row" gap={2} align="center">
                  <GitMerge size={20} style={{ color: 'var(--accent-400)' }} />
                  <Text variant="h4" color="primary">Merge Details</Text>
                </Stack>
              }
            >
              {(() => {
                const flow = getFlow(selectedMerge.flow_id);
                const flowName = getFlowName(selectedMerge.flow_id);
                const StatusIcon = statusIcon[selectedMerge.status];

                return (
                  <>
                    {/* Status badge */}
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                      <Stack direction="row" gap={2} align="center" style={{ marginBottom: 'var(--space-3)' }}>
                        <Badge
                          variant={statusBadgeVariant[selectedMerge.status]}
                          icon={<StatusIcon size={12} />}
                        >
                          {selectedMerge.status}
                        </Badge>
                        {flow && (
                          <Badge variant="default">
                            Flow: {flow.state}
                          </Badge>
                        )}
                      </Stack>

                      <KeyValueGrid
                        items={[
                          { label: 'Flow', value: flowName },
                          { label: 'Flow ID', value: selectedMerge.flow_id },
                          { label: 'Target Branch', value: selectedMerge.target_branch ?? 'Not set' },
                          { label: 'Updated', value: new Date(selectedMerge.updated_at).toLocaleString() },
                        ]}
                      />
                    </div>

                    {/* Conflicts */}
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                      <Text variant="overline" color="muted" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>
                        Conflicts ({selectedMerge.conflicts.length})
                      </Text>
                      {selectedMerge.conflicts.length === 0 ? (
                        <Card variant="outlined" padding="sm">
                          <Stack direction="row" gap={2} align="center">
                            <CheckCircle2 size={16} style={{ color: 'var(--state-success)' }} />
                            <Text variant="body-sm" color="secondary">No conflicts detected</Text>
                          </Stack>
                        </Card>
                      ) : (
                        <Stack gap={2}>
                          {selectedMerge.conflicts.map((conflict, i) => (
                            <Card key={i} variant="outlined" padding="sm">
                              <Stack direction="row" gap={2} align="center">
                                <AlertTriangle size={14} style={{ color: 'var(--status-warning)' }} />
                                <Text variant="mono-sm" color="warning">{conflict}</Text>
                              </Stack>
                            </Card>
                          ))}
                        </Stack>
                      )}
                    </div>

                    {/* Commits */}
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                      <Text variant="overline" color="muted" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>
                        Commits ({selectedMerge.commits.length})
                      </Text>
                      {selectedMerge.commits.length === 0 ? (
                        <Card variant="outlined" padding="sm">
                          <Text variant="body-sm" color="tertiary">No commits yet</Text>
                        </Card>
                      ) : (
                        <Stack gap={2}>
                          {selectedMerge.commits.map((commit, i) => (
                            <Card key={i} variant="outlined" padding="sm">
                              <Text variant="mono-sm" color="primary">{commit}</Text>
                            </Card>
                          ))}
                        </Stack>
                      )}
                    </div>

                    {/* Actions */}
                    <Stack direction="row" gap={2}>
                      {selectedMerge.status === 'prepared' && (
                        <Button
                          variant="primary"
                          icon={<ThumbsUp size={14} />}
                          loading={busyAction === `Approve merge ${selectedMerge.flow_id}`}
                          onClick={() =>
                            runMergeAction(`Approve merge ${selectedMerge.flow_id}`, async () => {
                              await approveMerge({ flow_id: selectedMerge.flow_id });
                            })
                          }
                        >
                          Approve Merge
                        </Button>
                      )}
                      {selectedMerge.status === 'approved' && (
                        <div style={{ width: '100%' }}>
                          <div style={{ marginBottom: 'var(--space-2)' }}>
                            <select
                              className={styles.select}
                              value={mergeMode}
                              onChange={(e) => setMergeMode(e.target.value as 'local' | 'pr')}
                            >
                              <option value="local">local merge</option>
                              <option value="pr">pull request merge</option>
                            </select>
                          </div>
                          {mergeMode === 'pr' && (
                            <Stack direction="row" gap={2} style={{ marginBottom: 'var(--space-2)' }}>
                              <label className={styles.checkboxRow}>
                                <input
                                  type="checkbox"
                                  checked={monitorCi}
                                  onChange={(e) => setMonitorCi(e.target.checked)}
                                />
                                monitor CI
                              </label>
                              <label className={styles.checkboxRow}>
                                <input
                                  type="checkbox"
                                  checked={autoMerge}
                                  onChange={(e) => setAutoMerge(e.target.checked)}
                                />
                                auto merge
                              </label>
                              <label className={styles.checkboxRow}>
                                <input
                                  type="checkbox"
                                  checked={pullAfter}
                                  onChange={(e) => setPullAfter(e.target.checked)}
                                />
                                pull after
                              </label>
                            </Stack>
                          )}
                          <Button
                            variant="primary"
                            icon={<Play size={14} />}
                            loading={busyAction === `Execute merge ${selectedMerge.flow_id}`}
                            onClick={() =>
                              runMergeAction(`Execute merge ${selectedMerge.flow_id}`, async () => {
                                await executeMerge({
                                  flow_id: selectedMerge.flow_id,
                                  mode: mergeMode,
                                  monitor_ci: mergeMode === 'pr' ? monitorCi : false,
                                  auto_merge: mergeMode === 'pr' ? autoMerge : false,
                                  pull_after: pullAfter,
                                });
                              })
                            }
                          >
                            Execute Merge
                          </Button>
                        </div>
                      )}
                    </Stack>
                  </>
                );
              })()}
            </DetailPanel>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
