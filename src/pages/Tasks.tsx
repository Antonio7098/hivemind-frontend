import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
import type { Task, TaskState, Scope } from '../types';
import styles from './Tasks.module.css';

type FilterState = TaskState | 'all';

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
    createTask,
    updateTask,
    closeTask,
    startTask,
    completeTask,
    retryTask,
    abortTask,
    verifyRun,
    verifyOverride,
    refreshFromApi,
    addNotification,
    apiError,
  } = useHivemindStore();
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
  }, [selectedTask]);

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
          </>
        )}
      </DetailPanel>
    </div>
  );
}
