import { create } from 'zustand';
import type {
  Project,
  Task,
  TaskGraph,
  TaskFlow,
  HivemindEvent,
  Runtime,
  Notification,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

const generateId = () => Math.random().toString(36).substring(2, 10);

const mockRuntimes: Runtime[] = [
  { id: 'rt-1', name: 'Claude Code', type: 'claude-code', status: 'healthy', version: '1.0.34' },
  { id: 'rt-2', name: 'Codex CLI', type: 'codex-cli', status: 'healthy', version: '0.9.2' },
  { id: 'rt-3', name: 'OpenCode', type: 'opencode', status: 'degraded', version: '2.1.0' },
];

const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'hivemind-core',
    description: 'Core orchestration engine for agentic development',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-02-07T09:30:00Z',
    repositories: [
      { id: 'repo-1', name: 'hivemind', path: '/home/antonio/programming/hivemind', accessMode: 'rw', attachedAt: '2025-01-15T10:00:00Z' },
    ],
    taskCount: 24,
    activeFlowCount: 2,
    status: 'active',
  },
  {
    id: 'proj-2',
    name: 'webapp-refactor',
    description: 'Modernizing the legacy webapp with React and TypeScript',
    createdAt: '2025-01-20T14:00:00Z',
    updatedAt: '2025-02-06T16:45:00Z',
    repositories: [
      { id: 'repo-2', name: 'webapp-frontend', path: '/home/antonio/projects/webapp-frontend', accessMode: 'rw', attachedAt: '2025-01-20T14:00:00Z' },
      { id: 'repo-3', name: 'webapp-backend', path: '/home/antonio/projects/webapp-backend', accessMode: 'rw', attachedAt: '2025-01-20T14:00:00Z' },
    ],
    taskCount: 18,
    activeFlowCount: 1,
    status: 'active',
  },
  {
    id: 'proj-3',
    name: 'ml-pipeline',
    description: 'Machine learning data pipeline automation',
    createdAt: '2025-02-01T09:00:00Z',
    updatedAt: '2025-02-05T11:20:00Z',
    repositories: [
      { id: 'repo-4', name: 'ml-pipeline', path: '/home/antonio/projects/ml-pipeline', accessMode: 'rw', attachedAt: '2025-02-01T09:00:00Z' },
    ],
    taskCount: 8,
    activeFlowCount: 0,
    status: 'active',
  },
];

const mockTasks: Task[] = [
  {
    id: 'task-1',
    projectId: 'proj-1',
    title: 'Implement TaskFlow scheduler',
    description: 'Create the core scheduler that releases tasks based on dependency satisfaction',
    state: 'success',
    createdAt: '2025-02-01T10:00:00Z',
    updatedAt: '2025-02-03T15:30:00Z',
    attempts: [],
    retryCount: 0,
    maxRetries: 3,
  },
  {
    id: 'task-2',
    projectId: 'proj-1',
    title: 'Add scope enforcement layer',
    description: 'Implement filesystem and repository scope validation',
    state: 'running',
    createdAt: '2025-02-02T09:00:00Z',
    updatedAt: '2025-02-07T10:15:00Z',
    attempts: [],
    retryCount: 0,
    maxRetries: 3,
  },
  {
    id: 'task-3',
    projectId: 'proj-1',
    title: 'Build event replay system',
    description: 'Create deterministic event replay for state reconstruction',
    state: 'verifying',
    createdAt: '2025-02-03T11:00:00Z',
    updatedAt: '2025-02-07T10:00:00Z',
    attempts: [],
    retryCount: 1,
    maxRetries: 3,
  },
  {
    id: 'task-4',
    projectId: 'proj-1',
    title: 'Design CLI command structure',
    description: 'Define operational semantics for all CLI commands',
    state: 'pending',
    createdAt: '2025-02-04T14:00:00Z',
    updatedAt: '2025-02-04T14:00:00Z',
    attempts: [],
    retryCount: 0,
    maxRetries: 3,
  },
  {
    id: 'task-5',
    projectId: 'proj-1',
    title: 'Implement verification loop',
    description: 'Add automated checks and verifier agent integration',
    state: 'retry',
    createdAt: '2025-02-05T10:00:00Z',
    updatedAt: '2025-02-07T09:45:00Z',
    attempts: [],
    retryCount: 2,
    maxRetries: 3,
  },
  {
    id: 'task-6',
    projectId: 'proj-1',
    title: 'Create merge protocol',
    description: 'Build the merge preparation and approval flow',
    state: 'failed',
    createdAt: '2025-02-06T08:00:00Z',
    updatedAt: '2025-02-07T08:30:00Z',
    attempts: [],
    retryCount: 3,
    maxRetries: 3,
  },
  {
    id: 'task-7',
    projectId: 'proj-1',
    title: 'Add worktree management',
    description: 'Implement isolated worktree creation and cleanup',
    state: 'escalated',
    createdAt: '2025-02-06T13:00:00Z',
    updatedAt: '2025-02-07T07:00:00Z',
    attempts: [],
    retryCount: 3,
    maxRetries: 3,
  },
];

