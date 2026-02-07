import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  Activity,
  GitBranch,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  ArrowRight,
  Zap,
  Shield,
  Eye,
} from 'lucide-react';
import { useHivemindStore } from '../stores/hivemindStore';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { StatusIndicator } from '../components/StatusIndicator';
import { Button } from '../components/Button';
import styles from './Dashboard.module.css';

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// System overview with key metrics and recent activity
// ═══════════════════════════════════════════════════════════════════════════

const staggerChildren = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

export function Dashboard() {
  const { projects, tasks, taskFlows, events, runtimes, selectedProjectId } =
    useHivemindStore();

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const projectTasks = tasks.filter((t) => t.projectId === selectedProjectId);
  const projectFlows = taskFlows.filter((f) => f.projectId === selectedProjectId);

  const taskStats = {
    total: projectTasks.length,
    running: projectTasks.filter((t) => t.state === 'running').length,
    verifying: projectTasks.filter((t) => t.state === 'verifying').length,
    success: projectTasks.filter((t) => t.state === 'success').length,
    failed: projectTasks.filter((t) => t.state === 'failed' || t.state === 'escalated').length,
    pending: projectTasks.filter((t) => t.state === 'pending').length,
  };

  const activeFlows = projectFlows.filter((f) => f.state === 'running');
  const recentEvents = events.slice(0, 8);

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.headerContent}>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>
              <span className={styles.titleAccent}>Control</span> Plane
            </h1>
            <p className={styles.subtitle}>
              Agentic orchestration at a glance
            </p>
          </div>
          {selectedProject && (
            <div className={styles.projectBadge}>
              <span className={styles.projectLabel}>Active Project</span>
              <span className={styles.projectName}>{selectedProject.name}</span>
            </div>
          )}
        </div>
      </motion.header>

      {/* Metrics Grid */}
      <motion.div
        className={styles.metricsGrid}
        variants={staggerChildren}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeInUp}>
          <Card variant="elevated" className={styles.metricCard}>
            <div className={styles.metricIcon} style={{ color: 'var(--state-running)' }}>
              <Play size={24} />
            </div>
            <div className={styles.metricContent}>
              <span className={styles.metricValue}>{activeFlows.length}</span>
              <span className={styles.metricLabel}>Active Flows</span>
            </div>
            <div className={styles.metricGlow} style={{ background: 'var(--state-running)' }} />
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card variant="elevated" className={styles.metricCard}>
            <div className={styles.metricIcon} style={{ color: 'var(--state-success)' }}>
              <CheckCircle2 size={24} />
            </div>
            <div className={styles.metricContent}>
              <span className={styles.metricValue}>{taskStats.success}</span>
              <span className={styles.metricLabel}>Completed</span>
            </div>
            <div className={styles.metricGlow} style={{ background: 'var(--state-success)' }} />
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card variant="elevated" className={styles.metricCard}>
            <div className={styles.metricIcon} style={{ color: 'var(--state-verifying)' }}>
              <Shield size={24} />
            </div>
            <div className={styles.metricContent}>
              <span className={styles.metricValue}>{taskStats.verifying}</span>
              <span className={styles.metricLabel}>Verifying</span>
            </div>
            <div className={styles.metricGlow} style={{ background: 'var(--state-verifying)' }} />
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card variant="elevated" className={styles.metricCard}>
            <div className={styles.metricIcon} style={{ color: 'var(--state-failed)' }}>
              <AlertTriangle size={24} />
            </div>
            <div className={styles.metricContent}>
              <span className={styles.metricValue}>{taskStats.failed}</span>
              <span className={styles.metricLabel}>Needs Attention</span>
            </div>
            <div className={styles.metricGlow} style={{ background: 'var(--state-failed)' }} />
          </Card>
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <div className={styles.contentGrid}>
        {/* Active TaskFlows */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card
            variant="default"
            padding="none"
            header={
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <GitBranch size={18} />
                  <span>Active TaskFlows</span>
                </div>
                <Link to="/flows" className={styles.cardLink}>
                  View all <ArrowRight size={14} />
                </Link>
              </div>
            }
          >
            <div className={styles.flowList}>
              {projectFlows.length === 0 ? (
                <div className={styles.emptyState}>
                  <GitBranch size={32} strokeWidth={1} />
                  <p>No TaskFlows yet</p>
                  <Button size="sm" variant="primary">
                    Create TaskFlow
                  </Button>
                </div>
              ) : (
                projectFlows.map((flow, index) => (
                  <motion.div
                    key={flow.id}
                    className={styles.flowItem}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    <div className={styles.flowInfo}>
                      <StatusIndicator status={flow.state} />
                      <div className={styles.flowDetails}>
                        <span className={styles.flowName}>{flow.name}</span>
                        <span className={styles.flowMeta}>
                          {flow.progress.completed}/{flow.progress.total} tasks
                        </span>
                      </div>
                    </div>
                    <div className={styles.flowProgress}>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{
                            width: `${(flow.progress.completed / flow.progress.total) * 100}%`,
                          }}
                        />
                      </div>
                      <Badge
                        variant={
                          flow.state === 'running'
                            ? 'info'
                            : flow.state === 'completed'
                            ? 'success'
                            : flow.state === 'paused'
                            ? 'warning'
                            : 'error'
                        }
                        size="sm"
                      >
                        {flow.state}
                      </Badge>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </Card>
        </motion.div>

        {/* Event Stream */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card
            variant="default"
            padding="none"
            header={
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <Activity size={18} />
                  <span>Event Stream</span>
                  <span className={styles.liveIndicator}>
                    <span className={styles.liveDot} />
                    Live
                  </span>
                </div>
                <Link to="/events" className={styles.cardLink}>
                  View all <ArrowRight size={14} />
                </Link>
              </div>
            }
          >
            <div className={styles.eventList}>
              {recentEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  className={styles.eventItem}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                >
                  <div className={styles.eventIcon}>
                    {event.category === 'task' && <Zap size={14} />}
                    {event.category === 'taskflow' && <GitBranch size={14} />}
                    {event.category === 'verification' && <Shield size={14} />}
                    {event.category === 'scope' && <AlertTriangle size={14} />}
                    {event.category === 'attempt' && <Play size={14} />}
                    {event.category === 'runtime' && <Activity size={14} />}
                    {event.category === 'filesystem' && <Eye size={14} />}
                  </div>
                  <div className={styles.eventContent}>
                    <span className={styles.eventType}>{event.type}</span>
                    <span className={styles.eventTime}>
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Runtime Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Card
            variant="default"
            header={
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <Activity size={18} />
                  <span>Runtime Status</span>
                </div>
              </div>
            }
          >
            <div className={styles.runtimeList}>
              {runtimes.map((runtime, index) => (
                <motion.div
                  key={runtime.id}
                  className={styles.runtimeItem}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <div className={styles.runtimeInfo}>
                    <StatusIndicator status={runtime.status} size="md" />
                    <div className={styles.runtimeDetails}>
                      <span className={styles.runtimeName}>{runtime.name}</span>
                      <span className={styles.runtimeVersion}>v{runtime.version}</span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      runtime.status === 'healthy'
                        ? 'success'
                        : runtime.status === 'degraded'
                        ? 'warning'
                        : 'error'
                    }
                    size="sm"
                  >
                    {runtime.status}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Task Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Card
            variant="default"
            header={
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <Clock size={18} />
                  <span>Task Distribution</span>
                </div>
              </div>
            }
          >
            <div className={styles.taskDistribution}>
              <div className={styles.distributionBar}>
                {taskStats.success > 0 && (
                  <div
                    className={styles.distributionSegment}
                    style={{
                      width: `${(taskStats.success / taskStats.total) * 100}%`,
                      background: 'var(--state-success)',
                    }}
                    title={`Success: ${taskStats.success}`}
                  />
                )}
                {taskStats.running > 0 && (
                  <div
                    className={styles.distributionSegment}
                    style={{
                      width: `${(taskStats.running / taskStats.total) * 100}%`,
                      background: 'var(--state-running)',
                    }}
                    title={`Running: ${taskStats.running}`}
                  />
                )}
                {taskStats.verifying > 0 && (
                  <div
                    className={styles.distributionSegment}
                    style={{
                      width: `${(taskStats.verifying / taskStats.total) * 100}%`,
                      background: 'var(--state-verifying)',
                    }}
                    title={`Verifying: ${taskStats.verifying}`}
                  />
                )}
                {taskStats.pending > 0 && (
                  <div
                    className={styles.distributionSegment}
                    style={{
                      width: `${(taskStats.pending / taskStats.total) * 100}%`,
                      background: 'var(--state-pending)',
                    }}
                    title={`Pending: ${taskStats.pending}`}
                  />
                )}
                {taskStats.failed > 0 && (
                  <div
                    className={styles.distributionSegment}
                    style={{
                      width: `${(taskStats.failed / taskStats.total) * 100}%`,
                      background: 'var(--state-failed)',
                    }}
                    title={`Failed: ${taskStats.failed}`}
                  />
                )}
              </div>
              <div className={styles.distributionLegend}>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: 'var(--state-success)' }} />
                  <span>Success ({taskStats.success})</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: 'var(--state-running)' }} />
                  <span>Running ({taskStats.running})</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: 'var(--state-verifying)' }} />
                  <span>Verifying ({taskStats.verifying})</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: 'var(--state-pending)' }} />
                  <span>Pending ({taskStats.pending})</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: 'var(--state-failed)' }} />
                  <span>Failed ({taskStats.failed})</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
