import { useState } from 'react';
import { motion } from 'motion/react';
import {
  GitBranch,
  Plus,
  Play,
  Pause,
  Square,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { useHivemindStore } from '../stores/hivemindStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { StatusIndicator } from '../components/StatusIndicator';
import styles from './TaskFlows.module.css';

// ═══════════════════════════════════════════════════════════════════════════
// TASKFLOWS PAGE
// TaskFlow listing and execution control
// ═══════════════════════════════════════════════════════════════════════════

export function TaskFlows() {
  const { taskFlows, tasks, selectedProjectId } = useHivemindStore();
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);

  const projectFlows = taskFlows.filter((f) => f.projectId === selectedProjectId);

  const getFlowIcon = (state: string) => {
    switch (state) {
      case 'running':
        return Play;
      case 'paused':
        return Pause;
      case 'completed':
        return CheckCircle2;
      case 'aborted':
        return XCircle;
      default:
        return GitBranch;
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>TaskFlows</h1>
          <p>Execute and monitor orchestrated workflows</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />}>
          New TaskFlow
        </Button>
      </header>

      <div className={styles.content}>
        {/* Flow List */}
        <div className={styles.flowList}>
          {projectFlows.map((flow, index) => {
            const FlowIcon = getFlowIcon(flow.state);
            const isSelected = selectedFlow === flow.id;

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
                  onClick={() => setSelectedFlow(flow.id)}
                >
                  <div className={styles.flowCardContent}>
                    <div className={styles.flowHeader}>
                      <div className={styles.flowIcon}>
                        <FlowIcon size={20} />
                      </div>
                      <div className={styles.flowInfo}>
                        <h3 className={styles.flowName}>{flow.name}</h3>
                        <span className={styles.flowId}>{flow.id}</span>
                      </div>
                      <StatusIndicator status={flow.state} showLabel />
                    </div>

                    <div className={styles.progressSection}>
                      <div className={styles.progressInfo}>
                        <span className={styles.progressLabel}>Progress</span>
                        <span className={styles.progressValue}>
                          {flow.progress.completed}/{flow.progress.total}
                        </span>
                      </div>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressSuccess}
                          style={{
                            width: `${(flow.progress.completed / flow.progress.total) * 100}%`,
                          }}
                        />
                        <div
                          className={styles.progressRunning}
                          style={{
                            width: `${(flow.progress.running / flow.progress.total) * 100}%`,
                          }}
                        />
                        <div
                          className={styles.progressFailed}
                          style={{
                            width: `${(flow.progress.failed / flow.progress.total) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className={styles.flowMeta}>
                      <div className={styles.metaItem}>
                        <Clock size={12} />
                        <span>
                          Started {flow.startedAt ? new Date(flow.startedAt).toLocaleString() : 'Not started'}
                        </span>
                      </div>
                    </div>

                    <div className={styles.flowActions}>
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
                      {flow.state === 'created' && (
                        <Button size="sm" variant="primary" icon={<Play size={14} />}>
                          Start
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
            <Card variant="outlined" className={styles.emptyState}>
              <GitBranch size={48} strokeWidth={1} />
              <h3>No TaskFlows</h3>
              <p>Create a TaskFlow to orchestrate your tasks</p>
              <Button variant="primary" icon={<Plus size={16} />}>
                Create TaskFlow
              </Button>
            </Card>
          )}
        </div>

        {/* Flow Detail / DAG View */}
        {selectedFlow && (
          <motion.div
            className={styles.flowDetail}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {(() => {
              const flow = taskFlows.find((f) => f.id === selectedFlow);
              if (!flow) return null;

              return (
                <>
                  <div className={styles.detailHeader}>
                    <h2>Task Graph</h2>
                    <span className={styles.detailFlowName}>{flow.name}</span>
                  </div>

                  <div className={styles.dagContainer}>
                    <div className={styles.dagView}>
                      {flow.tasks.map((flowTask, index) => {
                        const task = tasks.find((t) => t.id === flowTask.taskId);
                        if (!task) return null;

                        const hasFailedDeps = flowTask.dependencies.some((depId) => {
                          const depTask = flow.tasks.find((t) => t.taskId === depId);
                          return depTask?.state === 'failed';
                        });

                        return (
                          <motion.div
                            key={flowTask.taskId}
                            className={styles.dagNode}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                          >
                            <div
                              className={`${styles.nodeCard} ${styles[flowTask.state]}`}
                            >
                              <div className={styles.nodeHeader}>
                                <StatusIndicator status={flowTask.state} size="sm" />
                                {flowTask.attemptCount > 0 && (
                                  <Badge variant="default" size="sm">
                                    Attempt {flowTask.attemptCount}
                                  </Badge>
                                )}
                              </div>
                              <span className={styles.nodeTitle}>{task.title}</span>
                              <span className={styles.nodeId}>{task.id}</span>
                              {flowTask.dependencies.length > 0 && (
                                <div className={styles.nodeDeps}>
                                  <span className={styles.depsLabel}>Depends on:</span>
                                  {flowTask.dependencies.map((depId) => (
                                    <Badge key={depId} variant="default" size="sm">
                                      {depId}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {hasFailedDeps && (
                                <div className={styles.blockedWarning}>
                                  <AlertTriangle size={12} />
                                  <span>Blocked by failed dependency</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  <div className={styles.detailFooter}>
                    <div className={styles.legend}>
                      <div className={styles.legendItem}>
                        <span
                          className={styles.legendDot}
                          style={{ background: 'var(--state-pending)' }}
                        />
                        <span>Pending</span>
                      </div>
                      <div className={styles.legendItem}>
                        <span
                          className={styles.legendDot}
                          style={{ background: 'var(--state-running)' }}
                        />
                        <span>Running</span>
                      </div>
                      <div className={styles.legendItem}>
                        <span
                          className={styles.legendDot}
                          style={{ background: 'var(--state-verifying)' }}
                        />
                        <span>Verifying</span>
                      </div>
                      <div className={styles.legendItem}>
                        <span
                          className={styles.legendDot}
                          style={{ background: 'var(--state-success)' }}
                        />
                        <span>Success</span>
                      </div>
                      <div className={styles.legendItem}>
                        <span
                          className={styles.legendDot}
                          style={{ background: 'var(--state-failed)' }}
                        />
                        <span>Failed</span>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}
      </div>
    </div>
  );
}
