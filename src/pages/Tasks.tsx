import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Filter,
  LayoutGrid,
  List,
  RotateCcw,
  AlertTriangle,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { useHivemindStore } from '../stores/hivemindStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { StatusIndicator } from '../components/StatusIndicator';
import type { TaskState } from '../types';
import styles from './Tasks.module.css';

// ═══════════════════════════════════════════════════════════════════════════
// TASKS PAGE
// Task listing with Kanban-style columns
// ═══════════════════════════════════════════════════════════════════════════

const columns: { id: TaskState | 'all'; label: string; color: string }[] = [
  { id: 'pending', label: 'Pending', color: 'var(--state-pending)' },
  { id: 'running', label: 'Running', color: 'var(--state-running)' },
  { id: 'verifying', label: 'Verifying', color: 'var(--state-verifying)' },
  { id: 'success', label: 'Success', color: 'var(--state-success)' },
  { id: 'failed', label: 'Failed', color: 'var(--state-failed)' },
];

export function Tasks() {
  const { tasks, selectedProjectId } = useHivemindStore();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const projectTasks = tasks.filter((t) => t.projectId === selectedProjectId);

  const getTasksByState = (state: TaskState) =>
    projectTasks.filter((t) => t.state === state);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Tasks</h1>
          <p>Manage and track task execution</p>
        </div>
        <div className={styles.actions}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === 'kanban' ? styles.active : ''}`}
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={16} />
            </button>
          </div>
          <Button variant="secondary" icon={<Filter size={16} />}>
            Filter
          </Button>
          <Button variant="primary" icon={<Plus size={16} />}>
            New Task
          </Button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {viewMode === 'kanban' ? (
          <motion.div
            key="kanban"
            className={styles.kanbanBoard}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {columns.map((column, colIndex) => {
              const columnTasks = getTasksByState(column.id as TaskState);
              return (
                <motion.div
                  key={column.id}
                  className={styles.column}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: colIndex * 0.05 }}
                >
                  <div className={styles.columnHeader}>
                    <div
                      className={styles.columnIndicator}
                      style={{ background: column.color }}
                    />
                    <span className={styles.columnTitle}>{column.label}</span>
                    <Badge variant="default" size="sm">
                      {columnTasks.length}
                    </Badge>
                  </div>
                  <div className={styles.columnContent}>
                    {columnTasks.map((task, taskIndex) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: colIndex * 0.05 + taskIndex * 0.03 }}
                        onClick={() => setSelectedTask(task.id)}
                      >
                        <Card
                          variant="elevated"
                          hoverable
                          className={`${styles.taskCard} ${selectedTask === task.id ? styles.selected : ''}`}
                        >
                          <div className={styles.taskHeader}>
                            <StatusIndicator status={task.state} size="sm" />
                            {task.retryCount > 0 && (
                              <div className={styles.retryBadge}>
                                <RotateCcw size={10} />
                                <span>{task.retryCount}</span>
                              </div>
                            )}
                          </div>
                          <h4 className={styles.taskTitle}>{task.title}</h4>
                          {task.description && (
                            <p className={styles.taskDesc}>{task.description}</p>
                          )}
                          <div className={styles.taskMeta}>
                            <span className={styles.taskId}>{task.id}</span>
                            {task.state === 'escalated' && (
                              <AlertTriangle
                                size={14}
                                className={styles.escalatedIcon}
                              />
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                    {columnTasks.length === 0 && (
                      <div className={styles.emptyColumn}>
                        <span>No tasks</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            className={styles.listView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className={styles.listHeader}>
              <span className={styles.listColStatus}>Status</span>
              <span className={styles.listColTitle}>Task</span>
              <span className={styles.listColRetries}>Retries</span>
              <span className={styles.listColUpdated}>Updated</span>
              <span className={styles.listColActions}></span>
            </div>
            {projectTasks.map((task, index) => (
              <motion.div
                key={task.id}
                className={styles.listRow}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setSelectedTask(task.id)}
              >
                <div className={styles.listColStatus}>
                  <StatusIndicator status={task.state} showLabel />
                </div>
                <div className={styles.listColTitle}>
                  <span className={styles.taskTitleList}>{task.title}</span>
                  <span className={styles.taskIdList}>{task.id}</span>
                </div>
                <div className={styles.listColRetries}>
                  <span
                    className={`${styles.retryCount} ${task.retryCount > 0 ? styles.hasRetries : ''}`}
                  >
                    {task.retryCount}/{task.maxRetries}
                  </span>
                </div>
                <div className={styles.listColUpdated}>
                  <Clock size={12} />
                  <span>{new Date(task.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className={styles.listColActions}>
                  <ChevronRight size={16} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Detail Panel */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            className={styles.detailPanel}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {(() => {
              const task = tasks.find((t) => t.id === selectedTask);
              if (!task) return null;
              return (
                <>
                  <div className={styles.detailHeader}>
                    <StatusIndicator status={task.state} showLabel size="lg" />
                    <button
                      className={styles.closeBtn}
                      onClick={() => setSelectedTask(null)}
                    >
                      &times;
                    </button>
                  </div>
                  <div className={styles.detailContent}>
                    <h2 className={styles.detailTitle}>{task.title}</h2>
                    <p className={styles.detailDesc}>{task.description}</p>

                    <div className={styles.detailSection}>
                      <h4>Execution Info</h4>
                      <div className={styles.detailGrid}>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Task ID</span>
                          <span className={styles.detailValue}>{task.id}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Retries</span>
                          <span className={styles.detailValue}>
                            {task.retryCount} / {task.maxRetries}
                          </span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Created</span>
                          <span className={styles.detailValue}>
                            {new Date(task.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Updated</span>
                          <span className={styles.detailValue}>
                            {new Date(task.updatedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.detailActions}>
                      <Button variant="primary" icon={<RotateCcw size={16} />}>
                        Retry Task
                      </Button>
                      <Button variant="danger" icon={<AlertTriangle size={16} />}>
                        Abort
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
