import { motion } from 'motion/react';
import {
  Activity,
  GitBranch,
  Play,
  Zap,
  Shield,
  Eye,
  GitMerge,
  ListChecks,
  Server,
  Layers,
} from 'lucide-react';
import { useHivemindStore } from '../stores/hivemindStore';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { StatusIndicator } from '../components/StatusIndicator';
import { Button } from '../components/Button';
import { Grid } from '../components/primitives/Grid';
import { Stack } from '../components/primitives/Stack';
import { Text } from '../components/primitives/Text';
import { Dot } from '../components/primitives/Dot';
import { PageHeader } from '../components/composites/PageHeader';
import { MetricCard } from '../components/composites/MetricCard';
import { ProgressBar } from '../components/composites/ProgressBar';
import { EmptyState } from '../components/composites/EmptyState';
import { ListItem } from '../components/composites/ListItem';
import { LiveIndicator } from '../components/composites/LiveIndicator';
import { CardHeader } from '../components/composites/CardHeader';
import { IconBox } from '../components/primitives/IconBox';
import styles from './Dashboard.module.css';

const staggerChildren = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

function eventCategoryIcon(category: string) {
  switch (category) {
    case 'task': return <Zap size={14} />;
    case 'flow': return <GitBranch size={14} />;
    case 'execution': return <Play size={14} />;
    case 'verification': return <Shield size={14} />;
    case 'merge': return <GitMerge size={14} />;
    case 'graph': return <Layers size={14} />;
    case 'project': return <ListChecks size={14} />;
    case 'runtime': return <Server size={14} />;
    case 'filesystem': return <Eye size={14} />;
    default: return <Activity size={14} />;
  }
}

function eventCategoryBadgeVariant(category: string): 'default' | 'success' | 'warning' | 'error' | 'info' | 'amber' {
  switch (category) {
    case 'execution': return 'info';
    case 'flow': return 'amber';
    case 'verification': return 'warning';
    case 'merge': return 'success';
    case 'task': return 'default';
    case 'graph': return 'default';
    case 'project': return 'default';
    case 'runtime': return 'info';
    case 'filesystem': return 'default';
    default: return 'default';
  }
}