const mockTaskFlows: TaskFlow[] = [
  {
    id: 'flow-1',
    graphId: 'graph-1',
    projectId: 'proj-1',
    name: 'Core Implementation Sprint 1',
    state: 'running',
    tasks: [
      { taskId: 'task-1', state: 'success', attemptCount: 1, dependencies: [], dependents: ['task-2', 'task-3'] },
      { taskId: 'task-2', state: 'running', attemptCount: 1, currentAttemptId: 'att-1', dependencies: ['task-1'], dependents: ['task-4'] },
      { taskId: 'task-3', state: 'verifying', attemptCount: 2, currentAttemptId: 'att-2', dependencies: ['task-1'], dependents: ['task-4'] },
      { taskId: 'task-4', state: 'pending', attemptCount: 0, dependencies: ['task-2', 'task-3'], dependents: [] },
    ],
    startedAt: '2025-02-05T09:00:00Z',
    createdAt: '2025-02-04T16:00:00Z',
    progress: { total: 4, completed: 1, failed: 0, running: 2 },
  },
  {
    id: 'flow-2',
    graphId: 'graph-2',
    projectId: 'proj-1',
    name: 'Verification & Merge Sprint',
    state: 'paused',
    tasks: [
      { taskId: 'task-5', state: 'retry', attemptCount: 2, dependencies: [], dependents: ['task-6'] },
      { taskId: 'task-6', state: 'failed', attemptCount: 3, dependencies: ['task-5'], dependents: ['task-7'] },
      { taskId: 'task-7', state: 'escalated', attemptCount: 3, dependencies: ['task-6'], dependents: [] },
    ],
    startedAt: '2025-02-06T10:00:00Z',
    createdAt: '2025-02-06T09:00:00Z',
    progress: { total: 3, completed: 0, failed: 2, running: 0 },
  },
];

