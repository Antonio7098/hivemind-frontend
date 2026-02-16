import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams } from 'react-router-dom';
import {
  ListTodo,
  Plus,
  ChevronRight,
  Clock,
  Shield,
  FileText,
  GitBranch,
  Terminal,
} from 'lucide-react';
import { useHivemindStore } from '../stores/hivemindStore';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageHeader } from '../components/composites/PageHeader';
import { FilterBar } from '../components/composites/FilterBar';
import { DetailPanel } from '../components/composites/DetailPanel';
import { KeyValueGrid } from '../components/composites/KeyValueGrid';
import { EmptyState } from '../components/composites/EmptyState';
import { ListItem } from '../components/composites/ListItem';
import { Dot } from '../components/primitives/Dot';
import { Stack } from '../components/primitives/Stack';
import { Text } from '../components/primitives/Text';
import type { Task, TaskState, Scope, HivemindEvent } from '../types';
import styles from './Tasks.module.css';

type FilterState = TaskState | 'all';

interface CheckpointInfo {
  checkpointId: string;
  status: 'completed' | 'pending';
  commitHash: string | null;
  completedAt: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function computeTaskCheckpoints(events: HivemindEvent[], taskId: string): {
  checkpoints: CheckpointInfo[];
  completedCount: number;
  totalExpected: number | null;
  completedAll: boolean;
} {
  const taskEvents = events.filter((event) => event.correlation.task_id === taskId);
  const byCheckpoint = new Map<string, CheckpointInfo>();
  let totalExpected: number | null = null;
  let completedAll = false;

  for (const event of taskEvents) {
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

  const completedCount = byCheckpoint.size;

  if (totalExpected !== null && totalExpected > completedCount && !completedAll) {
    for (let i = completedCount; i < totalExpected; i++) {
      const pendingId = `pending-${i + 1}`;
      byCheckpoint.set(pendingId, {
        checkpointId: `Checkpoint ${i + 1}`,
        status: 'pending',
        commitHash: null,
        completedAt: null,
      });
    }
  }

  const checkpoints = Array.from(byCheckpoint.values())
    .sort((a, b) => {
      if (a.status === 'pending' && b.status === 'completed') return 1;
      if (a.status === 'completed' && b.status === 'pending') return -1;
      return (a.completedAt ?? '') < (b.completedAt ?? '') ? 1 : -1;
    });

  return {
    checkpoints,
    completedCount,
    totalExpected,
    completedAll,
  };
}

function ScopeDetails({ scope }: { scope: Scope }) {
  return (
    <div className={styles.scopeContainer}>
      {/* Filesystem Rules */}
      {scope.filesystem.rules.length > 0 && (
        <div className={styles.scopeSection}>
          <div className={styles.scopeSectionHeader}>
            <FileText size={14} />
            <span>Filesystem</span>
          </div>
          <div className={styles.scopeList}>
            {scope.filesystem.rules.map((rule, i) => (
              <div key={i} className={styles.scopeItem}>
                <code className={styles.scopePattern}>{rule.pattern}</code>
                <Badge
                  variant={rule.permission === 'write' ? 'success' : rule.permission === 'read' ? 'info' : 'error'}
                  size="sm"
                >
                  {rule.permission}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Repository Access */}
      {scope.repositories.length > 0 && (
        <div className={styles.scopeSection}>
          <div className={styles.scopeSectionHeader}>
            <GitBranch size={14} />
            <span>Repositories</span>
          </div>
          <div className={styles.scopeList}>
            {scope.repositories.map((repo, i) => (
              <div key={i} className={styles.scopeItem}>
                <code className={styles.scopePattern}>{repo.repo}</code>
                <Badge
                  variant={repo.mode === 'readwrite' ? 'success' : 'info'}
                  size="sm"
                >
                  {repo.mode}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Git Permissions */}
      {scope.git.permissions.length > 0 && (
        <div className={styles.scopeSection}>
          <div className={styles.scopeSectionHeader}>
            <GitBranch size={14} />
            <span>Git Permissions</span>
          </div>
          <div className={styles.scopeTags}>
            {scope.git.permissions.map((perm) => (
              <Badge key={perm} variant="amber" size="sm">
                {perm}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Execution Permissions */}
      {(scope.execution.allowed.length > 0 || scope.execution.denied.length > 0) && (
        <div className={styles.scopeSection}>
          <div className={styles.scopeSectionHeader}>
            <Terminal size={14} />
            <span>Execution</span>
          </div>
          <div className={styles.scopeList}>
            {scope.execution.allowed.map((cmd, i) => (
              <div key={`allow-${i}`} className={styles.scopeItem}>
                <code className={styles.scopePattern}>{cmd}</code>
                <Badge variant="success" size="sm">allowed</Badge>
              </div>
            ))}
            {scope.execution.denied.map((cmd, i) => (
              <div key={`deny-${i}`} className={styles.scopeItem}>
                <code className={styles.scopePattern}>{cmd}</code>
                <Badge variant="error" size="sm">denied</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Tasks() {
  const {
    tasks,
    projects,
    selectedProjectId,
    setSelectedProject,
    createTask,
    updateTask,
    closeTask,
    startTask,
    completeTask,
    retryTask,
    abortTask,
    setTaskRuntime,
    setTaskRunMode,
    verifyRun,
    verifyOverride,
    refreshFromApi,
    addNotification,
    apiError,
  } = useHivemindStore();
  const { id: routeTaskId } = useParams<{ id?: string }>();
  const [filter, setFilter] = useState<FilterState>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [newTaskProjectId, setNewTaskProjectId] = useState<string>(selectedProjectId ?? '');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [abortReason, setAbortReason] = useState('');
  const [retryMode, setRetryMode] = useState<'clean' | 'continue'>('clean');
  const [resetRetryCount, setResetRetryCount] = useState(false);
  const [overrideDecision, setOverrideDecision] = useState<'pass' | 'fail'>('pass');
  const [overrideReason, setOverrideReason] = useState('');
  const [runtimeRole, setRuntimeRole] = useState<'worker' | 'validator'>('worker');
  const [runtimeAdapter, setRuntimeAdapter] = useState('opencode');
  const [runtimeBinary, setRuntimeBinary] = useState('opencode');
  const [runtimeModel, setRuntimeModel] = useState('');
  const [runtimeArgs, setRuntimeArgs] = useState('');
  const [runtimeEnv, setRuntimeEnv] = useState('');
  const [runtimeTimeout, setRuntimeTimeout] = useState('600000');

  const projectTasks = useMemo(() => {
    const filtered = selectedProjectId
      ? tasks.filter((t) => t.project_id === selectedProjectId)
      : tasks;

    if (filter === 'all') return filtered;
    return filtered.filter((t) => t.state === filter);
  }, [tasks, selectedProjectId, filter]);

  const selectedTask: Task | null = useMemo(
    () => (selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null),
    [tasks, selectedTaskId],
  );

  useEffect(() => {
    if (!routeTaskId) return;
    setSelectedTaskId(routeTaskId);
  }, [routeTaskId]);

  useEffect(() => {
    if (!routeTaskId) return;
    const taskFromRoute = tasks.find((task) => task.id === routeTaskId);
    if (taskFromRoute) {
      setSelectedProject(taskFromRoute.project_id);
    }
  }, [routeTaskId, tasks, setSelectedProject]);

  useEffect(() => {
    if (selectedProjectId) {
      setNewTaskProjectId(selectedProjectId);
    } else if (!newTaskProjectId && projects.length > 0) {
      setNewTaskProjectId(projects[0].id);
    }
  }, [selectedProjectId, projects, newTaskProjectId]);

  useEffect(() => {
    if (!selectedTask) return;
    setEditTitle(selectedTask.title);
    setEditDescription(selectedTask.description ?? '');
    const selectedRuntime =
      runtimeRole === 'validator'
        ? selectedTask.runtime_overrides?.validator ?? null
        : selectedTask.runtime_overrides?.worker ?? selectedTask.runtime_override ?? null;
    setRuntimeAdapter(selectedRuntime?.adapter_name ?? 'opencode');
    setRuntimeBinary(selectedRuntime?.binary_path ?? 'opencode');
    setRuntimeModel(selectedRuntime?.model ?? '');
    setRuntimeArgs(selectedRuntime?.args?.join(' ') ?? '');
    setRuntimeEnv(
      Object.entries(selectedRuntime?.env ?? {})
        .map(([key, value]) => `${key}=${value}`)
        .join('\n'),
    );
    setRuntimeTimeout(String(selectedRuntime?.timeout_ms ?? 600000));
  }, [selectedTask, runtimeRole]);

  const parseArgs = (raw: string): string[] =>
    raw
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean);

  const parseEnv = (raw: string): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const idx = trimmed.indexOf('=');
      if (idx <= 0) continue;
      out[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
    }
    return out;
  };

  const runTaskAction = async (label: string, action: () => Promise<void>) => {
    setBusyAction(label);
    try {
      await action();
      addNotification({
        type: 'success',
        title: 'Task operation complete',
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

  const getProjectName = (projectId: string): string => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name ?? projectId;
  };

  const openCount = tasks.filter(
    (t) => (!selectedProjectId || t.project_id === selectedProjectId) && t.state === 'open',
  ).length;
  const closedCount = tasks.filter(
    (t) => (!selectedProjectId || t.project_id === selectedProjectId) && t.state === 'closed',
  ).length;

  const filterChips = [
    { id: 'all' as const, label: `All (${openCount + closedCount})`, active: filter === 'all' },
    { id: 'open' as const, label: `Open (${openCount})`, icon: <Dot color="var(--green-500)" size={6} pulse />, active: filter === 'open' },
    { id: 'closed' as const, label: `Closed (${closedCount})`, icon: <Dot color="var(--gray-400)" size={6} />, active: filter === 'closed' },
  ];

  const handleFilterToggle = (id: string) => {
    setFilter(id as FilterState);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Tasks"
        subtitle="Open/closed task items with scope contracts"
        actions={
          <>
            <FilterBar
              label=""
              chips={filterChips}
              onToggle={handleFilterToggle}
            />
            <Button
              variant="secondary"
              loading={busyAction === 'Refresh state'}
              onClick={() => runTaskAction('Refresh state', async () => refreshFromApi())}
            >
              Refresh
            </Button>
          </>
        }
      />

      <Card variant="outlined" className={styles.opsPanel}>
        <div className={styles.opsHeaderRow}>
          <h4>Task operations</h4>
          {apiError && <span className={styles.opsError}>{apiError}</span>}
        </div>

        <div className={styles.opsGrid}>
          <section className={styles.opsSection}>
            <h5>Create</h5>
            <select
              className={styles.opInput}
              value={newTaskProjectId}
              onChange={(e) => setNewTaskProjectId(e.target.value)}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <input
              className={styles.opInput}
              placeholder="Task title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            <textarea
              className={styles.opTextarea}
              placeholder="Task description"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
            />
            <Button
              variant="primary"
              icon={<Plus size={14} />}
              loading={busyAction === 'Create task'}
              disabled={!newTaskProjectId || !newTaskTitle.trim()}
              onClick={() =>
                runTaskAction('Create task', async () => {
                  await createTask({
                    project: newTaskProjectId,
                    title: newTaskTitle.trim(),
                    description: newTaskDescription.trim() || undefined,
                  });
                  setNewTaskTitle('');
                  setNewTaskDescription('');
                })
              }
            >
              Create task
            </Button>
          </section>

          <section className={styles.opsSection}>
            <h5>Selected task</h5>
            <input
              className={styles.opInput}
              placeholder="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              disabled={!selectedTask}
            />
            <textarea
              className={styles.opTextarea}
              placeholder="Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              disabled={!selectedTask}
            />
            <Button
              variant="secondary"
              loading={busyAction === 'Update task'}
              disabled={!selectedTask}
              onClick={() =>
                runTaskAction('Update task', async () => {
                  if (!selectedTask) return;
                  await updateTask({
                    task_id: selectedTask.id,
                    title: editTitle.trim() || undefined,
                    description: editDescription.trim() || undefined,
                  });
                })
              }
            >
              Save metadata
            </Button>

            <input
              className={styles.opInput}
              placeholder="Close reason (optional)"
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              disabled={!selectedTask}
            />
            <Button
              variant="secondary"
              loading={busyAction === 'Close task'}
              disabled={!selectedTask}
              onClick={() =>
                runTaskAction('Close task', async () => {
                  if (!selectedTask) return;
                  await closeTask({ task_id: selectedTask.id, reason: closeReason.trim() || undefined });
                })
              }
            >
              Close task
            </Button>

            <div className={styles.actionRow}>
              <Button
                variant="primary"
                size="sm"
                loading={busyAction === 'Start task execution'}
                disabled={!selectedTask}
                onClick={() =>
                  runTaskAction('Start task execution', async () => {
                    if (!selectedTask) return;
                    const result = await startTask({ task_id: selectedTask.id });
                    addNotification({
                      type: 'info',
                      title: 'Attempt started',
                      message: result.attempt_id,
                    });
                  })
                }
              >
                Start
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={busyAction === 'Complete task execution'}
                disabled={!selectedTask}
                onClick={() =>
                  runTaskAction('Complete task execution', async () => {
                    if (!selectedTask) return;
                    await completeTask({ task_id: selectedTask.id });
                  })
                }
              >
                Complete
              </Button>
            </div>

            <div className={styles.actionRow}>
              <select
                className={styles.opInput}
                value={retryMode}
                onChange={(e) => setRetryMode(e.target.value as 'clean' | 'continue')}
                disabled={!selectedTask}
              >
                <option value="clean">Retry clean</option>
                <option value="continue">Retry continue</option>
              </select>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={resetRetryCount}
                  onChange={(e) => setResetRetryCount(e.target.checked)}
                  disabled={!selectedTask}
                />
                reset count
              </label>
            </div>

            <div className={styles.actionRow}>
              <Button
                variant="secondary"
                size="sm"
                loading={busyAction === 'Retry task'}
                disabled={!selectedTask}
                onClick={() =>
                  runTaskAction('Retry task', async () => {
                    if (!selectedTask) return;
                    await retryTask({
                      task_id: selectedTask.id,
                      mode: retryMode,
                      reset_count: resetRetryCount,
                    });
                  })
                }
              >
                Retry
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={busyAction === 'Abort task'}
                disabled={!selectedTask}
                onClick={() =>
                  runTaskAction('Abort task', async () => {
                    if (!selectedTask) return;
                    await abortTask({
                      task_id: selectedTask.id,
                      reason: abortReason.trim() || undefined,
                    });
                  })
                }
              >
                Abort
              </Button>
            </div>

            <input
              className={styles.opInput}
              placeholder="Abort reason"
              value={abortReason}
              onChange={(e) => setAbortReason(e.target.value)}
              disabled={!selectedTask}
            />
          </section>

          <section className={styles.opsSection}>
            <h5>Verification</h5>
            <Button
              variant="secondary"
              loading={busyAction === 'Run verification'}
              disabled={!selectedTask}
              onClick={() =>
                runTaskAction('Run verification', async () => {
                  if (!selectedTask) return;
                  await verifyRun({ task_id: selectedTask.id });
                })
              }
            >
              Run verify
            </Button>

            <select
              className={styles.opInput}
              value={overrideDecision}
              onChange={(e) => setOverrideDecision(e.target.value as 'pass' | 'fail')}
              disabled={!selectedTask}
            >
              <option value="pass">pass</option>
              <option value="fail">fail</option>
            </select>
            <textarea
              className={styles.opTextarea}
              placeholder="Override reason"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              disabled={!selectedTask}
            />
            <Button
              variant="danger"
              loading={busyAction === 'Apply override'}
              disabled={!selectedTask || !overrideReason.trim()}
              onClick={() =>
                runTaskAction('Apply override', async () => {
                  if (!selectedTask) return;
                  await verifyOverride({
                    task_id: selectedTask.id,
                    decision: overrideDecision,
                    reason: overrideReason.trim(),
                  });
                })
              }
            >
              Submit override
            </Button>
          </section>

          <section className={styles.opsSection}>
            <h5>Run mode and runtime</h5>
            <div className={styles.actionRow}>
              <Button
                size="sm"
                variant="secondary"
                disabled={!selectedTask}
                loading={busyAction === 'Set task auto mode'}
                onClick={() =>
                  runTaskAction('Set task auto mode', async () => {
                    if (!selectedTask) return;
                    await setTaskRunMode({ task_id: selectedTask.id, mode: 'auto' });
                  })
                }
              >
                Auto mode
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={!selectedTask}
                loading={busyAction === 'Set task manual mode'}
                onClick={() =>
                  runTaskAction('Set task manual mode', async () => {
                    if (!selectedTask) return;
                    await setTaskRunMode({ task_id: selectedTask.id, mode: 'manual' });
                  })
                }
              >
                Manual mode
              </Button>
            </div>

            <select
              className={styles.opInput}
              value={runtimeRole}
              onChange={(e) => setRuntimeRole(e.target.value as 'worker' | 'validator')}
              disabled={!selectedTask}
            >
              <option value="worker">worker runtime</option>
              <option value="validator">validator runtime</option>
            </select>
            <input
              className={styles.opInput}
              placeholder="Adapter"
              value={runtimeAdapter}
              onChange={(e) => setRuntimeAdapter(e.target.value)}
              disabled={!selectedTask}
            />
            <input
              className={styles.opInput}
              placeholder="Binary path"
              value={runtimeBinary}
              onChange={(e) => setRuntimeBinary(e.target.value)}
              disabled={!selectedTask}
            />
            <input
              className={styles.opInput}
              placeholder="Model (optional)"
              value={runtimeModel}
              onChange={(e) => setRuntimeModel(e.target.value)}
              disabled={!selectedTask}
            />
            <input
              className={styles.opInput}
              placeholder="Args (space separated)"
              value={runtimeArgs}
              onChange={(e) => setRuntimeArgs(e.target.value)}
              disabled={!selectedTask}
            />
            <textarea
              className={styles.opTextarea}
              placeholder="Env (KEY=VALUE per line)"
              value={runtimeEnv}
              onChange={(e) => setRuntimeEnv(e.target.value)}
              disabled={!selectedTask}
            />
            <input
              className={styles.opInput}
              placeholder="Timeout ms"
              value={runtimeTimeout}
              onChange={(e) => setRuntimeTimeout(e.target.value)}
              disabled={!selectedTask}
            />
            <div className={styles.actionRow}>
              <Button
                size="sm"
                variant="secondary"
                disabled={!selectedTask}
                loading={busyAction === 'Set task runtime override'}
                onClick={() =>
                  runTaskAction('Set task runtime override', async () => {
                    if (!selectedTask) return;
                    await setTaskRuntime({
                      task_id: selectedTask.id,
                      role: runtimeRole,
                      adapter: runtimeAdapter.trim() || undefined,
                      binary_path: runtimeBinary.trim() || undefined,
                      model: runtimeModel.trim() || undefined,
                      args: parseArgs(runtimeArgs),
                      env: parseEnv(runtimeEnv),
                      timeout_ms: Number(runtimeTimeout) || 600000,
                    });
                  })
                }
              >
                Save override
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={!selectedTask}
                loading={busyAction === 'Clear task runtime override'}
                onClick={() =>
                  runTaskAction('Clear task runtime override', async () => {
                    if (!selectedTask) return;
                    await setTaskRuntime({
                      task_id: selectedTask.id,
                      role: runtimeRole,
                      clear: true,
                    });
                  })
                }
              >
                Clear override
              </Button>
            </div>
          </section>
        </div>
      </Card>

      <AnimatePresence mode="wait">
        {projectTasks.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <EmptyState
              icon={<ListTodo size={48} />}
              title="No tasks found"
              description={
                filter !== 'all'
                  ? `No ${filter} tasks in this project. Try changing the filter.`
                  : 'Create your first task to get started.'
              }
              action={
                <Button
                  variant="primary"
                  icon={<Plus size={16} />}
                  disabled={!newTaskProjectId || !newTaskTitle.trim()}
                  onClick={() =>
                    runTaskAction('Create task', async () => {
                      await createTask({
                        project: newTaskProjectId,
                        title: newTaskTitle.trim(),
                        description: newTaskDescription.trim() || undefined,
                      });
                    })
                  }
                >
                  Create Task
                </Button>
              }
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            className={styles.listView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {projectTasks.map((task, index) => (
              <ListItem
                key={task.id}
                delay={index * 0.03}
                selected={selectedTaskId === task.id}
                onClick={() => setSelectedTaskId(task.id)}
                icon={
                  <Dot
                    color={task.state === 'open' ? 'var(--green-500)' : 'var(--gray-400)'}
                    size={10}
                    pulse={task.state === 'open'}
                  />
                }
                title={
                  <div className={styles.taskTitleRow}>
                    <span className={styles.taskTitle}>{task.title}</span>
                    <div className={styles.taskTags}>
                      {task.scope && (
                        <Badge variant="amber" size="sm" icon={<Shield size={10} />}>
                          scoped
                        </Badge>
                      )}
                      <Badge variant="default" size="sm">
                        {getProjectName(task.project_id)}
                      </Badge>
                    </div>
                  </div>
                }
                subtitle={
                  <div className={styles.taskSubtitle}>
                    {task.description && (
                      <span className={styles.taskDesc}>{task.description}</span>
                    )}
                    <span className={styles.taskMeta}>
                      <Clock size={11} />
                      {formatDate(task.updated_at)}
                    </span>
                  </div>
                }
                trailing={<ChevronRight size={16} className={styles.chevron} />}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <DetailPanel
        open={!!selectedTask}
        onClose={() => setSelectedTaskId(null)}
        header={
          selectedTask ? (
            <div className={styles.detailHeader}>
              <Dot
                color={selectedTask.state === 'open' ? 'var(--green-500)' : 'var(--gray-400)'}
                size={12}
                pulse={selectedTask.state === 'open'}
              />
              <Badge variant={selectedTask.state === 'open' ? 'success' : 'default'}>
                {selectedTask.state}
              </Badge>
            </div>
          ) : undefined
        }
      >
        {selectedTask && (
          <>
            <h2 className={styles.detailTitle}>{selectedTask.title}</h2>
            {selectedTask.description && (
              <p className={styles.detailDesc}>{selectedTask.description}</p>
            )}

            <div className={styles.detailSection}>
              <h4>Task Info</h4>
              <KeyValueGrid
                items={[
                  { label: 'Task ID', value: selectedTask.id },
                  { label: 'State', value: selectedTask.state },
                  { label: 'Run mode', value: selectedTask.run_mode ?? 'auto' },
                  { label: 'Project', value: getProjectName(selectedTask.project_id) },
                  { label: 'Project ID', value: selectedTask.project_id },
                  { label: 'Created', value: formatDateTime(selectedTask.created_at) },
                  { label: 'Updated', value: formatDateTime(selectedTask.updated_at) },
                ]}
              />
            </div>

            {selectedTask.scope && (
              <div className={styles.detailSection}>
                <h4>Scope Contract</h4>
                <ScopeDetails scope={selectedTask.scope} />
              </div>
            )}

            <div className={styles.detailSection}>
              <h4>Checkpoints</h4>
              <CheckpointSection taskId={selectedTask.id} />
            </div>
          </>
        )}
      </DetailPanel>
    </div>
  );
}

function CheckpointSection({ taskId }: { taskId: string }) {
  const { events } = useHivemindStore();
  const checkpointData = useMemo(
    () => computeTaskCheckpoints(events, taskId),
    [events, taskId],
  );

  if (checkpointData.checkpoints.length === 0) {
    return <Text variant="body-sm" color="tertiary">No checkpoint records for this task.</Text>;
  }

  return (
    <>
      <div className={styles.checkpointMeta}>
        <Badge size="sm" variant={checkpointData.completedAll ? 'success' : 'warning'}>
          {checkpointData.completedAll ? 'all completed' : 'in progress'}
        </Badge>
        <Badge size="sm" variant="default">
          {checkpointData.completedCount}
          {checkpointData.totalExpected ? ` / ${checkpointData.totalExpected}` : ''} completed
        </Badge>
      </div>
      <div className={styles.checkpointList}>
        {checkpointData.checkpoints.map((checkpoint) => (
          <div key={checkpoint.checkpointId} className={styles.checkpointRow}>
            <Stack gap={1}>
              <Text variant="body-sm">{checkpoint.checkpointId}</Text>
              {checkpoint.commitHash && (
                <Text variant="mono-sm" color="muted">{checkpoint.commitHash}</Text>
              )}
            </Stack>
            <Stack gap={1} align="end">
              <Badge size="sm" variant={checkpoint.status === 'completed' ? 'success' : 'default'}>
                {checkpoint.status}
              </Badge>
              {checkpoint.completedAt && (
                <Text variant="caption" color="muted">{formatDateTime(checkpoint.completedAt)}</Text>
              )}
            </Stack>
          </div>
        ))}
      </div>
    </>
  );
}
