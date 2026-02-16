import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  FolderKanban,
  GitBranch,
  GitFork,
  ListTodo,
  Play,
  Clock,
  Layers,
  GitMerge,
  Activity,
  LayoutDashboard,
  KanbanSquare,
} from 'lucide-react';
import { PageHeader } from '../components/composites/PageHeader';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { KeyValueGrid } from '../components/composites/KeyValueGrid';
import { StatusIndicator } from '../components/StatusIndicator';
import { EmptyState } from '../components/composites/EmptyState';
import { DetailPanel } from '../components/composites/DetailPanel';
import { Stack } from '../components/primitives/Stack';
import { Text } from '../components/primitives/Text';
import { useHivemindStore } from '../stores/hivemindStore';
import type {
  HivemindEvent,
  MergeState,
  ProjectRuntimeConfig,
  Task,
  TaskExecState,
  TaskFlow,
  TaskGraph,
} from '../types';
import styles from './ProjectDetail.module.css';

type ProjectTab = 'dashboard' | 'kanban';

type PanelSelection =
  | { type: 'task'; value: Task }
  | { type: 'graph'; value: TaskGraph }
  | { type: 'flow'; value: TaskFlow }
  | { type: 'merge'; value: MergeState }
  | { type: 'event'; value: HivemindEvent };

type KanbanColumnId = 'todo' | 'in_progress' | 'blocked' | 'done';

interface KanbanTask {
  task: Task;
  execState: TaskExecState | null;
  flowId: string | null;
}

interface ActiveAttemptContext {
  key: string;
  taskId: string;
  taskTitle: string;
  flowId: string;
  execState: TaskExecState;
  attemptId: string | null;
  startedAt: string;
}

interface CheckpointProjection {
  checkpointId: string;
  status: 'completed' | 'active';
  commitHash: string | null;
  completedAt: string | null;
}

const KANBAN_COLUMNS: Array<{ id: KanbanColumnId; title: string }> = [
  { id: 'todo', title: 'Todo' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'blocked', title: 'Blocked' },
  { id: 'done', title: 'Done' },
];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRuntime(runtime: ProjectRuntimeConfig | null | undefined): string {
  if (!runtime) return 'Not configured';
  const model = runtime.model ? ` (${runtime.model})` : '';
  return `${runtime.adapter_name}${model}`;
}

function flowProgress(flow: TaskFlow): string {
  const execs = Object.values(flow.task_executions);
  const successCount = execs.filter((exec) => exec.state === 'success').length;
  return `${successCount}/${execs.length}`;
}

function toKanbanColumn(task: Task, execState: TaskExecState | null): KanbanColumnId {
  if (task.state === 'closed') return 'done';
  if (!execState) return 'todo';
  if (execState === 'success') return 'done';
  if (execState === 'failed' || execState === 'escalated') return 'blocked';
  if (execState === 'running' || execState === 'verifying' || execState === 'retry') return 'in_progress';
  return 'todo';
}

function isActiveExecState(state: TaskExecState): boolean {
  return state === 'running' || state === 'verifying' || state === 'retry';
}

function computeCheckpointsFromEvents(events: HivemindEvent[]): {
  checkpoints: CheckpointProjection[];
  completedCount: number;
  totalExpected: number | null;
  completedAll: boolean;
} {
  const byCheckpoint = new Map<string, CheckpointProjection>();
  let totalExpected: number | null = null;
  let completedAll = false;

  for (const event of events) {
    const payload = event.payload as Record<string, unknown>;
    const payloadTotal = typeof payload.total === 'number' ? payload.total : null;
    if (payloadTotal !== null) {
      totalExpected = totalExpected === null ? payloadTotal : Math.max(totalExpected, payloadTotal);
    }
    if (payload.all_completed === true || payload.all_checkpoints_completed === true) {
      completedAll = true;
    }
    if (event.type === 'CheckpointCommitCreated') {
      const checkpointId = typeof payload.checkpoint_id === 'string'
        ? payload.checkpoint_id
        : typeof payload.checkpoint === 'string'
          ? payload.checkpoint
          : `checkpoint-${byCheckpoint.size + 1}`;
      const commitHash = typeof payload.commit_hash === 'string'
        ? payload.commit_hash
        : typeof payload.commit === 'string'
          ? payload.commit
          : null;
      byCheckpoint.set(checkpointId, {
        checkpointId,
        status: 'completed',
        commitHash,
        completedAt: event.timestamp,
      });
    }
  }

  const completedCheckpoints = Array.from(byCheckpoint.values());
  const completedCount = completedCheckpoints.length;

  if (totalExpected !== null && totalExpected > completedCount && !completedAll) {
    for (let i = completedCount; i < totalExpected; i++) {
      const pendingId = `pending-${i + 1}`;
      byCheckpoint.set(pendingId, {
        checkpointId: `Checkpoint ${i + 1}`,
        status: 'active',
        commitHash: null,
        completedAt: null,
      });
    }
  }

  const checkpoints = Array.from(byCheckpoint.values())
    .sort((a, b) => {
      if (a.status === 'active' && b.status === 'completed') return 1;
      if (a.status === 'completed' && b.status === 'active') return -1;
      return (a.completedAt ?? '') < (b.completedAt ?? '') ? 1 : -1;
    });

  return {
    checkpoints,
    completedCount,
    totalExpected,
    completedAll,
  };
}