const mockEvents: HivemindEvent[] = [
  {
    id: 'evt-1',
    type: 'TaskFlowStarted',
    category: 'taskflow',
    timestamp: '2025-02-07T10:15:32Z',
    correlations: { projectId: 'proj-1', taskFlowId: 'flow-1' },
    actor: { type: 'human', id: 'user-1', name: 'antonio' },
    payload: { flowName: 'Core Implementation Sprint 1' },
  },
  {
    id: 'evt-2',
    type: 'TaskExecutionStarted',
    category: 'task',
    timestamp: '2025-02-07T10:15:33Z',
    correlations: { projectId: 'proj-1', taskFlowId: 'flow-1', taskId: 'task-2' },
    actor: { type: 'system', id: 'scheduler' },
    payload: { taskTitle: 'Add scope enforcement layer' },
  },
  {
    id: 'evt-3',
    type: 'AttemptStarted',
    category: 'attempt',
    timestamp: '2025-02-07T10:15:34Z',
    correlations: { projectId: 'proj-1', taskFlowId: 'flow-1', taskId: 'task-2', attemptId: 'att-1' },
    actor: { type: 'agent', id: 'agent-1', name: 'Claude Code Worker' },
    payload: { runtime: 'claude-code' },
  },
  {
    id: 'evt-4',
    type: 'FileModified',
    category: 'filesystem',
    timestamp: '2025-02-07T10:16:45Z',
    correlations: { projectId: 'proj-1', taskFlowId: 'flow-1', taskId: 'task-2', attemptId: 'att-1' },
    actor: { type: 'agent', id: 'agent-1' },
    payload: { file: 'src/scope/enforcement.rs', additions: 142, deletions: 0 },
  },
  {
    id: 'evt-5',
    type: 'VerificationStarted',
    category: 'verification',
    timestamp: '2025-02-07T10:18:00Z',
    correlations: { projectId: 'proj-1', taskFlowId: 'flow-1', taskId: 'task-3', attemptId: 'att-2' },
    actor: { type: 'system', id: 'verifier' },
    payload: { automatedChecks: ['test', 'lint', 'typecheck'] },
  },
  {
    id: 'evt-6',
    type: 'ScopeViolationDetected',
    category: 'scope',
    timestamp: '2025-02-07T10:17:22Z',
    correlations: { projectId: 'proj-1', taskFlowId: 'flow-2', taskId: 'task-6', attemptId: 'att-3' },
    actor: { type: 'system', id: 'scope-enforcer' },
    payload: { violatedPath: '/etc/passwd', reason: 'Write to forbidden path' },
  },
  {
    id: 'evt-7',
    type: 'TaskEscalated',
    category: 'task',
    timestamp: '2025-02-07T10:19:00Z',
    correlations: { projectId: 'proj-1', taskFlowId: 'flow-2', taskId: 'task-7' },
    actor: { type: 'system', id: 'scheduler' },
    payload: { reason: 'Maximum retries exceeded', requiresHumanIntervention: true },
  },
  {
    id: 'evt-8',
    type: 'RuntimeHealthChanged',
    category: 'runtime',
    timestamp: '2025-02-07T10:20:15Z',
    correlations: {},
    actor: { type: 'system', id: 'health-monitor' },
    payload: { runtime: 'opencode', previousStatus: 'healthy', newStatus: 'degraded' },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// STORE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

interface HivemindStore {
  // ─── Data ───
  projects: Project[];
  tasks: Task[];
  taskGraphs: TaskGraph[];
  taskFlows: TaskFlow[];
  events: HivemindEvent[];
  runtimes: Runtime[];
  notifications: Notification[];

  // ─── UI State ───
  selectedProjectId: string | null;
  selectedTaskFlowId: string | null;
  selectedTaskId: string | null;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  eventStreamPaused: boolean;

  // ─── Actions ───
  setSelectedProject: (id: string | null) => void;
  setSelectedTaskFlow: (id: string | null) => void;
  setSelectedTask: (id: string | null) => void;
  toggleSidebar: () => void;
  toggleCommandPalette: () => void;
  toggleEventStream: () => void;
  addEvent: (event: HivemindEvent) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // ─── Getters ───
  getProject: (id: string) => Project | undefined;
  getTasksForProject: (projectId: string) => Task[];
  getTaskFlowsForProject: (projectId: string) => TaskFlow[];
  getEventsForFlow: (flowId: string) => HivemindEvent[];
  getTaskById: (id: string) => Task | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// STORE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

export const useHivemindStore = create<HivemindStore>((set, get) => ({
  // ─── Initial Data ───
  projects: mockProjects,
  tasks: mockTasks,
  taskGraphs: [],
  taskFlows: mockTaskFlows,
  events: mockEvents,
  runtimes: mockRuntimes,
  notifications: [
    {
      id: 'notif-1',
      type: 'warning',
      title: 'Task Escalated',
      message: 'Task "Add worktree management" requires human intervention',
      timestamp: '2025-02-07T10:19:00Z',
      read: false,
    },
    {
      id: 'notif-2',
      type: 'error',
      title: 'Scope Violation',
      message: 'Attempted write to forbidden path in task "Create merge protocol"',
      timestamp: '2025-02-07T10:17:22Z',
      read: false,
    },
    {
      id: 'notif-3',
      type: 'info',
      title: 'Runtime Degraded',
      message: 'OpenCode runtime experiencing connection issues',
      timestamp: '2025-02-07T10:20:15Z',
      read: true,
    },
  ],

  // ─── UI State ───
  selectedProjectId: 'proj-1',
  selectedTaskFlowId: null,
  selectedTaskId: null,
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  eventStreamPaused: false,

  // ─── Actions ───
  setSelectedProject: (id) => set({ selectedProjectId: id }),
  setSelectedTaskFlow: (id) => set({ selectedTaskFlowId: id }),
  setSelectedTask: (id) => set({ selectedTaskId: id }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  toggleEventStream: () => set((state) => ({ eventStreamPaused: !state.eventStreamPaused })),

  addEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events],
    })),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        {
          ...notification,
          id: generateId(),
          timestamp: new Date().toISOString(),
          read: false,
        },
        ...state.notifications,
      ],
    })),

  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

  clearNotifications: () => set({ notifications: [] }),

  // ─── Getters ───
  getProject: (id) => get().projects.find((p) => p.id === id),

  getTasksForProject: (projectId) =>
    get().tasks.filter((t) => t.projectId === projectId),

  getTaskFlowsForProject: (projectId) =>
    get().taskFlows.filter((f) => f.projectId === projectId),

  getEventsForFlow: (flowId) =>
    get().events.filter((e) => e.correlations.taskFlowId === flowId),

  getTaskById: (id) => get().tasks.find((t) => t.id === id),
}));
