import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Play,
  Clock,
  Zap,
  GitBranch,
  Plus,
  ChevronRight,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { useHivemindStore } from '../stores/hivemindStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/composites/PageHeader';
import { EmptyState } from '../components/composites/EmptyState';
import { Expandable } from '../components/composites/Expandable';
import { DetailModal, DetailToggle } from '../components/composites/DetailModal';
import { TabPanel, TabList, Tab, TabContent } from '../components/composites/TabPanel';
import { DataList, DataListItem } from '../components/composites/DataList';
import { IconBox } from '../components/primitives/IconBox';
import { Stack } from '../components/primitives/Stack';
import { Text } from '../components/primitives/Text';
import type { TaskGraph, TaskFlow } from '../types';
import styles from './Pending.module.css';

function getGraphStatus(graph: TaskGraph, flows: TaskFlow[]): 'draft' | 'ready' | 'active' | 'completed' {
  const graphFlows = flows.filter(f => f.graph_id === graph.id);
  
  if (graphFlows.some(f => f.state === 'running' || f.state === 'paused')) {
    return 'active';
  }
  if (graphFlows.some(f => f.state === 'completed')) {
    return 'completed';
  }
  if (graph.state === 'locked') {
    return 'ready';
  }
  return 'draft';
}

export function Pending() {
  const navigate = useNavigate();
  const {
    graphs,
    flows,
    selectedProjectId,
    createFlow,
    validateGraph,
    addNotification,
    refreshFromApi,
  } = useHivemindStore();

  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<'modal' | 'panel'>('panel');
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const projectGraphs = useMemo(
    () => graphs.filter(g => g.project_id === selectedProjectId),
    [graphs, selectedProjectId]
  );

  const pendingGraphs = useMemo(() => {
    return projectGraphs.filter(g => {
      const status = getGraphStatus(g, flows);
      return status === 'draft' || status === 'ready';
    });
  }, [projectGraphs, flows]);

  const selectedGraph = selectedGraphId
    ? projectGraphs.find(g => g.id === selectedGraphId)
    : null;

  const selectedGraphFlows = useMemo(() => {
    if (!selectedGraphId) return [];
    return flows.filter(f => f.graph_id === selectedGraphId);
  }, [flows, selectedGraphId]);

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

  const handleCreateAndStartFlow = async (graphId: string) => {
    await runAction('Create flow', async () => {
      await createFlow({ graph_id: graphId });
      await refreshFromApi();
    });
  };

  const renderGraphCard = (graph: TaskGraph, index: number) => {
    const status = getGraphStatus(graph, flows);
    const taskCount = Object.keys(graph.tasks).length;
    const graphFlows = flows.filter(f => f.graph_id === graph.id);

    return (
      <motion.div
        key={graph.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card
          variant={selectedGraphId === graph.id ? 'elevated' : 'default'}
          hoverable
          className={styles.graphCard}
          onClick={() => setSelectedGraphId(graph.id)}
        >
          <div className={styles.graphHeader}>
            <IconBox size="md" color="var(--accent-400)">
              <Layers size={18} />
            </IconBox>
            <div className={styles.graphInfo}>
              <h3 className={styles.graphName}>{graph.name}</h3>
              <span className={styles.graphId}>{graph.id.slice(0, 8)}</span>
            </div>
            <Badge
              variant={
                status === 'ready' ? 'success' :
                status === 'active' ? 'info' :
                status === 'completed' ? 'default' :
                'warning'
              }
              size="sm"
            >
              {status}
            </Badge>
          </div>

          {graph.description && (
            <Text variant="body" color="secondary" className={styles.graphDescription}>
              {graph.description}
            </Text>
          )}

          <div className={styles.graphMeta}>
            <span><Zap size={12} /> {taskCount} tasks</span>
            {graphFlows.length > 0 && (
              <span><GitBranch size={12} /> {graphFlows.length} flows</span>
            )}
            <span><Clock size={12} /> {new Date(graph.updated_at).toLocaleDateString()}</span>
          </div>

          <div className={styles.graphActions}>
            {status === 'draft' && (
              <Button
                size="sm"
                variant="secondary"
                icon={<CheckCircle size={12} />}
                loading={busyAction === `validate-${graph.id}`}
                onClick={() => runAction(`validate-${graph.id}`, () => validateGraph({ graph_id: graph.id }))}
              >
                Validate
              </Button>
            )}
            {status === 'ready' && (
              <Button
                size="sm"
                variant="primary"
                icon={<Play size={12} />}
                loading={busyAction === `start-${graph.id}`}
                onClick={() => handleCreateAndStartFlow(graph.id)}
              >
                Start Flow
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              icon={<ChevronRight size={14} />}
              onClick={() => setSelectedGraphId(graph.id)}
            />
          </div>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Pending"
        subtitle="Task graphs ready to be executed"
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
        {pendingGraphs.length === 0 ? (
          <Card variant="outlined">
            <EmptyState
              icon={<Layers size={48} strokeWidth={1} />}
              title="No Pending Graphs"
              description="Create a task graph to organize and execute tasks"
              action={
                <Button variant="primary" icon={<Plus size={14} />} onClick={() => navigate('/tasks')}>
                  Create Graph
                </Button>
              }
            />
          </Card>
        ) : (
          <div className={styles.graphGrid}>
            {pendingGraphs.map((graph, i) => renderGraphCard(graph, i))}
          </div>
        )}

        {/* Detail Panel/Modal */}
        <AnimatePresence>
          {selectedGraph && (
            <DetailModal
              isOpen={!!selectedGraph}
              onClose={() => setSelectedGraphId(null)}
              mode={detailMode}
              width="lg"
              title={selectedGraph.name}
              subtitle={`Graph ${selectedGraph.id.slice(0, 8)} • ${selectedGraph.state}`}
            >
              <TabPanel defaultTab="tasks" variant="underline">
                <TabList>
                  <Tab id="tasks" icon={<Zap size={14} />}>
                    Tasks
                    <Badge variant="default" size="sm">
                      {Object.keys(selectedGraph.tasks).length}
                    </Badge>
                  </Tab>
                  <Tab id="flows" icon={<GitBranch size={14} />}>
                    Flows
                    <Badge variant="default" size="sm">{selectedGraphFlows.length}</Badge>
                  </Tab>
                  <Tab id="details" icon={<FileText size={14} />}>
                    Details
                  </Tab>
                </TabList>

                <TabContent id="tasks">
                  <Stack direction="column" gap={2}>
                    {Object.entries(selectedGraph.tasks).map(([taskId, graphTask]) => {
                      const deps = selectedGraph.dependencies[taskId] || [];
                      
                      return (
                        <Expandable
                          key={taskId}
                          title={graphTask.title}
                          subtitle={deps.length > 0 ? `Depends on ${deps.length} task(s)` : 'No dependencies'}
                          icon={<Zap size={14} />}
                          variant="card"
                        >
                          <Stack direction="column" gap={3}>
                            {graphTask.description && (
                              <Text variant="body" color="secondary">{graphTask.description}</Text>
                            )}
                            
                            {graphTask.criteria && (
                              <div className={styles.criteria}>
                                <Text variant="caption" color="muted">Acceptance Criteria</Text>
                                <Text variant="body">{graphTask.criteria.description}</Text>
                                {graphTask.criteria.checks && graphTask.criteria.checks.length > 0 && (
                                  <div className={styles.checks}>
                                    {graphTask.criteria.checks.map((check, i) => (
                                      <code key={i} className={styles.check}>{check}</code>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {deps.length > 0 && (
                              <div className={styles.dependencies}>
                                <Text variant="caption" color="muted">Dependencies</Text>
                                <Stack direction="row" gap={2}>
                                  {deps.map(depId => (
                                    <Badge key={depId} variant="default" size="sm">
                                      {selectedGraph.tasks[depId]?.title || depId.slice(0, 8)}
                                    </Badge>
                                  ))}
                                </Stack>
                              </div>
                            )}
                          </Stack>
                        </Expandable>
                      );
                    })}
                  </Stack>
                </TabContent>

                <TabContent id="flows">
                  {selectedGraphFlows.length === 0 ? (
                    <EmptyState
                      icon={<GitBranch size={32} strokeWidth={1} />}
                      title="No Flows Yet"
                      description="Start a flow to begin executing this graph"
                      action={
                        selectedGraph.state === 'locked' && (
                          <Button
                            variant="primary"
                            icon={<Play size={14} />}
                            onClick={() => handleCreateAndStartFlow(selectedGraph.id)}
                          >
                            Start Flow
                          </Button>
                        )
                      }
                    />
                  ) : (
                    <DataList>
                      {selectedGraphFlows.map(flow => (
                        <DataListItem
                          key={flow.id}
                          icon={<GitBranch size={16} />}
                          title={flow.id.slice(0, 8)}
                          subtitle={`${Object.keys(flow.task_executions).length} tasks`}
                          trailing={
                            <Badge
                              variant={
                                flow.state === 'running' ? 'info' :
                                flow.state === 'completed' ? 'success' :
                                flow.state === 'paused' ? 'warning' :
                                'default'
                              }
                              size="sm"
                            >
                              {flow.state}
                            </Badge>
                          }
                          onClick={() => navigate(`/flows/${flow.id}`)}
                        />
                      ))}
                    </DataList>
                  )}
                </TabContent>

                <TabContent id="details">
                  <Stack direction="column" gap={4}>
                    <div className={styles.detailRow}>
                      <Text variant="caption" color="muted">Graph ID</Text>
                      <code className={styles.detailValue}>{selectedGraph.id}</code>
                    </div>
                    <div className={styles.detailRow}>
                      <Text variant="caption" color="muted">State</Text>
                      <Badge variant={selectedGraph.state === 'locked' ? 'success' : 'warning'}>
                        {selectedGraph.state}
                      </Badge>
                    </div>
                    <div className={styles.detailRow}>
                      <Text variant="caption" color="muted">Created</Text>
                      <Text variant="body">{new Date(selectedGraph.created_at).toLocaleString()}</Text>
                    </div>
                    <div className={styles.detailRow}>
                      <Text variant="caption" color="muted">Updated</Text>
                      <Text variant="body">{new Date(selectedGraph.updated_at).toLocaleString()}</Text>
                    </div>
                    {selectedGraph.description && (
                      <div className={styles.detailRow}>
                        <Text variant="caption" color="muted">Description</Text>
                        <Text variant="body">{selectedGraph.description}</Text>
                      </div>
                    )}
                  </Stack>
                </TabContent>
              </TabPanel>

              <div className={styles.detailActions}>
                {selectedGraph.state === 'draft' && (
                  <Button
                    variant="secondary"
                    icon={<CheckCircle size={14} />}
                    loading={busyAction === `validate-${selectedGraph.id}`}
                    onClick={() => runAction(`validate-${selectedGraph.id}`, () => 
                      validateGraph({ graph_id: selectedGraph.id })
                    )}
                  >
                    Validate Graph
                  </Button>
                )}
                {selectedGraph.state === 'locked' && (
                  <Button
                    variant="primary"
                    icon={<Play size={14} />}
                    loading={busyAction === `start-${selectedGraph.id}`}
                    onClick={() => handleCreateAndStartFlow(selectedGraph.id)}
                  >
                    Start Flow
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/graphs/${selectedGraph.id}`)}
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
