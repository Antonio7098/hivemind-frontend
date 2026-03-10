import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  GitBranch,
  RotateCcw,
  Square,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { useHivemindStore } from '../stores/hivemindStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { StatusIndicator } from '../components/StatusIndicator';
import { PageHeader } from '../components/composites/PageHeader';
import { ProgressBar } from '../components/composites/ProgressBar';
import { EmptyState } from '../components/composites/EmptyState';
import { Expandable } from '../components/composites/Expandable';
import { DetailModal, DetailToggle } from '../components/composites/DetailModal';
import { TabPanel, TabList, Tab, TabContent } from '../components/composites/TabPanel';
import { EventStream } from '../components/composites/EventStream';
import { IconBox } from '../components/primitives/IconBox';
import { Stack } from '../components/primitives/Stack';
import { Text } from '../components/primitives/Text';
import type { TaskFlow, TaskExecution } from '../types';
import styles from './Active.module.css';

const EXEC_STATE_COLORS: Record<string, string> = {
  pending: 'var(--state-pending)',
  ready: 'var(--state-running)',
  running: 'var(--state-running)',
  verifying: 'var(--state-verifying)',
  success: 'var(--state-success)',
  retry: 'var(--state-retry)',
  failed: 'var(--state-failed)',
  escalated: 'var(--state-escalated)',
};

function getExecIcon(state: string) {
  switch (state) {
    case 'running': return <Play size={14} />;
    case 'verifying': return <Eye size={14} />;
    case 'success': return <CheckCircle size={14} />;
    case 'retry': return <RotateCcw size={14} />;
    case 'failed': return <AlertTriangle size={14} />;
    case 'escalated': return <AlertTriangle size={14} />;
    case 'ready': return <Zap size={14} />;
    default: return <Clock size={14} />;
  }
}

function categorizeFlows(flows: TaskFlow[]) {
  const working: TaskFlow[] = [];
  const needsAction: TaskFlow[] = [];

  for (const flow of flows) {
    if (flow.state !== 'running' && flow.state !== 'paused') continue;
    
    const execs = Object.values(flow.task_executions);
    const hasIssues = execs.some(e => 
      e.state === 'failed' || 
      e.state === 'escalated' || 
      e.state === 'verifying'
    );
    
    if (hasIssues || flow.state === 'paused') {
      needsAction.push(flow);
    } else {
      working.push(flow);
    }
  }

  return { working, needsAction };
}