export function Dashboard() {
  const {
    projects,
    tasks,
    graphs,
    flows,
    mergeStates,
    events,
    runtimes,
    selectedProjectId,
    getGraphForFlow,
  } = useHivemindStore();

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Filter by selected project
  const projectTasks = selectedProjectId
    ? tasks.filter((t) => t.project_id === selectedProjectId)
    : tasks;
  const projectFlows = selectedProjectId
    ? flows.filter((f) => f.project_id === selectedProjectId)
    : flows;
  const projectGraphs = selectedProjectId
    ? graphs.filter((g) => g.project_id === selectedProjectId)
    : graphs;
  const projectMerges = selectedProjectId
    ? mergeStates.filter((m) => {
        const flow = flows.find((f) => f.id === m.flow_id);
        return flow?.project_id === selectedProjectId;
      })
    : mergeStates;

  // Task counts by state (Open/Closed)
  const openTasks = projectTasks.filter((t) => t.state === 'open').length;

  // Active flows (running)
  const activeFlows = projectFlows.filter((f) => f.state === 'running');

  // Pending merges (not completed)
  const pendingMerges = projectMerges.filter((m) => m.status !== 'completed');

  // Aggregate TaskExecution states across all running flows
  const execStateTotals: Record<string, number> = {};
  for (const flow of activeFlows) {
    for (const exec of Object.values(flow.task_executions)) {
      execStateTotals[exec.state] = (execStateTotals[exec.state] || 0) + 1;
    }
  }
  const totalExecs = Object.values(execStateTotals).reduce((sum, n) => sum + n, 0);

  // Recent events
  const recentEvents = events.slice(0, 8);

  return (
    <div className={styles.dashboard}>
      <PageHeader
        titleAccent="Control"
        title="Plane"
        subtitle="Agentic orchestration at a glance"
        trailing={
          selectedProject ? (
            <div className={styles.projectBadge}>
              <span className={styles.projectLabel}>Active Project</span>
              <span className={styles.projectName}>{selectedProject.name}</span>
            </div>
          ) : undefined
        }
      />

      {/* Metrics Grid */}
      <motion.div
        variants={staggerChildren}
        initial="hidden"
        animate="show"
      >
        <Grid columns={4} gap={4} className={styles.metricsGrid}>
          <motion.div variants={fadeInUp}>
            <MetricCard
              icon={<Play size={24} />}
              value={activeFlows.length}
              label="Active Flows"
              color="var(--state-running)"
            />
          </motion.div>
          <motion.div variants={fadeInUp}>
            <MetricCard
              icon={<ListChecks size={24} />}
              value={openTasks}
              label="Open Tasks"
              color="var(--accent-400)"
            />
          </motion.div>
          <motion.div variants={fadeInUp}>
            <MetricCard
              icon={<Layers size={24} />}
              value={projectGraphs.length}
              label="Graphs"
              color="var(--state-verifying)"
            />
          </motion.div>
          <motion.div variants={fadeInUp}>
            <MetricCard
              icon={<GitMerge size={24} />}
              value={pendingMerges.length}
              label="Pending Merges"
              color="var(--state-pending)"
            />
          </motion.div>
        </Grid>
      </motion.div>

      {/* Main Content: Active Flows + Event Stream */}
      <Grid columns={2} gap={4} className={styles.contentGrid}>
        {/* Active Flows */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card
            variant="default"
            padding="none"
            header={
              <CardHeader
                icon={<GitBranch size={18} />}
                title="Active Flows"
                linkTo="/flows"
                linkLabel="All Flows"
              />
            }
          >
            <div className={styles.flowList}>
              {projectFlows.length === 0 ? (
                <EmptyState
                  icon={<GitBranch size={32} strokeWidth={1} />}
                  title="No flows yet"
                  description="Create a graph and start a flow to begin execution"
                  action={<Button size="sm" variant="primary">Create Flow</Button>}
                />
              ) : (
                projectFlows.map((flow, index) => {
                  const graph = getGraphForFlow(flow);
                  const execs = Object.values(flow.task_executions);
                  const successCount = execs.filter((e) => e.state === 'success').length;
                  const totalCount = execs.length;

                  return (
                    <ListItem
                      key={flow.id}
                      icon={<StatusIndicator status={flow.state} />}
                      title={graph?.name ?? flow.id}
                      subtitle={`${successCount}/${totalCount} executions complete`}
                      delay={0.4 + index * 0.1}
                      trailing={
                        <div className={styles.flowProgress}>
                          <ProgressBar
                            segments={[{ value: successCount, color: 'var(--accent-500)' }]}
                            total={totalCount}
                            height={4}
                            className={styles.progressBarInline}
                          />
                          <Badge
                            variant={
                              flow.state === 'running' ? 'info'
                              : flow.state === 'completed' ? 'success'
                              : flow.state === 'paused' ? 'warning'
                              : flow.state === 'aborted' ? 'error'
                              : 'default'
                            }
                            size="sm"
                          >
                            {flow.state}
                          </Badge>
                        </div>
                      }
                    />
                  );
                })
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
              <CardHeader
                icon={<Activity size={18} />}
                title="Event Stream"
                trailing={<LiveIndicator live />}
                linkTo="/events"
                linkLabel="All Events"
              />
            }
          >
            <div className={styles.eventList}>
              {recentEvents.length === 0 ? (
                <EmptyState
                  icon={<Activity size={32} strokeWidth={1} />}
                  title="No events yet"
                  description="Events will appear here as the system runs"
                />
              ) : (
                recentEvents.map((event, index) => (
                  <ListItem
                    key={event.id}
                    delay={0.5 + index * 0.05}
                    icon={
                      <IconBox size="sm" color="var(--text-tertiary)">
                        {eventCategoryIcon(event.category)}
                      </IconBox>
                    }
                    title={
                      <Stack direction="row" gap={2}>
                        <span className={styles.eventType}>{event.type}</span>
                        <Badge variant={eventCategoryBadgeVariant(event.category)} size="sm">
                          {event.category}
                        </Badge>
                      </Stack>
                    }
                    subtitle={
                      event.correlation.flow_id || event.correlation.task_id
                        ? [
                            event.correlation.flow_id && `flow:${event.correlation.flow_id}`,
                            event.correlation.task_id && `task:${event.correlation.task_id}`,
                          ].filter(Boolean).join(' / ')
                        : undefined
                    }
                    trailing={
                      <span className={styles.eventTime}>
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    }
                  />
                ))
              )}
            </div>
          </Card>
        </motion.div>

        {/* Task Execution Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Card
            variant="default"
            header={
              <CardHeader
                icon={<Zap size={18} />}
                title="Task Execution Distribution"
                trailing={
                  <Text variant="caption" color="muted">
                    Active flows only
                  </Text>
                }
              />
            }
          >
            {totalExecs === 0 ? (
              <EmptyState
                icon={<Zap size={32} strokeWidth={1} />}
                title="No active executions"
                description="Start a flow to see execution distribution"
              />
            ) : (
              <Stack direction="column" gap={4}>
                <ProgressBar
                  height={12}
                  total={totalExecs}
                  showLegend
                  segments={[
                    { value: execStateTotals['success'] || 0, color: 'var(--state-success)', label: 'Success' },
                    { value: execStateTotals['running'] || 0, color: 'var(--state-running)', label: 'Running' },
                    { value: execStateTotals['verifying'] || 0, color: 'var(--state-verifying)', label: 'Verifying' },
                    { value: execStateTotals['pending'] || 0, color: 'var(--state-pending)', label: 'Pending' },
                    { value: execStateTotals['ready'] || 0, color: 'var(--accent-400)', label: 'Ready' },
                    { value: execStateTotals['retry'] || 0, color: 'var(--state-warning)', label: 'Retry' },
                    { value: execStateTotals['failed'] || 0, color: 'var(--state-failed)', label: 'Failed' },
                    { value: execStateTotals['escalated'] || 0, color: 'var(--state-error)', label: 'Escalated' },
                  ]}
                />
                <Stack direction="row" gap={4}>
                  <Text variant="caption" color="muted">
                    {openTasks} open / {projectTasks.length - openTasks} closed tasks total
                  </Text>
                  <Dot color="var(--text-muted)" />
                  <Text variant="caption" color="muted">
                    {totalExecs} executions across {activeFlows.length} running flow{activeFlows.length !== 1 ? 's' : ''}
                  </Text>
                </Stack>
              </Stack>
            )}
          </Card>
        </motion.div>

        {/* Runtime Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Card
            variant="default"
            header={
              <CardHeader
                icon={<Server size={18} />}
                title="Runtime Status"
              />
            }
          >
            <div className={styles.runtimeList}>
              {runtimes.length === 0 ? (
                <EmptyState
                  icon={<Server size={32} strokeWidth={1} />}
                  title="No runtimes configured"
                  description="Configure a runtime adapter for your project"
                />
              ) : (
                runtimes.map((runtime, index) => (
                  <ListItem
                    key={runtime.id}
                    delay={0.7 + index * 0.1}
                    icon={<StatusIndicator status={runtime.status} size="md" />}
                    title={runtime.name}
                    subtitle={runtime.version ? `v${runtime.version} / ${runtime.type}` : runtime.type}
                    trailing={
                      <Badge
                        variant={
                          runtime.status === 'healthy' ? 'success'
                          : runtime.status === 'degraded' ? 'warning'
                          : 'error'
                        }
                        size="sm"
                      >
                        {runtime.status}
                      </Badge>
                    }
                  />
                ))
              )}
            </div>
          </Card>
        </motion.div>
      </Grid>
    </div>
  );
}
