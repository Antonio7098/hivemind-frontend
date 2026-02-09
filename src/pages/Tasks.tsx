import { useState, useMemo } from 'react';
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
  const { tasks, projects, selectedProjectId } = useHivemindStore();
  const [filter, setFilter] = useState<FilterState>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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
            <Button variant="primary" icon={<Plus size={16} />}>New Task</Button>
          </>
        }
      />

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
                <Button variant="primary" icon={<Plus size={16} />}>New Task</Button>
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
