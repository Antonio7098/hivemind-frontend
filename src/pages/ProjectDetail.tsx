import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  FolderKanban,
  GitBranch,
  GitFork,
  ListTodo,
  Play,
  Layers,
  GitMerge,
  LayoutDashboard,
  KanbanSquare,
  Shield,
  Sparkles,
  RefreshCw,
  CheckCircle,
  FileText,
  BookOpen,
  Code,
  Plus,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../components/composites/PageHeader';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { KeyValueGrid } from '../components/composites/KeyValueGrid';
import { StatusIndicator } from '../components/StatusIndicator';
import { EmptyState } from '../components/composites/EmptyState';
import { DetailPanel } from '../components/composites/DetailPanel';
import { Grid } from '../components/primitives/Grid';
import { Stack } from '../components/primitives/Stack';
import { Text } from '../components/primitives/Text';
import { MetricCard } from '../components/composites/MetricCard';
import { ListItem } from '../components/composites/ListItem';
import { CardHeader } from '../components/composites/CardHeader';
import { TabPanel, TabList, Tab, TabContent } from '../components/composites/TabPanel';
import { Expandable } from '../components/composites/Expandable';
import { DataList, DataListItem, DataListEmpty } from '../components/composites/DataList';
import { useHivemindStore } from '../stores/hivemindStore';
import type {
  AttemptInspectView,
  HivemindEvent,
  MergeState,
  ProjectRuntimeConfig,
  RuntimeApprovalView,
  RuntimeStreamItemView,
  Task,
  TaskExecState,
  TaskFlow,
  TaskGraph,
  GovernanceConstitutionResult,
  GovernanceDocumentSummary,
  GovernanceNotepadResult,
  GlobalSkillSummary,
  GlobalTemplateSummary,
} from '../types';
import styles from './ProjectDetail.module.css';

type ProjectTab = 'overview' | 'governance' | 'kanban';

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

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function getStringValue(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === 'string' ? value : null;
}

function runtimeKindBadgeVariant(kind: string): 'default' | 'success' | 'warning' | 'error' | 'info' | 'amber' {
  if (kind.includes('checkpoint')) return 'success';
  if (kind === 'approval') return 'warning';
  if (kind === 'command' || kind.startsWith('tool_call')) return 'amber';
  if (kind === 'runtime_exited' || kind === 'runtime_terminated' || kind === 'runtime_error') return 'error';
  if (kind === 'narrative' || kind === 'session' || kind === 'turn') return 'info';
  return 'default';
}

function approvalStatusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' | 'amber' {
  switch (status) {
    case 'approved':
      return 'success';
    case 'denied':
      return 'error';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
}