export function Active() {
  const navigate = useNavigate();
  const {
    flows,
    graphs,
    tasks,
    events,
    selectedProjectId,
    tickFlow,
    pauseFlow,
    resumeFlow,
    abortFlow,
    retryTask,
    verifyOverride,
    addNotification,
    refreshFromApi,
  } = useHivemindStore();

  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<'modal' | 'panel'>('panel');
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const projectFlows = useMemo(
    () => flows.filter(f => f.project_id === selectedProjectId),
    [flows, selectedProjectId]
  );

  const { working, needsAction } = useMemo(
    () => categorizeFlows(projectFlows),
    [projectFlows]
  );

  const graphMap = useMemo(
    () => Object.fromEntries(graphs.map(g => [g.id, g])),
    [graphs]
  );

  const taskMap = useMemo(
    () => Object.fromEntries(tasks.map(t => [t.id, t])),
    [tasks]
  );

  const selectedFlow = selectedFlowId 
    ? projectFlows.find(f => f.id === selectedFlowId) 
    : null;

  const selectedGraph = selectedFlow 
    ? graphMap[selectedFlow.graph_id] 
    : null;

  const flowEvents = useMemo(() => {
    if (!selectedFlowId) return [];
    return events.filter(e => e.correlation.flow_id === selectedFlowId).slice(0, 50);
  }, [events, selectedFlowId]);

  const runAction = async (label: string, action: () => Promise<void>) => {
    setBusyAction(label);
    try {
      await action();
      addNotification({ type: 'success', title: label, message: 'Operation completed' });
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

  const renderFlowCard = (flow: TaskFlow, index: number) => {
    const graph = graphMap[flow.graph_id];
    const execs = Object.values(flow.task_executions);
    const successCount = execs.filter(e => e.state === 'success').length;
    const runningCount = execs.filter(e => e.state === 'running').length;
    const issueCount = execs.filter(e => 
      e.state === 'failed' || e.state === 'escalated' || e.state === 'verifying'
    ).length;

    return (
      <motion.div
        key={flow.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card
          variant={selectedFlowId === flow.id ? 'elevated' : 'default'}
          hoverable
          className={styles.flowCard}
          onClick={() => setSelectedFlowId(flow.id)}
        >
          <div className={styles.flowHeader}>
            <IconBox size="md" color="var(--accent-400)">
              <GitBranch size={18} />
            </IconBox>
            <div className={styles.flowInfo}>
              <h3 className={styles.flowName}>{graph?.name ?? 'Unknown Graph'}</h3>
              <span className={styles.flowId}>{flow.id.slice(0, 8)}</span>
            </div>
            <StatusIndicator status={flow.state} showLabel />
          </div>

          <ProgressBar
            height={6}
            total={execs.length}
            segments={[
              { value: successCount, color: EXEC_STATE_COLORS.success },
              { value: runningCount, color: EXEC_STATE_COLORS.running },
              { value: issueCount, color: EXEC_STATE_COLORS.failed },
              { value: execs.length - successCount - runningCount - issueCount, color: EXEC_STATE_COLORS.pending },
            ]}
          />

          <div className={styles.flowMeta}>
            <span>{execs.length} tasks</span>
            <span>•</span>
            <span>{successCount} complete</span>
            {runningCount > 0 && (
              <>
                <span>•</span>
                <span className={styles.running}>{runningCount} running</span>
              </>
            )}
            {issueCount > 0 && (
              <>
                <span>•</span>
                <span className={styles.issues}>{issueCount} need attention</span>
              </>
            )}
          </div>

          <div className={styles.flowActions}>
            {flow.state === 'running' && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Play size={12} />}
                  loading={busyAction === `tick-${flow.id}`}
                  onClick={() => {
                    runAction(`tick-${flow.id}`, () => tickFlow({ flow_id: flow.id }));
                  }}
                >
                  Tick
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Pause size={12} />}
                  loading={busyAction === `pause-${flow.id}`}
                  onClick={() => {
                    runAction(`pause-${flow.id}`, () => pauseFlow({ flow_id: flow.id }));
                  }}
                >
                  Pause
                </Button>
              </>
            )}
            {flow.state === 'paused' && (
              <Button
                size="sm"
                variant="primary"
                icon={<Play size={12} />}
                loading={busyAction === `resume-${flow.id}`}
                onClick={() => {
                  runAction(`resume-${flow.id}`, () => resumeFlow({ flow_id: flow.id }));
                }}
              >
                Resume
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              icon={<ChevronRight size={14} />}
              onClick={() => setSelectedFlowId(flow.id)}
            />
          </div>
        </Card>
      </motion.div>
    );
  };

  const renderTaskExecution = (exec: TaskExecution, graphTask: { title: string; description?: string } | undefined) => {
    const task = taskMap[exec.task_id];
    const title = graphTask?.title ?? task?.title ?? exec.task_id;
    const needsAction = exec.state === 'failed' || exec.state === 'escalated' || exec.state === 'verifying';

    return (
      <Expandable
        key={exec.task_id}
        title={title}
        subtitle={`Attempt ${exec.attempt_count} • ${exec.state}`}
        icon={getExecIcon(exec.state)}
        badge={
          <Badge
            variant={
              exec.state === 'success' ? 'success' :
              exec.state === 'running' ? 'info' :
              exec.state === 'verifying' ? 'warning' :
              exec.state === 'failed' || exec.state === 'escalated' ? 'error' :
              'default'
            }
            size="sm"
          >
            {exec.state}
          </Badge>
        }
        variant="card"
      >
        <Stack direction="column" gap={3}>
          {graphTask?.description && (
            <Text variant="body" color="secondary">{graphTask.description}</Text>
          )}
          
          {exec.blocked_reason && (
            <div className={styles.blockedReason}>
              <AlertTriangle size={14} />
              <span>{exec.blocked_reason}</span>
            </div>
          )}

          {needsAction && (
            <div className={styles.taskActions}>
              {exec.state === 'verifying' && (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => runAction(`approve-${exec.task_id}`, () => 
                      verifyOverride({ task_id: exec.task_id, decision: 'pass', reason: 'Manual approval' })
                    )}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => runAction(`reject-${exec.task_id}`, () => 
                      verifyOverride({ task_id: exec.task_id, decision: 'fail', reason: 'Manual rejection' })
                    )}
                  >
                    Reject
                  </Button>
                </>
              )}
              {(exec.state === 'failed' || exec.state === 'escalated') && (
                <Button
                  size="sm"
                  variant="primary"
                  icon={<RotateCcw size={12} />}
                  onClick={() => runAction(`retry-${exec.task_id}`, () => 
                    retryTask({ task_id: exec.task_id })
                  )}
                >
                  Retry
                </Button>
              )}
            </div>
          )}
        </Stack>
      </Expandable>
    );
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Active"
        subtitle="Monitor and manage running workflows"
        actions={
          <Stack direction="row" gap={2}>
            <DetailToggle mode={detailMode} onToggle={() => setDetailMode(m => m === 'modal' ? 'panel' : 'modal')} />
            <Button
              variant="secondary"
              loading={busyAction === 'refresh'}
              onClick={() => runAction('refresh', () => refreshFromApi())}
            >
              Refresh
            </Button>
          </Stack>
        }
      />

      <div className={styles.content}>
        <div className={styles.flowLists}>
          {/* Needs Action Section */}
          {needsAction.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <AlertTriangle size={16} />
                Needs Action
                <Badge variant="warning" size="sm">{needsAction.length}</Badge>
              </h2>
              <div className={styles.flowGrid}>
                {needsAction.map((flow, i) => renderFlowCard(flow, i))}
              </div>
            </section>
          )}

          {/* Working Section */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Play size={16} />
              Working
              {working.length > 0 && <Badge variant="info" size="sm">{working.length}</Badge>}
            </h2>
            {working.length === 0 && needsAction.length === 0 ? (
              <Card variant="outlined">
                <EmptyState
                  icon={<GitBranch size={48} strokeWidth={1} />}
                  title="No Active Flows"
                  description="Start a flow from a task graph to begin orchestrated execution"
                  action={
                    <Button variant="primary" onClick={() => navigate('/graphs')}>
                      View Graphs
                    </Button>
                  }
                />
              </Card>
            ) : working.length === 0 ? (
              <Text variant="body" color="muted" className={styles.emptyText}>
                All active flows need attention
              </Text>
            ) : (
              <div className={styles.flowGrid}>
                {working.map((flow, i) => renderFlowCard(flow, i))}
              </div>
            )}
          </section>
        </div>

        {/* Detail Panel/Modal */}
        <AnimatePresence>
          {selectedFlow && selectedGraph && (
            <DetailModal
              isOpen={!!selectedFlow}
              onClose={() => setSelectedFlowId(null)}
              mode={detailMode}
              width="lg"
              title={selectedGraph.name}
              subtitle={`Flow ${selectedFlow.id.slice(0, 8)} • ${selectedFlow.state}`}
            >
              <TabPanel defaultTab="tasks" variant="underline">
                <TabList>
                  <Tab id="tasks" icon={<Zap size={14} />}>
                    Tasks
                    <Badge variant="default" size="sm">
                      {Object.keys(selectedFlow.task_executions).length}
                    </Badge>
                  </Tab>
                  <Tab id="events" icon={<GitBranch size={14} />}>
                    Events
                    <Badge variant="default" size="sm">{flowEvents.length}</Badge>
                  </Tab>
                </TabList>

                <TabContent id="tasks">
                  <Stack direction="column" gap={2}>
                    {Object.values(selectedFlow.task_executions).map(exec => 
                      renderTaskExecution(exec, selectedGraph.tasks[exec.task_id] ? { title: selectedGraph.tasks[exec.task_id].title, description: selectedGraph.tasks[exec.task_id].description ?? undefined } : undefined)
                    )}
                  </Stack>
                </TabContent>

                <TabContent id="events">
                  <EventStream
                    events={flowEvents}
                    maxHeight="500px"
                    compact
                  />
                </TabContent>
              </TabPanel>

              <div className={styles.detailActions}>
                {selectedFlow.state === 'running' && (
                  <Button
                    variant="danger"
                    icon={<Square size={14} />}
                    loading={busyAction === `abort-${selectedFlow.id}`}
                    onClick={() => runAction(`abort-${selectedFlow.id}`, () => 
                      abortFlow({ flow_id: selectedFlow.id })
                    )}
                  >
                    Abort Flow
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/flows/${selectedFlow.id}`)}
                >
                  Full Details
                </Button>
              </div>
            </DetailModal>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