function runtimeContextKey(taskId: string, flowId: string, attemptId: string | null): string {
  return `${taskId}::${flowId}::${attemptId ?? 'none'}`;
}

export function ProjectDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const {
    projects,
    tasks,
    graphs,
    flows,
    mergeStates,
    events,
    setSelectedProject,
    startTask,
    completeTask,
    retryTask,
    abortTask,
    closeTask,
    startFlow,
    pauseFlow,
    resumeFlow,
    abortFlow,
    validateGraph,
    createFlow,
    prepareMerge,
    approveMerge,
    executeMerge,
    addNotification,
  } = useHivemindStore();
  const [panelSelection, setPanelSelection] = useState<PanelSelection | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectTab>('dashboard');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumnId | null>(null);
  const [selectedRuntimeContextKey, setSelectedRuntimeContextKey] = useState<string | null>(null);

  const project = useMemo(
    () => projects.find((entry) => entry.id === id) ?? null,
    [projects, id],
  );

  useEffect(() => {
    if (project) setSelectedProject(project.id);
  }, [project, setSelectedProject]);

  if (!project) {
    return (
      <div className={styles.page}>
        <PageHeader
          title="Project Details"
          subtitle="Project not found"
          actions={(
            <Button
              variant="secondary"
              icon={<ArrowLeft size={16} />}
              onClick={() => navigate('/projects')}
            >
              Back to Projects
            </Button>
          )}
        />
        <Card variant="outlined">
          <EmptyState
            icon={<FolderKanban size={40} />}
            title="Project not found"
            description="The requested project ID is missing from current state."
          />
        </Card>
      </div>
    );
  }

  const projectTasks = tasks.filter((task) => task.project_id === project.id);
  const projectGraphs = graphs.filter((graph) => graph.project_id === project.id);
  const projectFlows = flows.filter((flow) => flow.project_id === project.id);
  const flowIds = new Set(projectFlows.map((flow) => flow.id));
  const projectMerges = mergeStates.filter((merge) => flowIds.has(merge.flow_id));
  const projectAllEvents = events.filter((event) => event.correlation.project_id === project.id);
  const projectEvents = projectAllEvents.slice(0, 20);

  const openTasks = projectTasks.filter((task) => task.state === 'open').length;
  const runningFlows = projectFlows.filter((flow) => flow.state === 'running').length;
  const pausedFlows = projectFlows.filter((flow) => flow.state === 'paused').length;
  const completedFlows = projectFlows.filter((flow) => flow.state === 'completed' || flow.state === 'merged').length;

  const latestExecutionByTask = useMemo(() => {
    const map = new Map<string, { state: TaskExecState; flowId: string; updatedAt: string }>();
    for (const flow of projectFlows) {
      for (const [taskId, execution] of Object.entries(flow.task_executions)) {
        const existing = map.get(taskId);
        if (!existing || execution.updated_at > existing.updatedAt) {
          map.set(taskId, { state: execution.state, flowId: flow.id, updatedAt: execution.updated_at });
        }
      }
    }
    return map;
  }, [projectFlows]);

  const taskMap = useMemo(
    () => new Map(projectTasks.map((task) => [task.id, task])),
    [projectTasks],
  );

  const activeAttemptContexts = useMemo(() => {
    const attemptStartedEvents = projectAllEvents.filter((event) => event.type === 'AttemptStarted');
    const contexts: ActiveAttemptContext[] = [];
    for (const flow of projectFlows) {
      for (const [taskId, execution] of Object.entries(flow.task_executions)) {
        if (!isActiveExecState(execution.state)) continue;
        const task = taskMap.get(taskId);
        if (!task) continue;
        const latestAttempt = attemptStartedEvents
          .filter((event) => event.correlation.flow_id === flow.id && event.correlation.task_id === taskId)
          .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))[0];
        const attemptId = latestAttempt?.correlation.attempt_id ?? null;
        const startedAt = latestAttempt?.timestamp ?? execution.updated_at;
        contexts.push({
          key: runtimeContextKey(taskId, flow.id, attemptId),
          taskId,
          taskTitle: task.title,
          flowId: flow.id,
          execState: execution.state,
          attemptId,
          startedAt,
        });
      }
    }
    return contexts.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  }, [projectFlows, projectAllEvents, taskMap]);

  useEffect(() => {
    if (activeAttemptContexts.length === 0) {
      if (selectedRuntimeContextKey !== null) setSelectedRuntimeContextKey(null);
      return;
    }
    const hasSelected = selectedRuntimeContextKey
      ? activeAttemptContexts.some((entry) => entry.key === selectedRuntimeContextKey)
      : false;
    if (!hasSelected) {
      setSelectedRuntimeContextKey(activeAttemptContexts[0].key);
    }
  }, [activeAttemptContexts, selectedRuntimeContextKey]);

  const selectedRuntimeContext = useMemo(
    () => activeAttemptContexts.find((entry) => entry.key === selectedRuntimeContextKey) ?? null,
    [activeAttemptContexts, selectedRuntimeContextKey],
  );

  const activeAttemptEventStream = useMemo(() => {
    if (!selectedRuntimeContext) return [];
    const stream = projectAllEvents.filter((event) => {
      if (event.correlation.flow_id !== selectedRuntimeContext.flowId) return false;
      if (event.correlation.task_id !== selectedRuntimeContext.taskId) return false;
      if (selectedRuntimeContext.attemptId && event.correlation.attempt_id === selectedRuntimeContext.attemptId) {
        return true;
      }
      if (event.correlation.attempt_id !== null) return false;
      return event.timestamp >= selectedRuntimeContext.startedAt;
    });
    return stream.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, 80);
  }, [projectAllEvents, selectedRuntimeContext]);

  const runtimeProjectionEvents = useMemo(
    () => activeAttemptEventStream.filter((event) => (
      event.category === 'runtime'
      || event.category === 'execution'
      || event.category === 'filesystem'
      || event.type === 'FileModified'
    )),
    [activeAttemptEventStream],
  );

  const panelCheckpointProjection = useMemo(() => {
    if (!panelSelection || panelSelection.type !== 'task') return null;
    const taskEvents = projectAllEvents.filter((event) => event.correlation.task_id === panelSelection.value.id);
    return computeCheckpointsFromEvents(taskEvents);
  }, [panelSelection, projectAllEvents]);

  const checkpointProjection = useMemo(() => {
    const result = computeCheckpointsFromEvents(activeAttemptEventStream);
    if (!result.completedAll && selectedRuntimeContext?.execState === 'verifying') {
      result.checkpoints.unshift({
        checkpointId: 'Current validation checkpoint',
        status: 'active',
        commitHash: null,
        completedAt: null,
      });
    }
    return result;
  }, [activeAttemptEventStream, selectedRuntimeContext]);

  const kanbanByColumn = useMemo(() => {
    const grouped: Record<KanbanColumnId, KanbanTask[]> = {
      todo: [],
      in_progress: [],
      blocked: [],
      done: [],
    };
    for (const task of projectTasks) {
      const latest = latestExecutionByTask.get(task.id);
      const execState = latest?.state ?? null;
      grouped[toKanbanColumn(task, execState)].push({
        task,
        execState,
        flowId: latest?.flowId ?? null,
      });
    }
    return grouped;
  }, [projectTasks, latestExecutionByTask]);

  const runProjectAction = async (label: string, action: () => Promise<void>) => {
    setBusyAction(label);
    try {
      await action();
      addNotification({
        type: 'success',
        title: 'Action completed',
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

  const moveTaskToColumn = async (task: Task, targetColumn: KanbanColumnId) => {
    const latest = latestExecutionByTask.get(task.id);
    const current = toKanbanColumn(task, latest?.state ?? null);
    if (current === targetColumn) return;

    if (targetColumn === 'todo') {
      if (task.state === 'closed') {
        throw new Error('Cannot move closed task back to Todo (re-open command not available).');
      }
      if (latest && ['failed', 'escalated', 'retry'].includes(latest.state)) {
        await retryTask({ task_id: task.id, mode: 'clean', reset_count: false });
        return;
      }
      return;
    }

    if (targetColumn === 'in_progress') {
      await startTask({ task_id: task.id });
      return;
    }

    if (targetColumn === 'blocked') {
      const confirmed = window.confirm(
        `Move task "${task.title}" to Blocked? This will abort the current task execution.`,
      );
      if (!confirmed) return;
      await abortTask({ task_id: task.id, reason: 'Moved to Blocked from project kanban' });
      return;
    }

    if (targetColumn === 'done') {
      const confirmed = window.confirm(
        `Move task "${task.title}" to Done? This will close the task.`,
      );
      if (!confirmed) return;
      try {
        await completeTask({ task_id: task.id });
      } catch {
        // Some tasks may not be in a running execution; continue to close attempt below.
      }
      await closeTask({ task_id: task.id, reason: 'Moved to Done from project kanban' });
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title={project.name}
        subtitle={project.description ?? 'No project description set'}
        actions={(
          <Stack direction="row" gap={2}>
            <div className={styles.tabs}>
              <button
                className={`${styles.tabBtn} ${activeTab === 'dashboard' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <LayoutDashboard size={14} />
                <span>Dashboard</span>
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'kanban' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('kanban')}
              >
                <KanbanSquare size={14} />
                <span>Kanban</span>
              </button>
            </div>
            <Button
              variant="secondary"
              icon={<ArrowLeft size={16} />}
              onClick={() => navigate('/projects')}
            >
              Back to Projects
            </Button>
          </Stack>
        )}
      />

      {activeTab === 'dashboard' && (
        <>
          <div className={styles.metrics}>
            <Card variant="outlined" className={styles.metricCard}>
              <Stack direction="row" gap={2} align="center">
                <ListTodo size={16} />
                <Text variant="caption" color="muted">Open Tasks</Text>
              </Stack>
              <Text variant="h4">{openTasks}</Text>
            </Card>
            <Card variant="outlined" className={styles.metricCard}>
              <Stack direction="row" gap={2} align="center">
                <Play size={16} />
                <Text variant="caption" color="muted">Running / Paused</Text>
              </Stack>
              <Text variant="h4">{runningFlows} / {pausedFlows}</Text>
            </Card>
            <Card variant="outlined" className={styles.metricCard}>
              <Stack direction="row" gap={2} align="center">
                <GitMerge size={16} />
                <Text variant="caption" color="muted">Merges</Text>
              </Stack>
              <Text variant="h4">{projectMerges.length}</Text>
            </Card>
            <Card variant="outlined" className={styles.metricCard}>
              <Stack direction="row" gap={2} align="center">
                <Activity size={16} />
                <Text variant="caption" color="muted">Recent Events</Text>
              </Stack>
              <Text variant="h4">{projectEvents.length}</Text>
            </Card>
          </div>

          <div className={styles.layout}>
            <Card variant="outlined" className={styles.section}>
              <div className={styles.sectionTitle}>Overview</div>
              <KeyValueGrid
                items={[
                  { label: 'Project ID', value: project.id },
                  { label: 'Created', value: formatDateTime(project.created_at) },
                  { label: 'Updated', value: formatDateTime(project.updated_at) },
                  { label: 'Repositories', value: project.repositories.length },
                  { label: 'Tasks', value: projectTasks.length },
                  { label: 'Graphs', value: projectGraphs.length },
                  { label: 'Flows', value: projectFlows.length },
                  { label: 'Completed Flows', value: completedFlows },
                ]}
              />
            </Card>

            <Card variant="outlined" className={styles.section}>
              <div className={styles.sectionTitle}>Runtime Configuration</div>
              <div className={styles.runtimeGrid}>
                <div className={styles.runtimeItem}>
                  <Text variant="overline" color="muted">Worker</Text>
                  <Text variant="body-sm">{formatRuntime(project.runtime_defaults?.worker ?? project.runtime)}</Text>
                </div>
                <div className={styles.runtimeItem}>
                  <Text variant="overline" color="muted">Validator</Text>
                  <Text variant="body-sm">{formatRuntime(project.runtime_defaults?.validator)}</Text>
                </div>
              </div>
            </Card>

            <Card variant="outlined" className={styles.section}>
              <div className={styles.sectionTitle}>Repositories</div>
              {project.repositories.length === 0 ? (
                <Text variant="body-sm" color="tertiary">No repositories attached.</Text>
              ) : (
                <div className={styles.list}>
                  {project.repositories.map((repo) => (
                    <div key={repo.path} className={styles.listRow}>
                      <Stack gap={1}>
                        <Stack direction="row" gap={2} align="center">
                          <GitBranch size={14} />
                          <Text variant="body-sm">{repo.name}</Text>
                        </Stack>
                        <Text variant="mono-sm" color="muted">{repo.path}</Text>
                      </Stack>
                      <Badge variant={repo.access_mode === 'readwrite' ? 'amber' : 'default'} size="sm">
                        {repo.access_mode}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card variant="outlined" className={styles.section}>
              <div className={styles.sectionTitle}>Tasks</div>
              {projectTasks.length === 0 ? (
                <Text variant="body-sm" color="tertiary">No tasks found for this project.</Text>
              ) : (
                <div className={styles.list}>
                  {projectTasks.slice(0, 30).map((task) => (
                    <button
                      key={task.id}
                      className={`${styles.listRow} ${styles.clickable}`}
                      onClick={() => setPanelSelection({ type: 'task', value: task })}
                    >
                      <Stack gap={1}>
                        <Text variant="body-sm">{task.title}</Text>
                        <Text variant="mono-sm" color="muted">{task.id}</Text>
                      </Stack>
                      <Stack direction="row" gap={2} align="center">
                        {task.scope && <Badge variant="warning" size="sm">scoped</Badge>}
                        <StatusIndicator status={task.state} showLabel />
                      </Stack>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card variant="outlined" className={styles.section}>
              <div className={styles.sectionTitle}>Task Graphs</div>
              {projectGraphs.length === 0 ? (
                <Text variant="body-sm" color="tertiary">No graphs created yet.</Text>
              ) : (
                <div className={styles.list}>
                  {projectGraphs.map((graph) => (
                    <button
                      key={graph.id}
                      className={`${styles.listRow} ${styles.clickable}`}
                      onClick={() => setPanelSelection({ type: 'graph', value: graph })}
                    >
                      <Stack gap={1}>
                        <Stack direction="row" gap={2} align="center">
                          <Layers size={14} />
                          <Text variant="body-sm">{graph.name}</Text>
                        </Stack>
                        <Text variant="mono-sm" color="muted">{graph.id}</Text>
                      </Stack>
                      <Stack direction="row" gap={2} align="center">
                        <Badge variant="default" size="sm">{Object.keys(graph.tasks).length} tasks</Badge>
                        <StatusIndicator status={graph.state} showLabel />
                      </Stack>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card variant="outlined" className={styles.section}>
              <div className={styles.sectionTitle}>Flows</div>
              {projectFlows.length === 0 ? (
                <Text variant="body-sm" color="tertiary">No flows started yet.</Text>
              ) : (
                <div className={styles.list}>
                  {projectFlows.map((flow) => (
                    <button
                      key={flow.id}
                      className={`${styles.listRow} ${styles.clickable}`}
                      onClick={() => setPanelSelection({ type: 'flow', value: flow })}
                    >
                      <Stack gap={1}>
                        <Stack direction="row" gap={2} align="center">
                          <GitFork size={14} />
                          <Text variant="body-sm">{flow.id}</Text>
                        </Stack>
                        <Stack direction="row" gap={2} align="center">
                          <Badge size="sm" variant="default">mode: {flow.run_mode ?? 'manual'}</Badge>
                          <Badge size="sm" variant="info">progress: {flowProgress(flow)}</Badge>
                        </Stack>
                      </Stack>
                      <StatusIndicator status={flow.state} showLabel />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card variant="outlined" className={styles.section}>
              <div className={styles.sectionTitle}>Merges</div>
              {projectMerges.length === 0 ? (
                <Text variant="body-sm" color="tertiary">No merge states for this project.</Text>
              ) : (
                <div className={styles.list}>
                  {projectMerges.map((merge) => (
                    <button
                      key={merge.flow_id}
                      className={`${styles.listRow} ${styles.clickable}`}
                      onClick={() => setPanelSelection({ type: 'merge', value: merge })}
                    >
                      <Stack gap={1}>
                        <Text variant="body-sm">{merge.flow_id}</Text>
                        <Stack direction="row" gap={2} align="center">
                          <Badge size="sm" variant="default">target: {merge.target_branch ?? 'main'}</Badge>
                          {merge.conflicts.length > 0 && (
                            <Badge size="sm" variant="error">{merge.conflicts.length} conflicts</Badge>
                          )}
                        </Stack>
                      </Stack>
                      <StatusIndicator status={merge.status} showLabel />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card variant="outlined" className={`${styles.section} ${styles.fullWidth}`}>
              <div className={styles.sectionTitle}>Recent Events</div>
              {projectEvents.length === 0 ? (
                <Text variant="body-sm" color="tertiary">No events for this project yet.</Text>
              ) : (
                <div className={styles.list}>
                  {projectEvents.map((event) => (
                    <button
                      key={event.id}
                      className={`${styles.listRow} ${styles.clickable}`}
                      onClick={() => setPanelSelection({ type: 'event', value: event })}
                    >
                      <Stack gap={1}>
                        <Stack direction="row" gap={2} align="center">
                          <Text variant="body-sm">{event.type}</Text>
                          <Badge size="sm" variant="default">{event.category}</Badge>
                        </Stack>
                        <Text variant="mono-sm" color="muted">
                          {event.id} · flow={event.correlation.flow_id ?? '-'} · task={event.correlation.task_id ?? '-'}
                        </Text>
                      </Stack>
                      <Stack direction="row" gap={2} align="center">
                        <Clock size={12} />
                        <Text variant="caption" color="muted">{formatDateTime(event.timestamp)}</Text>
                      </Stack>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {activeTab === 'kanban' && (
        <div className={styles.kanbanGrid}>
          {KANBAN_COLUMNS.map((column) => (
            <Card
              key={column.id}
              variant="outlined"
              className={`${styles.kanbanColumn} ${dragOverColumn === column.id ? styles.kanbanDropTarget : ''}`}
            >
              <div className={styles.kanbanHeader}>
                <Text variant="h4">{column.title}</Text>
                <Badge variant="default" size="sm">{kanbanByColumn[column.id].length}</Badge>
              </div>
              <div
                className={styles.kanbanList}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverColumn(column.id);
                }}
                onDragLeave={() => setDragOverColumn((prev) => (prev === column.id ? null : prev))}
                onDrop={() => {
                  const task = projectTasks.find((entry) => entry.id === draggingTaskId);
                  setDragOverColumn(null);
                  setDraggingTaskId(null);
                  if (!task) return;
                  void runProjectAction(`Move task to ${column.title}`, async () => {
                    await moveTaskToColumn(task, column.id);
                  });
                }}
              >
                {kanbanByColumn[column.id].length === 0 ? (
                  <Text variant="body-sm" color="tertiary">No tasks</Text>
                ) : (
                  kanbanByColumn[column.id].map((item) => (
                    <button
                      key={item.task.id}
                      className={styles.kanbanCard}
                      draggable
                      onDragStart={() => setDraggingTaskId(item.task.id)}
                      onDragEnd={() => {
                        setDraggingTaskId(null);
                        setDragOverColumn(null);
                      }}
                      onClick={() => setPanelSelection({ type: 'task', value: item.task })}
                    >
                      <Stack gap={2}>
                        <Text variant="body-sm">{item.task.title}</Text>
                        <Text variant="mono-sm" color="muted">{item.task.id}</Text>
                        <Stack direction="row" gap={2} align="center">
                          <StatusIndicator status={item.task.state} showLabel />
                          {item.execState && <Badge size="sm" variant="info">exec: {item.execState}</Badge>}
                        </Stack>
                        {item.flowId && (
                          <Text variant="caption" color="muted">flow: {item.flowId}</Text>
                        )}
                      </Stack>
                    </button>
                  ))
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card variant="outlined" className={styles.runtimeProjectionSection}>
        <div className={styles.sectionTitle}>Runtime Projection</div>
        {activeAttemptContexts.length === 0 ? (
          <Text variant="body-sm" color="tertiary">
            No active task attempts. Start or resume a task to view its runtime projection stream.
          </Text>
        ) : (
          <div className={styles.runtimeProjectionLayout}>
            <div className={styles.runtimeStream}>
              <div className={styles.runtimeHeaderRow}>
                <Text variant="body-sm">Event stream for active task/attempt</Text>
                <select
                  className={styles.runtimeSelect}
                  value={selectedRuntimeContext?.key ?? ''}
                  onChange={(event) => setSelectedRuntimeContextKey(event.target.value)}
                >
                  {activeAttemptContexts.map((context) => (
                    <option key={context.key} value={context.key}>
                      {context.taskTitle} · {context.flowId} · {context.attemptId ?? 'attempt-pending'}
                    </option>
                  ))}
                </select>
              </div>
              {selectedRuntimeContext && (
                <div className={styles.runtimeMeta}>
                  <Badge size="sm" variant="info">state: {selectedRuntimeContext.execState}</Badge>
                  <Badge size="sm" variant="default">flow: {selectedRuntimeContext.flowId}</Badge>
                  <Badge size="sm" variant="default">attempt: {selectedRuntimeContext.attemptId ?? 'pending'}</Badge>
                </div>
              )}
              <div className={styles.list}>
                {runtimeProjectionEvents.length === 0 ? (
                  <Text variant="body-sm" color="tertiary">No runtime projection events for this attempt yet.</Text>
                ) : (
                  runtimeProjectionEvents.map((event) => (
                    <button
                      key={event.id}
                      className={`${styles.listRow} ${styles.clickable}`}
                      onClick={() => setPanelSelection({ type: 'event', value: event })}
                    >
                      <Stack gap={1}>
                        <Stack direction="row" gap={2} align="center">
                          <Text variant="body-sm">{event.type}</Text>
                          <Badge size="sm" variant="default">{event.category}</Badge>
                        </Stack>
                        <Text variant="mono-sm" color="muted">{event.id}</Text>
                      </Stack>
                      <Text variant="caption" color="muted">{formatDateTime(event.timestamp)}</Text>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className={styles.checkpointStatus}>
              <Text variant="body-sm">Checkpoint status</Text>
              <div className={styles.runtimeMeta}>
                <Badge size="sm" variant={checkpointProjection.completedAll ? 'success' : 'warning'}>
                  {checkpointProjection.completedAll ? 'all completed' : 'in progress'}
                </Badge>
                <Badge size="sm" variant="default">
                  {checkpointProjection.completedCount}
                  {checkpointProjection.totalExpected ? ` / ${checkpointProjection.totalExpected}` : ''} completed
                </Badge>
              </div>
              {checkpointProjection.checkpoints.length === 0 ? (
                <Text variant="body-sm" color="tertiary">No checkpoint records for the current attempt.</Text>
              ) : (
                <div className={styles.list}>
                  {checkpointProjection.checkpoints.map((checkpoint) => (
                    <div key={checkpoint.checkpointId} className={styles.listRow}>
                      <Stack gap={1}>
                        <Text variant="body-sm">{checkpoint.checkpointId}</Text>
                        {checkpoint.commitHash && (
                          <Text variant="mono-sm" color="muted">{checkpoint.commitHash}</Text>
                        )}
                      </Stack>
                      <Stack gap={1} align="end">
                        <Badge size="sm" variant={checkpoint.status === 'completed' ? 'success' : 'default'}>
                          {checkpoint.status === 'completed' ? 'completed' : 'pending'}
                        </Badge>
                        {checkpoint.completedAt && (
                          <Text variant="caption" color="muted">{formatDateTime(checkpoint.completedAt)}</Text>
                        )}
                      </Stack>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      <DetailPanel
        open={panelSelection !== null}
        onClose={() => setPanelSelection(null)}
        header={panelSelection ? <Text variant="h4">{panelSelection.type} details</Text> : undefined}
      >
        {panelSelection?.type === 'task' && (
          <div className={styles.panelBody}>
            <KeyValueGrid
              items={[
                { label: 'Task ID', value: panelSelection.value.id },
                { label: 'Title', value: panelSelection.value.title },
                { label: 'State', value: panelSelection.value.state },
                { label: 'Run Mode', value: panelSelection.value.run_mode ?? 'auto' },
                { label: 'Created', value: formatDateTime(panelSelection.value.created_at) },
                { label: 'Updated', value: formatDateTime(panelSelection.value.updated_at) },
              ]}
              columns={1}
            />
            <div className={styles.panelSection}>
              <Text variant="body-sm">Checkpoints</Text>
              {panelCheckpointProjection && panelCheckpointProjection.checkpoints.length > 0 ? (
                <>
                  <div className={styles.runtimeMeta}>
                    <Badge size="sm" variant={panelCheckpointProjection.completedAll ? 'success' : 'warning'}>
                      {panelCheckpointProjection.completedAll ? 'all completed' : 'in progress'}
                    </Badge>
                    <Badge size="sm" variant="default">
                      {panelCheckpointProjection.completedCount}
                      {panelCheckpointProjection.totalExpected ? ` / ${panelCheckpointProjection.totalExpected}` : ''} completed
                    </Badge>
                  </div>
                  <div className={styles.list}>
                    {panelCheckpointProjection.checkpoints.map((checkpoint) => (
                      <div key={checkpoint.checkpointId} className={styles.listRow}>
                        <Stack gap={1}>
                          <Text variant="body-sm">{checkpoint.checkpointId}</Text>
                          {checkpoint.commitHash && (
                            <Text variant="mono-sm" color="muted">{checkpoint.commitHash}</Text>
                          )}
                        </Stack>
                        <Stack gap={1} align="end">
                          <Badge size="sm" variant={checkpoint.status === 'completed' ? 'success' : 'default'}>
                            {checkpoint.status === 'completed' ? 'completed' : 'pending'}
                          </Badge>
                          {checkpoint.completedAt && (
                            <Text variant="caption" color="muted">{formatDateTime(checkpoint.completedAt)}</Text>
                          )}
                        </Stack>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <Text variant="body-sm" color="tertiary">No checkpoint records for this task.</Text>
              )}
            </div>
            <div className={styles.panelActions}>
              <Button size="sm" variant="primary" loading={busyAction === 'Start task'} onClick={() => void runProjectAction('Start task', async () => { await startTask({ task_id: panelSelection.value.id }); })}>Start</Button>
              <Button size="sm" variant="secondary" loading={busyAction === 'Complete task'} onClick={() => void runProjectAction('Complete task', async () => completeTask({ task_id: panelSelection.value.id }))}>Complete</Button>
              <Button size="sm" variant="secondary" loading={busyAction === 'Retry task'} onClick={() => void runProjectAction('Retry task', async () => retryTask({ task_id: panelSelection.value.id, mode: 'clean' }))}>Retry</Button>
              <Button size="sm" variant="danger" loading={busyAction === 'Abort task'} onClick={() => {
                const confirmed = window.confirm('Abort this task execution?');
                if (!confirmed) return;
                void runProjectAction('Abort task', async () => abortTask({ task_id: panelSelection.value.id, reason: 'Aborted from project detail panel' }));
              }}>Abort</Button>
              <Button size="sm" variant="secondary" loading={busyAction === 'Close task'} onClick={() => {
                const confirmed = window.confirm('Close this task?');
                if (!confirmed) return;
                void runProjectAction('Close task', async () => closeTask({ task_id: panelSelection.value.id, reason: 'Closed from project detail panel' }));
              }}>Close</Button>
            </div>
          </div>
        )}
        {panelSelection?.type === 'graph' && (
          <div className={styles.panelBody}>
            <KeyValueGrid
              items={[
                { label: 'Graph ID', value: panelSelection.value.id },
                { label: 'Name', value: panelSelection.value.name },
                { label: 'State', value: panelSelection.value.state },
                { label: 'Tasks', value: Object.keys(panelSelection.value.tasks).length },
                { label: 'Updated', value: formatDateTime(panelSelection.value.updated_at) },
              ]}
              columns={1}
            />
            <div className={styles.panelActions}>
              <Button size="sm" variant="secondary" loading={busyAction === 'Validate graph'} onClick={() => void runProjectAction('Validate graph', async () => validateGraph({ graph_id: panelSelection.value.id }))}>Validate</Button>
              <Button size="sm" variant="primary" loading={busyAction === 'Create flow from graph'} onClick={() => void runProjectAction('Create flow from graph', async () => createFlow({ graph_id: panelSelection.value.id }))}>Create Flow</Button>
            </div>
          </div>
        )}
        {panelSelection?.type === 'flow' && (
          <div className={styles.panelBody}>
            <KeyValueGrid
              items={[
                { label: 'Flow ID', value: panelSelection.value.id },
                { label: 'Graph ID', value: panelSelection.value.graph_id },
                { label: 'State', value: panelSelection.value.state },
                { label: 'Run Mode', value: panelSelection.value.run_mode ?? 'manual' },
                { label: 'Started', value: panelSelection.value.started_at ? formatDateTime(panelSelection.value.started_at) : 'Not started' },
                { label: 'Progress', value: flowProgress(panelSelection.value) },
              ]}
              columns={1}
            />
            <div className={styles.panelActions}>
              <Button size="sm" variant="primary" loading={busyAction === 'Start flow'} onClick={() => void runProjectAction('Start flow', async () => startFlow({ flow_id: panelSelection.value.id }))}>Start</Button>
              <Button size="sm" variant="secondary" loading={busyAction === 'Pause flow'} onClick={() => void runProjectAction('Pause flow', async () => pauseFlow({ flow_id: panelSelection.value.id }))}>Pause</Button>
              <Button size="sm" variant="secondary" loading={busyAction === 'Resume flow'} onClick={() => void runProjectAction('Resume flow', async () => resumeFlow({ flow_id: panelSelection.value.id }))}>Resume</Button>
              <Button size="sm" variant="danger" loading={busyAction === 'Abort flow'} onClick={() => {
                const confirmed = window.confirm('Abort this flow?');
                if (!confirmed) return;
                void runProjectAction('Abort flow', async () => abortFlow({ flow_id: panelSelection.value.id, reason: 'Aborted from project detail panel', force: false }));
              }}>Abort</Button>
              <Button size="sm" variant="secondary" loading={busyAction === 'Prepare merge'} onClick={() => void runProjectAction('Prepare merge', async () => prepareMerge({ flow_id: panelSelection.value.id }))}>Prepare Merge</Button>
            </div>
          </div>
        )}
        {panelSelection?.type === 'merge' && (
          <div className={styles.panelBody}>
            <KeyValueGrid
              items={[
                { label: 'Flow ID', value: panelSelection.value.flow_id },
                { label: 'Status', value: panelSelection.value.status },
                { label: 'Target Branch', value: panelSelection.value.target_branch ?? 'main' },
                { label: 'Conflicts', value: panelSelection.value.conflicts.length },
                { label: 'Commits', value: panelSelection.value.commits.length },
                { label: 'Updated', value: formatDateTime(panelSelection.value.updated_at) },
              ]}
              columns={1}
            />
            <div className={styles.panelActions}>
              <Button size="sm" variant="secondary" loading={busyAction === 'Approve merge'} onClick={() => void runProjectAction('Approve merge', async () => approveMerge({ flow_id: panelSelection.value.flow_id }))}>Approve</Button>
              <Button size="sm" variant="primary" loading={busyAction === 'Execute merge'} onClick={() => {
                const confirmed = window.confirm('Execute this merge now?');
                if (!confirmed) return;
                void runProjectAction('Execute merge', async () => executeMerge({ flow_id: panelSelection.value.flow_id, mode: 'local' }));
              }}>Execute</Button>
            </div>
          </div>
        )}
        {panelSelection?.type === 'event' && (
          <div className={styles.panelBody}>
            <KeyValueGrid
              items={[
                { label: 'Event ID', value: panelSelection.value.id },
                { label: 'Type', value: panelSelection.value.type },
                { label: 'Category', value: panelSelection.value.category },
                { label: 'Timestamp', value: formatDateTime(panelSelection.value.timestamp) },
                { label: 'Flow', value: panelSelection.value.correlation.flow_id ?? '-' },
                { label: 'Task', value: panelSelection.value.correlation.task_id ?? '-' },
              ]}
              columns={1}
            />
            <pre className={styles.payload}>{JSON.stringify(panelSelection.value.payload, null, 2)}</pre>
          </div>
        )}
      </DetailPanel>
    </div>
  );
}