function approvalLabel(approval: RuntimeApprovalView): string {
  return approval.resource ?? approval.tool_name;
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
    fetchConstitution,
    checkConstitution,
    fetchGovernanceDocuments,
    fetchProjectNotepad,
    fetchGlobalNotepad,
    fetchGlobalSkills,
    fetchGlobalTemplates,
    refreshGraphSnapshot,
    fetchRuntimeStream,
    inspectAttempt,
    getGraphForFlow,
    attachProjectRepo,
    detachProjectRepo,
    createTask,
  } = useHivemindStore();
  const [panelSelection, setPanelSelection] = useState<PanelSelection | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectTab>('overview');
  const [constitution, setConstitution] = useState<GovernanceConstitutionResult | null>(null);
  const [documents, setDocuments] = useState<GovernanceDocumentSummary[]>([]);
  const [projectNotepad, setProjectNotepad] = useState<GovernanceNotepadResult | null>(null);
  const [globalNotepad, setGlobalNotepad] = useState<GovernanceNotepadResult | null>(null);
  const [skills, setSkills] = useState<GlobalSkillSummary[]>([]);
  const [templates, setTemplates] = useState<GlobalTemplateSummary[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumnId | null>(null);
  const [selectedRuntimeContextKey, setSelectedRuntimeContextKey] = useState<string | null>(null);
  const [runtimeProjectionItems, setRuntimeProjectionItems] = useState<RuntimeStreamItemView[]>([]);
  const [runtimeProjectionInspect, setRuntimeProjectionInspect] = useState<AttemptInspectView | null>(null);
  const [runtimeProjectionBusy, setRuntimeProjectionBusy] = useState(false);
  const [runtimeProjectionError, setRuntimeProjectionError] = useState<string | null>(null);
  const [showAddRepoModal, setShowAddRepoModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showCreateFlowModal, setShowCreateFlowModal] = useState(false);
  const [newRepoPath, setNewRepoPath] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoAccess, setNewRepoAccess] = useState<'readonly' | 'readwrite'>('readwrite');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newFlowGraphId, setNewFlowGraphId] = useState('');

  const project = useMemo(
    () => projects.find((entry) => entry.id === id) ?? null,
    [projects, id],
  );

  useEffect(() => {
    if (project) setSelectedProject(project.id);
  }, [project, setSelectedProject]);



  const projectTasks = tasks.filter((task) => task.project_id === project?.id);
  const projectGraphs = graphs.filter((graph) => graph.project_id === project?.id);
  const projectFlows = flows.filter((flow) => flow.project_id === project?.id);
  const flowIds = new Set(projectFlows.map((flow) => flow.id));
  const projectMerges = mergeStates.filter((merge) => flowIds.has(merge.flow_id));
  const projectAllEvents = events.filter((event) => event.correlation.project_id === project?.id);

  const openTasks = projectTasks.filter((task) => task.state === 'open').length;

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

  useEffect(() => {
    let cancelled = false;

    if (!selectedRuntimeContext) {
      setRuntimeProjectionItems([]);
      setRuntimeProjectionInspect(null);
      setRuntimeProjectionError(null);
      setRuntimeProjectionBusy(false);
      return;
    }

    const loadRuntimeProjection = async () => {
      setRuntimeProjectionBusy(true);
      setRuntimeProjectionError(null);

      try {
        const [items, inspect] = await Promise.all([
          fetchRuntimeStream({
            attempt_id: selectedRuntimeContext.attemptId ?? undefined,
            flow_id: selectedRuntimeContext.flowId,
            limit: 120,
          }),
          selectedRuntimeContext.attemptId
            ? inspectAttempt({ attempt_id: selectedRuntimeContext.attemptId })
            : Promise.resolve(null),
        ]);

        if (cancelled) return;
        setRuntimeProjectionItems(items);
        setRuntimeProjectionInspect(inspect);
      } catch (error) {
        if (cancelled) return;
        setRuntimeProjectionItems([]);
        setRuntimeProjectionInspect(null);
        setRuntimeProjectionError(error instanceof Error ? error.message : String(error));
      } finally {
        if (!cancelled) setRuntimeProjectionBusy(false);
      }
    };

    void loadRuntimeProjection();

    return () => {
      cancelled = true;
    };
  }, [selectedRuntimeContext, fetchRuntimeStream, inspectAttempt]);

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


  const loadProjectGovernance = useCallback(async () => {
    if (!project) return;
    /* loading */
    try {
      const [constitutionData, docsData, notepadData] = await Promise.all([
        fetchConstitution(project.name).catch(() => null),
        fetchGovernanceDocuments(project.name).catch(() => []),
        fetchProjectNotepad(project.name).catch(() => null),
      ]);
      setConstitution(constitutionData);
      setDocuments(docsData);
      setProjectNotepad(notepadData);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to load project governance',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      /* loading */
    }
  }, [project, fetchConstitution, fetchGovernanceDocuments, fetchProjectNotepad, addNotification]);

  const loadGlobalGovernance = useCallback(async () => {
    /* loading */
    try {
      const [notepadData, skillsData, templatesData] = await Promise.all([
        fetchGlobalNotepad().catch(() => null),
        fetchGlobalSkills().catch(() => []),
        fetchGlobalTemplates().catch(() => []),
      ]);
      setGlobalNotepad(notepadData);
      setSkills(skillsData);
      setTemplates(templatesData);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to load global governance',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      /* loading */
    }
  }, [fetchGlobalNotepad, fetchGlobalSkills, fetchGlobalTemplates, addNotification]);

  useEffect(() => {
    void loadProjectGovernance();
  }, [loadProjectGovernance]);

  useEffect(() => {
    void loadGlobalGovernance();
  }, [loadGlobalGovernance]);

  const handleCheckConstitution = async () => {
    if (!project) return;
    const label = 'Validate constitution';
    setBusyAction(label);
    try {
      const result = await checkConstitution({ project: project.name });
      if (result.valid) {
        addNotification({ type: 'success', title: 'Constitution valid', message: 'All checks passed' });
      } else {
        addNotification({
          type: 'warning',
          title: 'Constitution issues detected',
          message: result.errors.join(', '),
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Validation failed',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRefreshSnapshot = async () => {
    if (!project) return;
    const label = 'Refresh graph snapshot';
    setBusyAction(label);
    try {
      await refreshGraphSnapshot({ project: project.name, trigger: 'project-detail' });
      addNotification({ type: 'success', title: 'Snapshot refreshed' });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Snapshot refresh failed',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleAddRepo = async () => {
    if (!project) return;
    const label = 'Add repository';
    setBusyAction(label);
    try {
      await attachProjectRepo({
        project: project.name,
        path: newRepoPath.trim(),
        name: newRepoName.trim() || undefined,
        access: newRepoAccess,
      });
      addNotification({ type: 'success', title: 'Repository added' });
      setNewRepoPath('');
      setNewRepoName('');
      setShowAddRepoModal(false);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to add repository',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDetachRepo = async (repoName: string) => {
    if (!project) return;
    if (!confirm(`Are you sure you want to detach repository "${repoName}" from project "${project.name}"?`)) {
      return;
    }
    const label = 'Detach repository';
    setBusyAction(label);
    try {
      await detachProjectRepo({ project: project.name, repo_name: repoName });
      addNotification({ type: 'success', title: 'Repository detached' });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to detach repository',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateTask = async () => {
    if (!project) return;
    const label = 'Create task';
    setBusyAction(label);
    try {
      await createTask({
        project: project.name,
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
      });
      addNotification({ type: 'success', title: 'Task created' });
      setNewTaskTitle('');
      setNewTaskDescription('');
      setShowCreateTaskModal(false);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to create task',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateFlow = async () => {
    if (!project || !newFlowGraphId) return;
    const label = 'Create flow';
    setBusyAction(label);
    try {
      await createFlow({ graph_id: newFlowGraphId });
      addNotification({ type: 'success', title: 'Flow created' });
      setNewFlowGraphId('');
      setShowCreateFlowModal(false);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to create flow',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusyAction(null);
    }
  };




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

  const renderOverview = () => (
    <div className={styles.overviewTab}>
      <Grid columns={4} gap={4} className={styles.metricsGrid}>
        <MetricCard icon={<Play size={24} />} value={projectFlows.filter((flow) => flow.state === 'running').length} label="Active Flows" color="var(--state-running)" />
        <MetricCard icon={<ListTodo size={24} />} value={openTasks} label="Open Tasks" color="var(--accent-400)" />
        <MetricCard icon={<Layers size={24} />} value={projectGraphs.length} label="Graphs" color="var(--state-verifying)" />
        <MetricCard icon={<GitMerge size={24} />} value={projectMerges.filter((merge) => merge.status !== 'completed').length} label="Pending Merges" color="var(--state-pending)" />
      </Grid>

      <Grid columns={2} gap={4} className={styles.contentGrid}>
        <Card
          variant="default"
          padding="none"
          header={
            <CardHeader
              icon={<GitFork size={18} />}
              title="Flows"
              trailing={<Badge variant="default" size="sm">{projectFlows.length}</Badge>}
              actions={
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={() => setShowCreateFlowModal(true)}
                >
                  Create Flow
                </Button>
              }
            />
          }
        >
          <div className={styles.flowList}>
            {projectFlows.length === 0 ? (
              <EmptyState
                icon={<GitFork size={32} strokeWidth={1} />}
                title="No flows yet"
                description="Create a graph and start a flow to begin execution"
              />
            ) : (
              projectFlows.map((flow) => {
                const graph = getGraphForFlow(flow);
                const execs = Object.values(flow.task_executions);
                const successCount = execs.filter((exec) => exec.state === 'success').length;
                return (
                  <ListItem
                    key={flow.id}
                    icon={<StatusIndicator status={flow.state} size="md" />}
                    title={graph?.name ?? flow.id}
                    subtitle={`${successCount}/${execs.length} tasks complete`}
                    trailing={<Badge variant="default" size="sm">{flow.state}</Badge>}
                    onClick={() => setPanelSelection({ type: 'flow', value: flow })}
                  />
                );
              })
            )}
          </div>
        </Card>

        <Card
          variant="default"
          padding="none"
          header={<CardHeader icon={<Layers size={18} />} title="Task Graphs" trailing={<Badge variant="default" size="sm">{projectGraphs.length}</Badge>} />}
        >
          <div className={styles.graphList}>
            {projectGraphs.length === 0 ? (
              <EmptyState
                icon={<Layers size={32} strokeWidth={1} />}
                title="No graphs yet"
                description="Create a graph to organize your tasks"
              />
            ) : (
              projectGraphs.map((graph) => (
                <ListItem
                  key={graph.id}
                  icon={<Layers size={18} />}
                  title={graph.name}
                  subtitle={Object.keys(graph.tasks).length + ' tasks'}
                  trailing={<Badge variant="default" size="sm">{graph.state}</Badge>}
                  onClick={() => setPanelSelection({ type: 'graph', value: graph })}
                />
              ))
            )}
          </div>
        </Card>

        <Card
          variant="default"
          padding="none"
          header={<CardHeader icon={<ListTodo size={18} />} title="Tasks" trailing={<Badge variant="default" size="sm">{projectTasks.length}</Badge>} />}
        >
          <div className={styles.taskList}>
            {projectTasks.length === 0 ? (
              <EmptyState
                icon={<ListTodo size={32} strokeWidth={1} />}
                title="No tasks yet"
                description="Create a task to start working on your project"
              />
            ) : (
              projectTasks.map((task) => (
                <ListItem
                  key={task.id}
                  icon={<StatusIndicator status={task.state} size="md" />}
                  title={task.title}
                  subtitle={task.id}
                  trailing={<Badge variant="default" size="sm">{task.state}</Badge>}
                  onClick={() => setPanelSelection({ type: 'task', value: task })}
                />
              ))
            )}
          </div>
        </Card>

        <Button
          variant="primary"
          icon={<Plus size={14} />}
          onClick={() => setShowCreateTaskModal(true)}
        >
          Create Task
        </Button>

        <Card
          variant="default"
          padding="none"
          header={<CardHeader icon={<GitMerge size={18} />} title="Merges" trailing={<Badge variant="default" size="sm">{projectMerges.length}</Badge>} />}
        >
          <div className={styles.mergeList}>
            {projectMerges.length === 0 ? (
              <EmptyState
                icon={<GitMerge size={32} strokeWidth={1} />}
                title="No merges yet"
                description="Create a merge to combine your changes"
              />
            ) : (
              projectMerges.map((merge) => (
                <ListItem
                  key={merge.flow_id}
                  icon={<StatusIndicator status={merge.status} size="md" />}
                  title={merge.flow_id}
                  subtitle={merge.target_branch}
                  trailing={<Badge variant="default" size="sm">{merge.status}</Badge>}
                  onClick={() => setPanelSelection({ type: 'merge', value: merge })}
                />
              ))
            )}
          </div>
        </Card>
      </Grid>
    </div>
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title={project.name}
        subtitle={project.description ?? 'No project description set'}
        actions={(
          <Stack direction="row" gap={2}>
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

      <TabPanel value={activeTab} onTabChange={(tabId) => setActiveTab(tabId as ProjectTab)} variant="pills" className={styles.projectTabs}>
        <TabList>
          <Tab id="overview" icon={<LayoutDashboard size={14} />}>Overview</Tab>
          <Tab id="governance" icon={<Shield size={14} />}>Governance</Tab>
          <Tab id="kanban" icon={<KanbanSquare size={14} />}>Kanban</Tab>
        </TabList>

        <TabContent id="overview">
          <div className={styles.dashboardTab}>
            {renderOverview()}
            <div className={styles.layout}>
              <Card variant="outlined" className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionTitle}>Repositories</div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Plus size={14} />}
                    onClick={() => setShowAddRepoModal(true)}
                  >
                    Add Repo
                  </Button>
                </div>
                {project?.repositories.length === 0 ? (
                  <Text variant="body-sm" color="tertiary">No repositories attached.</Text>
                ) : (
                  <div className={styles.list}>
                    {project?.repositories.map((repo) => (
                      <div key={repo.path} className={styles.listRow}>
                        <Stack gap={1}>
                          <Stack direction="row" gap={2} align="center">
                            <GitBranch size={14} />
                            <Text variant="body-sm">{repo.name}</Text>
                          </Stack>
                          <Text variant="mono-sm" color="muted">{repo.path}</Text>
                        </Stack>
                        <Stack direction="row" gap={2} align="center">
                          <Badge variant={repo.access_mode === 'readwrite' ? 'amber' : 'default'} size="sm">
                            {repo.access_mode}
                          </Badge>
                          <button
                            className={styles.iconBtn}
                            onClick={() => handleDetachRepo(repo.name)}
                            title="Detach repository"
                          >
                            <Trash2 size={14} />
                          </button>
                        </Stack>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card variant="outlined" className={styles.section}>
                <div className={styles.sectionTitle}>Runtime Configuration</div>
                <div className={styles.runtimeGrid}>
                  <div className={styles.runtimeItem}>
                    <Text variant="overline" color="muted">Worker</Text>
                    <Text variant="body-sm">{formatRuntime(project?.runtime_defaults?.worker ?? project?.runtime)}</Text>
                  </div>
                  <div className={styles.runtimeItem}>
                    <Text variant="overline" color="muted">Validator</Text>
                    <Text variant="body-sm">{formatRuntime(project?.runtime_defaults?.validator)}</Text>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabContent>

        <TabContent id="kanban">

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
        </TabContent>

        <TabContent id="governance">
          <Card variant="default" className={styles.governanceCard}>
            <TabPanel defaultTab="project" variant="pills">
              <TabList>
                <Tab id="project" icon={<Shield size={14} />}>
                  Project
                  {project && <Badge variant="default" size="sm">{project.name}</Badge>}
                </Tab>
                <Tab id="global" icon={<Sparkles size={14} />}>
                  Global
                </Tab>
              </TabList>

              <TabContent id="project">
                <Stack direction="column" gap={4} className={styles.tabContent}>
                  <Expandable
                    title="Constitution"
                    subtitle={constitution?.initialized ? 'Initialized' : 'Not initialized'}
                    icon={<Shield size={16} />}
                    badge={
                      constitution?.initialized ? (
                        <Badge variant="success" size="sm">Active</Badge>
                      ) : (
                        <Badge variant="warning" size="sm">Not Set</Badge>
                      )
                    }
                    defaultOpen
                    variant="card"
                  >
                    <Stack direction="column" gap={3}>
                      {constitution?.initialized ? (
                        <>
                          <div className={styles.constitutionMeta}>
                            <div className={styles.metaItem}>
                              <Text variant="caption" color="muted">Schema Version</Text>
                              <Text variant="body">{constitution.schema_version || 'N/A'}</Text>
                            </div>
                            {constitution.validated_at && (
                              <div className={styles.metaItem}>
                                <Text variant="caption" color="muted">Last Validated</Text>
                                <Text variant="body">
                                  {new Date(constitution.validated_at).toLocaleString()}
                                </Text>
                              </div>
                            )}
                          </div>
                          {constitution.content && (
                            <pre className={styles.codeBlock}>{constitution.content}</pre>
                          )}
                          <div className={styles.actions}>
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={<CheckCircle size={12} />}
                              loading={busyAction === 'Validate constitution'}
                              onClick={handleCheckConstitution}
                            >
                              Validate
                            </Button>
                          </div>
                        </>
                      ) : (
                        <Text variant="body" color="muted">
                          No constitution configured for this project.
                        </Text>
                      )}
                    </Stack>
                  </Expandable>

                  <Expandable
                    title="Documents"
                    subtitle={`${documents.length} document(s)`}
                    icon={<FileText size={16} />}
                    badge={<Badge variant="default" size="sm">{documents.length}</Badge>}
                    variant="card"
                  >
                    {documents.length === 0 ? (
                      <DataListEmpty
                        icon={<FileText size={32} strokeWidth={1} />}
                        title="No Documents"
                        description="Create governance documents to define project rules"
                      />
                    ) : (
                      <DataList>
                        {documents.map(doc => (
                          <DataListItem
                            key={doc.document_id}
                            icon={<FileText size={16} />}
                            title={doc.title}
                            subtitle={`${doc.revision_count} revision(s)`}
                            value={new Date(doc.updated_at).toLocaleDateString()}
                          />
                        ))}
                      </DataList>
                    )}
                  </Expandable>

                  <Expandable
                    title="Project Notepad"
                    subtitle="Scratchpad for project notes"
                    icon={<BookOpen size={16} />}
                    variant="card"
                  >
                    {projectNotepad?.content ? (
                      <pre className={styles.notepad}>{projectNotepad.content}</pre>
                    ) : (
                      <Text variant="body" color="muted">No notepad content.</Text>
                    )}
                  </Expandable>

                  <Expandable
                    title="Code Graph"
                    subtitle="UCP-based code structure snapshot"
                    icon={<Layers size={16} />}
                    variant="card"
                  >
                    <Stack direction="column" gap={3}>
                      <Text variant="body" color="secondary">
                        Refresh the code graph snapshot to update the project's understanding of the codebase structure.
                      </Text>
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<RefreshCw size={12} />}
                        loading={busyAction === 'Refresh graph snapshot'}
                        onClick={handleRefreshSnapshot}
                      >
                        Refresh Snapshot
                      </Button>
                    </Stack>
                  </Expandable>
                </Stack>
              </TabContent>

              <TabContent id="global">
                <Stack direction="column" gap={4} className={styles.tabContent}>
                  <Expandable
                    title="Skills"
                    subtitle={`${skills.length} skill(s) defined`}
                    icon={<Code size={16} />}
                    badge={<Badge variant="default" size="sm">{skills.length}</Badge>}
                    defaultOpen
                    variant="card"
                  >
                    {skills.length === 0 ? (
                      <DataListEmpty
                        icon={<Code size={32} strokeWidth={1} />}
                        title="No Skills"
                        description="Define global skills to share across projects"
                      />
                    ) : (
                      <DataList>
                        {skills.map(skill => (
                          <DataListItem
                            key={skill.skill_id}
                            icon={<Code size={16} />}
                            title={skill.name}
                            subtitle={skill.description || skill.skill_id}
                            value={new Date(skill.updated_at).toLocaleDateString()}
                          />
                        ))}
                      </DataList>
                    )}
                  </Expandable>

                  <Expandable
                    title="Templates"
                    subtitle={`${templates.length} template(s) defined`}
                    icon={<Layers size={16} />}
                    badge={<Badge variant="default" size="sm">{templates.length}</Badge>}
                    variant="card"
                  >
                    {templates.length === 0 ? (
                      <DataListEmpty
                        icon={<Layers size={32} strokeWidth={1} />}
                        title="No Templates"
                        description="Define global templates for consistent agent prompts"
                      />
                    ) : (
                      <DataList>
                        {templates.map(template => (
                          <DataListItem
                            key={template.template_id}
                            icon={<Layers size={16} />}
                            title={template.template_id}
                            subtitle={`System: ${template.system_prompt_id} • ${template.skill_ids.length} skill(s)`}
                            value={new Date(template.updated_at).toLocaleDateString()}
                          />
                        ))}
                      </DataList>
                    )}
                  </Expandable>

                  <Expandable
                    title="Global Notepad"
                    subtitle="Shared scratchpad across all projects"
                    icon={<BookOpen size={16} />}
                    variant="card"
                  >
                    {globalNotepad?.content ? (
                      <pre className={styles.notepad}>{globalNotepad.content}</pre>
                    ) : (
                      <Text variant="body" color="muted">No global notepad content.</Text>
                    )}
                  </Expandable>
                </Stack>
              </TabContent>
            </TabPanel>
          </Card>
        </TabContent>
      </TabPanel>

      {activeTab === 'governance' && (
        <Card variant="default" className={styles.governanceCard}>
          <TabPanel defaultTab="project" variant="pills">
            <TabList>
              <Tab id="project" icon={<Shield size={14} />}>
                Project
                {project && <Badge variant="default" size="sm">{project.name}</Badge>}
              </Tab>
              <Tab id="global" icon={<Sparkles size={14} />}>
                Global
              </Tab>
            </TabList>

            <TabContent id="project">
              <Stack direction="column" gap={4} className={styles.tabContent}>
                <Expandable
                  title="Constitution"
                  subtitle={constitution?.initialized ? 'Initialized' : 'Not initialized'}
                  icon={<Shield size={16} />}
                  badge={
                    constitution?.initialized ? (
                      <Badge variant="success" size="sm">Active</Badge>
                    ) : (
                      <Badge variant="warning" size="sm">Not Set</Badge>
                    )
                  }
                  defaultOpen
                  variant="card"
                >
                  <Stack direction="column" gap={3}>
                    {constitution?.initialized ? (
                      <>
                        <div className={styles.constitutionMeta}>
                          <div className={styles.metaItem}>
                            <Text variant="caption" color="muted">Schema Version</Text>
                            <Text variant="body">{constitution.schema_version || 'N/A'}</Text>
                          </div>
                          {constitution.validated_at && (
                            <div className={styles.metaItem}>
                              <Text variant="caption" color="muted">Last Validated</Text>
                              <Text variant="body">
                                {new Date(constitution.validated_at).toLocaleString()}
                              </Text>
                            </div>
                          )}
                        </div>
                        {constitution.content && (
                          <pre className={styles.codeBlock}>{constitution.content}</pre>
                        )}
                        <div className={styles.actions}>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<CheckCircle size={12} />}
                            loading={busyAction === 'Validate constitution'}
                            onClick={handleCheckConstitution}
                          >
                            Validate
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Text variant="body" color="muted">
                        No constitution configured for this project.
                      </Text>
                    )}
                  </Stack>
                </Expandable>

                <Expandable
                  title="Documents"
                  subtitle={`${documents.length} document(s)`}
                  icon={<FileText size={16} />}
                  badge={<Badge variant="default" size="sm">{documents.length}</Badge>}
                  variant="card"
                >
                  {documents.length === 0 ? (
                    <DataListEmpty
                      icon={<FileText size={32} strokeWidth={1} />}
                      title="No Documents"
                      description="Create governance documents to define project rules"
                    />
                  ) : (
                    <DataList>
                      {documents.map(doc => (
                        <DataListItem
                          key={doc.document_id}
                          icon={<FileText size={16} />}
                          title={doc.title}
                          subtitle={`${doc.revision_count} revision(s)`}
                          value={new Date(doc.updated_at).toLocaleDateString()}
                        />
                      ))}
                    </DataList>
                  )}
                </Expandable>

                <Expandable
                  title="Project Notepad"
                  subtitle="Scratchpad for project notes"
                  icon={<BookOpen size={16} />}
                  variant="card"
                >
                  {projectNotepad?.content ? (
                    <pre className={styles.notepad}>{projectNotepad.content}</pre>
                  ) : (
                    <Text variant="body" color="muted">No notepad content.</Text>
                  )}
                </Expandable>

                <Expandable
                  title="Code Graph"
                  subtitle="UCP-based code structure snapshot"
                  icon={<Layers size={16} />}
                  variant="card"
                >
                  <Stack direction="column" gap={3}>
                    <Text variant="body" color="secondary">
                      Refresh the code graph snapshot to update the project's understanding of the codebase structure.
                    </Text>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<RefreshCw size={12} />}
                      loading={busyAction === 'Refresh graph snapshot'}
                      onClick={handleRefreshSnapshot}
                    >
                      Refresh Snapshot
                    </Button>
                  </Stack>
                </Expandable>
              </Stack>
            </TabContent>

            <TabContent id="global">
              <Stack direction="column" gap={4} className={styles.tabContent}>
                <Expandable
                  title="Skills"
                  subtitle={`${skills.length} skill(s) defined`}
                  icon={<Code size={16} />}
                  badge={<Badge variant="default" size="sm">{skills.length}</Badge>}
                  defaultOpen
                  variant="card"
                >
                  {skills.length === 0 ? (
                    <DataListEmpty
                      icon={<Code size={32} strokeWidth={1} />}
                      title="No Skills"
                      description="Define global skills to share across projects"
                    />
                  ) : (
                    <DataList>
                      {skills.map(skill => (
                        <DataListItem
                          key={skill.skill_id}
                          icon={<Code size={16} />}
                          title={skill.name}
                          subtitle={skill.description || skill.skill_id}
                          value={new Date(skill.updated_at).toLocaleDateString()}
                        />
                      ))}
                    </DataList>
                  )}
                </Expandable>

                <Expandable
                  title="Templates"
                  subtitle={`${templates.length} template(s) defined`}
                  icon={<Layers size={16} />}
                  badge={<Badge variant="default" size="sm">{templates.length}</Badge>}
                  variant="card"
                >
                  {templates.length === 0 ? (
                    <DataListEmpty
                      icon={<Layers size={32} strokeWidth={1} />}
                      title="No Templates"
                      description="Define global templates for consistent agent prompts"
                    />
                  ) : (
                    <DataList>
                      {templates.map(template => (
                        <DataListItem
                          key={template.template_id}
                          icon={<Layers size={16} />}
                          title={template.template_id}
                          subtitle={`System: ${template.system_prompt_id} • ${template.skill_ids.length} skill(s)`}
                          value={new Date(template.updated_at).toLocaleDateString()}
                        />
                      ))}
                    </DataList>
                  )}
                </Expandable>

                <Expandable
                  title="Global Notepad"
                  subtitle="Shared scratchpad across all projects"
                  icon={<BookOpen size={16} />}
                  variant="card"
                >
                  {globalNotepad?.content ? (
                    <pre className={styles.notepad}>{globalNotepad.content}</pre>
                  ) : (
                    <Text variant="body" color="muted">No global notepad content.</Text>
                  )}
                </Expandable>
              </Stack>
            </TabContent>
          </TabPanel>
        </Card>
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
                <Text variant="body-sm">Projected runtime timeline for the active task/attempt</Text>
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
                  {runtimeProjectionInspect?.runtime_session && (
                    <Badge size="sm" variant="info">
                      session: {runtimeProjectionInspect.runtime_session.adapter_name}
                    </Badge>
                  )}
                  {runtimeProjectionInspect && (
                    <Badge size="sm" variant={runtimeProjectionInspect.pending_approvals.length > 0 ? 'warning' : 'success'}>
                      approvals: {runtimeProjectionInspect.pending_approvals.length} pending
                    </Badge>
                  )}
                </div>
              )}
              <div className={styles.list}>
                {runtimeProjectionBusy ? (
                  <Text variant="body-sm" color="tertiary">Loading runtime projection…</Text>
                ) : runtimeProjectionError ? (
                  <Text variant="body-sm" color="error">{runtimeProjectionError}</Text>
                ) : runtimeProjectionItems.length === 0 ? (
                  <Text variant="body-sm" color="tertiary">No projected runtime items for this attempt yet.</Text>
                ) : (
                  runtimeProjectionItems.map((item) => {
                    const data = asRecord(item.data);
                    const status = getStringValue(data, 'status');
                    const decision = getStringValue(data, 'decision');
                    const resource = getStringValue(data, 'resource');
                    const toolName = getStringValue(data, 'tool_name');

                    return (
                      <div key={`${item.event_id}-${item.kind}`} className={styles.listRow}>
                      <Stack gap={1}>
                        <Stack direction="row" gap={2} align="center">
                          <Text variant="body-sm">{item.title ?? item.kind}</Text>
                          <Badge size="sm" variant={runtimeKindBadgeVariant(item.kind)}>{item.kind}</Badge>
                          {status && <Badge size="sm" variant={approvalStatusBadgeVariant(status)}>{status}</Badge>}
                          {decision && <Badge size="sm" variant="default">{decision}</Badge>}
                          {item.stream && <Badge size="sm" variant="default">{item.stream}</Badge>}
                        </Stack>
                        {(item.text || resource || toolName) && (
                          <Text variant="body-sm" color="secondary">
                            {item.text ?? [resource, toolName].filter(Boolean).join(' · ')}
                          </Text>
                        )}
                        <Text variant="mono-sm" color="muted">{item.event_id}</Text>
                      </Stack>
                      <Text variant="caption" color="muted">{formatDateTime(item.timestamp)}</Text>
                    </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className={styles.checkpointStatus}>
              {runtimeProjectionInspect?.runtime_session && (
                <>
                  <Text variant="body-sm">Runtime session</Text>
                  <div className={styles.list}>
                    <div className={styles.listRow}>
                      <Stack gap={1}>
                        <Text variant="body-sm">{runtimeProjectionInspect.runtime_session.session_id}</Text>
                        <Text variant="caption" color="muted">
                          observed {formatDateTime(runtimeProjectionInspect.runtime_session.discovered_at)}
                        </Text>
                      </Stack>
                      <Badge size="sm" variant="info">{runtimeProjectionInspect.runtime_session.adapter_name}</Badge>
                    </div>
                  </div>
                </>
              )}

              {runtimeProjectionInspect && (
                <>
                  <Text variant="body-sm">Approval status</Text>
                  <div className={styles.runtimeMeta}>
                    <Badge size="sm" variant={runtimeProjectionInspect.pending_approvals.length > 0 ? 'warning' : 'success'}>
                      {runtimeProjectionInspect.pending_approvals.length} pending
                    </Badge>
                    <Badge size="sm" variant="default">{runtimeProjectionInspect.approvals.length} total</Badge>
                  </div>
                  {runtimeProjectionInspect.approvals.length === 0 ? (
                    <Text variant="body-sm" color="tertiary">No projected approvals for this attempt.</Text>
                  ) : (
                    <div className={styles.list}>
                      {runtimeProjectionInspect.approvals.map((approval) => (
                        <div key={approval.approval_id} className={styles.listRow}>
                          <Stack gap={1}>
                            <Stack direction="row" gap={2} align="center">
                              <Text variant="body-sm">{approvalLabel(approval)}</Text>
                              <Badge size="sm" variant="info">{approval.approval_kind}</Badge>
                              <Badge size="sm" variant={approvalStatusBadgeVariant(approval.status)}>{approval.status}</Badge>
                            </Stack>
                            {approval.summary && <Text variant="body-sm" color="secondary">{approval.summary}</Text>}
                            <Text variant="caption" color="muted">
                              tool {approval.tool_name} · turn {approval.turn_index + 1}
                            </Text>
                          </Stack>
                          <Stack gap={1} align="end">
                            {approval.decision && <Badge size="sm" variant="default">{approval.decision}</Badge>}
                            <Text variant="caption" color="muted">
                              {approval.resolved_at ? formatDateTime(approval.resolved_at) : 'awaiting resolution'}
                            </Text>
                          </Stack>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

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

      <DetailPanel
        open={showAddRepoModal}
        onClose={() => setShowAddRepoModal(false)}
        width={400}
        header={<Text variant="h4">Add Repository</Text>}
      >
        <div className={styles.form}>
          <input
            className={styles.input}
            placeholder="Repository path"
            value={newRepoPath}
            onChange={(e) => setNewRepoPath(e.target.value)}
          />
          <input
            className={styles.input}
            placeholder="Repository name (optional)"
            value={newRepoName}
            onChange={(e) => setNewRepoName(e.target.value)}
          />
          <select
            className={styles.input}
            value={newRepoAccess}
            onChange={(e) => setNewRepoAccess(e.target.value as 'readonly' | 'readwrite')}
          >
            <option value="readwrite">Read/Write</option>
            <option value="readonly">Read Only</option>
          </select>
          <Button
            variant="primary"
            icon={<Plus size={14} />}
            loading={busyAction === 'Add repository'}
            disabled={!newRepoPath.trim()}
            onClick={handleAddRepo}
          >
            Add Repository
          </Button>
        </div>
      </DetailPanel>

      <DetailPanel
        open={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        width={400}
        header={<Text variant="h4">Create Task</Text>}
      >
        <div className={styles.form}>
          <input
            className={styles.input}
            placeholder="Task title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <textarea
            className={styles.textarea}
            placeholder="Description (optional)"
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
          />
          <Button
            variant="primary"
            icon={<Plus size={14} />}
            loading={busyAction === 'Create task'}
            disabled={!newTaskTitle.trim()}
            onClick={handleCreateTask}
          >
            Create Task
          </Button>
        </div>
      </DetailPanel>

      <DetailPanel
        open={showCreateFlowModal}
        onClose={() => setShowCreateFlowModal(false)}
        width={400}
        header={<Text variant="h4">Create Flow</Text>}
      >
        <div className={styles.form}>
          <select
            className={styles.input}
            value={newFlowGraphId}
            onChange={(e) => setNewFlowGraphId(e.target.value)}
          >
            <option value="">Select a graph</option>
            {projectGraphs.map((graph) => (
              <option key={graph.id} value={graph.id}>
                {graph.name}
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            icon={<Play size={14} />}
            loading={busyAction === 'Create flow'}
            disabled={!newFlowGraphId}
            onClick={handleCreateFlow}
          >
            Create Flow
          </Button>
        </div>
      </DetailPanel>
    </div>
  );
}
