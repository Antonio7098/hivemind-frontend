import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Network,
  Plus,
  Clock,
  GitFork,
  ListTodo,
  RotateCcw,
  AlertTriangle,
  Shield,
  Link,
  ChevronRight,
  Lock,
  CheckCircle2,
  FileEdit,
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
import type { TaskGraph, GraphState } from '../types';
import styles from './Graphs.module.css';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

const stateBadgeVariant: Record<GraphState, 'default' | 'info' | 'amber'> = {
  draft: 'default',
  validated: 'info',
  locked: 'amber',
};

const stateIcon: Record<GraphState, typeof FileEdit> = {
  draft: FileEdit,
  validated: CheckCircle2,
  locked: Lock,
};

export function Graphs() {
  const { graphs, flows, selectedProjectId, getProject } = useHivemindStore();
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);

  const projectGraphs = graphs.filter((g) => g.project_id === selectedProjectId);
  const selectedGraph = selectedGraphId
    ? graphs.find((g) => g.id === selectedGraphId) ?? null
    : null;

  const getLinkedFlow = (graphId: string) =>
    flows.find((f) => f.graph_id === graphId) ?? null;

  const getTaskCount = (graph: TaskGraph) => Object.keys(graph.tasks).length;
  const getDepCount = (graph: TaskGraph) =>
    Object.values(graph.dependencies).reduce((sum, deps) => sum + deps.length, 0);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Task Graphs"
        subtitle="Plan and structure task dependency DAGs"
        actions={
          <Button variant="primary" icon={<Plus size={16} />}>
            New Graph
          </Button>
        }
      />

      <div style={{ display: 'flex', gap: 'var(--space-4)', flex: 1, minHeight: 0 }}>
        {/* Graph list */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {projectGraphs.length === 0 ? (
            <Card variant="outlined">
              <EmptyState
                icon={<Network size={48} strokeWidth={1} />}
                title="No Task Graphs"
                description="Create a task graph to plan dependency structures for your workflows"
                action={
                  <Button variant="primary" icon={<Plus size={16} />}>
                    Create Graph
                  </Button>
                }
              />
            </Card>
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="show">
              <Stack gap={3}>
                {projectGraphs.map((graph) => {
                  const isSelected = selectedGraphId === graph.id;
                  const taskCount = getTaskCount(graph);
                  const depCount = getDepCount(graph);
                  const linkedFlow = getLinkedFlow(graph.id);
                  const StateIcon = stateIcon[graph.state];

                  return (
                    <motion.div key={graph.id} variants={fadeInUp}>
                      <Card
                        variant={isSelected ? 'elevated' : 'default'}
                        hoverable
                        padding="none"
                        onClick={() => setSelectedGraphId(graph.id)}
                      >
                        <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                          {/* Header row */}
                          <Stack direction="row" gap={3} align="center" justify="space-between">
                            <Stack direction="row" gap={3} align="center">
                              <IconBox size="lg" color="var(--accent-400)">
                                <Network size={20} />
                              </IconBox>
                              <Stack gap={1}>
                                <Text variant="h4">{graph.name}</Text>
                                {graph.description && (
                                  <Text variant="body-sm" color="tertiary">{graph.description}</Text>
                                )}
                              </Stack>
                            </Stack>
                            <Stack direction="row" gap={2} align="center">
                              <Badge
                                variant={stateBadgeVariant[graph.state]}
                                icon={<StateIcon size={12} />}
                              >
                                {graph.state}
                              </Badge>
                              {isSelected && <ChevronRight size={16} style={{ color: 'var(--accent-400)' }} />}
                            </Stack>
                          </Stack>

                          {/* Stats row */}
                          <Stack direction="row" gap={4} align="center">
                            <Stack direction="row" gap={1} align="center">
                              <ListTodo size={14} style={{ color: 'var(--text-muted)' }} />
                              <Text variant="caption" color="muted">{taskCount} tasks</Text>
                            </Stack>
                            <Stack direction="row" gap={1} align="center">
                              <GitFork size={14} style={{ color: 'var(--text-muted)' }} />
                              <Text variant="caption" color="muted">{depCount} dependencies</Text>
                            </Stack>
                            {linkedFlow && (
                              <Stack direction="row" gap={1} align="center">
                                <Link size={14} style={{ color: 'var(--accent-500)' }} />
                                <Text variant="caption" color="accent">Linked flow</Text>
                              </Stack>
                            )}
                            <Stack direction="row" gap={1} align="center" style={{ marginLeft: 'auto' }}>
                              <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                              <Text variant="caption" color="muted">
                                {new Date(graph.updated_at).toLocaleDateString()}
                              </Text>
                            </Stack>
                          </Stack>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </Stack>
            </motion.div>
          )}
        </div>

        {/* Detail panel area */}
      </div>

      <DetailPanel
        open={!!selectedGraph}
        onClose={() => setSelectedGraphId(null)}
        width={480}
        header={
          selectedGraph ? (
            <Stack direction="row" gap={2} align="center">
              <Network size={20} style={{ color: 'var(--accent-400)' }} />
              <Text variant="h4" color="primary">{selectedGraph.name}</Text>
            </Stack>
          ) : undefined
        }
      >
        {selectedGraph && (() => {
          const project = selectedGraph.project_id
            ? getProject(selectedGraph.project_id)
            : undefined;
          const linkedFlow = getLinkedFlow(selectedGraph.id);
          const taskEntries = Object.values(selectedGraph.tasks);

          return (
            <>
              {/* Graph info */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <Stack direction="row" gap={2} align="center" style={{ marginBottom: 'var(--space-3)' }}>
                  <Badge
                    variant={stateBadgeVariant[selectedGraph.state]}
                    icon={(() => { const I = stateIcon[selectedGraph.state]; return <I size={12} />; })()}
                  >
                    {selectedGraph.state === 'draft' && 'Draft (editable)'}
                    {selectedGraph.state === 'validated' && 'Validated (ready)'}
                    {selectedGraph.state === 'locked' && 'Locked (executing)'}
                  </Badge>
                  {linkedFlow && (
                    <Badge variant="info" icon={<Link size={12} />}>
                      Flow: {linkedFlow.id}
                    </Badge>
                  )}
                </Stack>

                <KeyValueGrid
                  items={[
                    { label: 'Graph ID', value: selectedGraph.id },
                    { label: 'Project', value: project?.name ?? selectedGraph.project_id },
                    { label: 'Created', value: new Date(selectedGraph.created_at).toLocaleString() },
                    { label: 'Updated', value: new Date(selectedGraph.updated_at).toLocaleString() },
                  ]}
                />
              </div>

              {/* Tasks list */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <Text variant="overline" color="muted" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>
                  Tasks ({taskEntries.length})
                </Text>
                <Stack gap={2}>
                  {taskEntries.map((task) => {
                    const deps = selectedGraph.dependencies[task.id] || [];
                    return (
                      <Card key={task.id} variant="outlined" padding="sm">
                        <Stack gap={2}>
                          {/* Task title */}
                          <Stack direction="row" gap={2} align="center" justify="space-between">
                            <Text variant="body" weight={600}>{task.title}</Text>
                            <Text variant="mono-sm" color="muted">{task.id}</Text>
                          </Stack>

                          {task.description && (
                            <Text variant="body-sm" color="secondary">{task.description}</Text>
                          )}

                          {/* Success criteria */}
                          <div style={{ padding: 'var(--space-2)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
                            <Text variant="caption" color="muted" style={{ display: 'block', marginBottom: 'var(--space-1)' }}>
                              Success Criteria
                            </Text>
                            <Text variant="body-sm" color="secondary">{task.criteria.description}</Text>
                            {task.criteria.checks.length > 0 && (
                              <Stack direction="row" gap={1} wrap style={{ marginTop: 'var(--space-1)' }}>
                                {task.criteria.checks.map((check, i) => (
                                  <Badge key={i} variant="default" size="sm">{check}</Badge>
                                ))}
                              </Stack>
                            )}
                          </div>

                          {/* Retry policy + scope */}
                          <Stack direction="row" gap={3} align="center">
                            <Stack direction="row" gap={1} align="center">
                              <RotateCcw size={12} style={{ color: 'var(--text-muted)' }} />
                              <Text variant="caption" color="muted">
                                Max retries: {task.retry_policy.max_retries}
                              </Text>
                            </Stack>
                            {task.retry_policy.escalate_on_failure && (
                              <Stack direction="row" gap={1} align="center">
                                <AlertTriangle size={12} style={{ color: 'var(--status-warning)' }} />
                                <Text variant="caption" color="warning">Escalates</Text>
                              </Stack>
                            )}
                            {task.scope && (
                              <Stack direction="row" gap={1} align="center">
                                <Shield size={12} style={{ color: 'var(--accent-500)' }} />
                                <Text variant="caption" color="accent">Scoped</Text>
                              </Stack>
                            )}
                          </Stack>

                          {/* Dependencies */}
                          {deps.length > 0 && (
                            <Stack direction="row" gap={1} align="center" wrap>
                              <GitFork size={12} style={{ color: 'var(--text-muted)' }} />
                              <Text variant="caption" color="muted">Depends on:</Text>
                              {deps.map((depId) => {
                                const depTask = selectedGraph.tasks[depId];
                                return (
                                  <Badge key={depId} variant="default" size="sm">
                                    {depTask?.title ?? depId}
                                  </Badge>
                                );
                              })}
                            </Stack>
                          )}
                        </Stack>
                      </Card>
                    );
                  })}
                </Stack>
              </div>

              {/* Dependency structure overview */}
              <div>
                <Text variant="overline" color="muted" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>
                  Dependency Structure
                </Text>
                <Card variant="outlined" padding="sm">
                  <Stack gap={2}>
                    {Object.entries(selectedGraph.dependencies).map(([taskId, depIds]) => {
                      const task = selectedGraph.tasks[taskId];
                      return (
                        <Stack key={taskId} direction="row" gap={2} align="center" wrap>
                          <Text variant="mono-sm" color="primary" weight={600}>
                            {task?.title ?? taskId}
                          </Text>
                          {depIds.length === 0 ? (
                            <Text variant="caption" color="muted">(root -- no dependencies)</Text>
                          ) : (
                            <>
                              <ChevronRight size={14} style={{ color: 'var(--text-muted)', transform: 'rotate(180deg)' }} />
                              <Stack direction="row" gap={1} wrap>
                                {depIds.map((depId) => {
                                  const depTask = selectedGraph.tasks[depId];
                                  return (
                                    <Badge key={depId} variant="info" size="sm">
                                      {depTask?.title ?? depId}
                                    </Badge>
                                  );
                                })}
                              </Stack>
                            </>
                          )}
                        </Stack>
                      );
                    })}
                  </Stack>
                </Card>
              </div>
            </>
          );
        })()}
      </DetailPanel>
    </div>
  );
}
