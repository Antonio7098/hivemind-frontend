import { create } from 'zustand';
import type {
  Project,
  Task,
  TaskGraph,
  TaskFlow,
  MergeState,
  HivemindEvent,
  Runtime,
  Notification,
} from '../types';

const API_BASE_URL =
  ((import.meta.env as unknown as Record<string, string | undefined>)[
    'VITE_HIVEMIND_API_BASE_URL'
  ] ?? 'http://127.0.0.1:8787');

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { category: string; code: string; message: string; hint?: string } };

type UiState = {
  projects: Project[];
  tasks: Task[];
  graphs: TaskGraph[];
  flows: TaskFlow[];
  merge_states: MergeState[];
  events: HivemindEvent[];
};

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA — Matches exact Rust backend structs
// ═══════════════════════════════════════════════════════════════════════════

const generateId = () => Math.random().toString(36).substring(2, 10);

const mockRuntimes: Runtime[] = [
  { id: 'rt-1', name: 'OpenCode', type: 'opencode', status: 'healthy', version: '2.1.0' },
];

const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'hivemind-core',
    description: 'Core orchestration engine for agentic development',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-02-07T09:30:00Z',
    repositories: [
      { name: 'hivemind', path: '/home/antonio/programming/hivemind', access_mode: 'readwrite' },
    ],
    runtime: {
      adapter_name: 'opencode',
      binary_path: 'opencode',
      args: [],
      env: {},
      timeout_ms: 600000,
    },
  },
  {
    id: 'proj-2',
    name: 'webapp-refactor',
    description: 'Modernizing the legacy webapp with React and TypeScript',
    created_at: '2025-01-20T14:00:00Z',
    updated_at: '2025-02-06T16:45:00Z',
    repositories: [
      { name: 'webapp-frontend', path: '/home/antonio/projects/webapp-frontend', access_mode: 'readwrite' },
      { name: 'webapp-backend', path: '/home/antonio/projects/webapp-backend', access_mode: 'readonly' },
    ],
    runtime: null,
  },
  {
    id: 'proj-3',
    name: 'ml-pipeline',
    description: 'Machine learning data pipeline automation',
    created_at: '2025-02-01T09:00:00Z',
    updated_at: '2025-02-05T11:20:00Z',
    repositories: [
      { name: 'ml-pipeline', path: '/home/antonio/projects/ml-pipeline', access_mode: 'readwrite' },
    ],
    runtime: null,
  },
];

const mockTasks: Task[] = [
  {
    id: 'task-1', project_id: 'proj-1', title: 'Implement TaskFlow scheduler',
    description: 'Create the core scheduler that releases tasks based on dependency satisfaction',
    state: 'closed', scope: null,
    created_at: '2025-02-01T10:00:00Z', updated_at: '2025-02-03T15:30:00Z',
  },
  {
    id: 'task-2', project_id: 'proj-1', title: 'Add scope enforcement layer',
    description: 'Implement filesystem and repository scope validation',
    state: 'open', scope: {
      filesystem: { rules: [{ pattern: 'src/core/', permission: 'write' }, { pattern: 'tests/', permission: 'write' }] },
      repositories: [{ repo: 'hivemind', mode: 'readwrite' }],
      git: { permissions: ['commit', 'branch'] },
      execution: { allowed: ['cargo test', 'cargo clippy'], denied: ['rm'] },
    },
    created_at: '2025-02-02T09:00:00Z', updated_at: '2025-02-07T10:15:00Z',
  },
  {
    id: 'task-3', project_id: 'proj-1', title: 'Build event replay system',
    description: 'Create deterministic event replay for state reconstruction',
    state: 'open', scope: {
      filesystem: { rules: [{ pattern: 'src/core/events.rs', permission: 'write' }, { pattern: 'src/core/state.rs', permission: 'write' }] },
      repositories: [{ repo: 'hivemind', mode: 'readwrite' }],
      git: { permissions: ['commit'] },
      execution: { allowed: ['cargo test'], denied: [] },
    },
    created_at: '2025-02-03T11:00:00Z', updated_at: '2025-02-07T10:00:00Z',
  },
  {
    id: 'task-4', project_id: 'proj-1', title: 'Design CLI command structure',
    description: 'Define operational semantics for all CLI commands',
    state: 'open', scope: null,
    created_at: '2025-02-04T14:00:00Z', updated_at: '2025-02-04T14:00:00Z',
  },
  {
    id: 'task-5', project_id: 'proj-1', title: 'Implement verification overrides',
    description: 'Add human override pass/fail for task verification',
    state: 'open', scope: null,
    created_at: '2025-02-05T10:00:00Z', updated_at: '2025-02-07T09:45:00Z',
  },
  {
    id: 'task-6', project_id: 'proj-1', title: 'Create merge protocol',
    description: 'Build the merge preparation, approval, and execution flow',
    state: 'open', scope: null,
    created_at: '2025-02-06T08:00:00Z', updated_at: '2025-02-07T08:30:00Z',
  },
  {
    id: 'task-7', project_id: 'proj-1', title: 'Add worktree management',
    description: 'Implement isolated worktree creation and cleanup per task',
    state: 'open', scope: null,
    created_at: '2025-02-06T13:00:00Z', updated_at: '2025-02-07T07:00:00Z',
  },
  {
    id: 'task-8', project_id: 'proj-2', title: 'Migrate to React Router v7',
    description: 'Update routing from v5 to v7 patterns',
    state: 'open', scope: null,
    created_at: '2025-02-03T10:00:00Z', updated_at: '2025-02-03T10:00:00Z',
  },
  {
    id: 'task-9', project_id: 'proj-2', title: 'Convert class components to hooks',
    description: 'Refactor all class components to functional with hooks',
    state: 'open', scope: null,
    created_at: '2025-02-03T10:30:00Z', updated_at: '2025-02-03T10:30:00Z',
  },
  {
    id: 'task-10', project_id: 'proj-2', title: 'Add TypeScript strict mode',
    description: 'Enable strict TypeScript and fix all type errors',
    state: 'closed', scope: null,
    created_at: '2025-02-02T09:00:00Z', updated_at: '2025-02-04T15:00:00Z',
  },
];

const mockGraphs: TaskGraph[] = [
  {
    id: 'graph-1', project_id: 'proj-1', name: 'Core Implementation Sprint 1',
    description: 'Core orchestration engine tasks with dependencies',
    state: 'locked',
    tasks: {
      'task-1': {
        id: 'task-1', title: 'Implement TaskFlow scheduler',
        description: 'Create the core scheduler', scope: null,
        criteria: { description: 'All scheduler tests pass', checks: ['cargo test scheduler'] },
        retry_policy: { max_retries: 3, escalate_on_failure: true },
      },
      'task-2': {
        id: 'task-2', title: 'Add scope enforcement layer',
        description: 'Implement filesystem and repository scope validation', scope: null,
        criteria: { description: 'Scope tests pass, no violations in CI', checks: ['cargo test scope'] },
        retry_policy: { max_retries: 3, escalate_on_failure: true },
      },
      'task-3': {
        id: 'task-3', title: 'Build event replay system',
        description: 'Create deterministic event replay', scope: null,
        criteria: { description: 'Replay is deterministic and idempotent', checks: ['cargo test replay'] },
        retry_policy: { max_retries: 2, escalate_on_failure: false },
      },
      'task-4': {
        id: 'task-4', title: 'Design CLI command structure',
        description: 'Define operational semantics for CLI', scope: null,
        criteria: { description: 'All CLI commands respond correctly', checks: ['cargo test cli'] },
        retry_policy: { max_retries: 3, escalate_on_failure: true },
      },
    },
    dependencies: {
      'task-1': [],
      'task-2': ['task-1'],
      'task-3': ['task-1'],
      'task-4': ['task-2', 'task-3'],
    },
    created_at: '2025-02-04T16:00:00Z', updated_at: '2025-02-05T09:00:00Z',
  },
  {
    id: 'graph-2', project_id: 'proj-1', name: 'Verification & Merge Sprint',
    description: 'Human verification and merge workflow implementation',
    state: 'locked',
    tasks: {
      'task-5': {
        id: 'task-5', title: 'Implement verification overrides',
        description: 'Add human override pass/fail', scope: null,
        criteria: { description: 'Override tests pass', checks: ['cargo test verify'] },
        retry_policy: { max_retries: 3, escalate_on_failure: true },
      },
      'task-6': {
        id: 'task-6', title: 'Create merge protocol',
        description: 'Build merge preparation and approval', scope: null,
        criteria: { description: 'Merge lifecycle tests pass', checks: ['cargo test merge'] },
        retry_policy: { max_retries: 3, escalate_on_failure: true },
      },
      'task-7': {
        id: 'task-7', title: 'Add worktree management',
        description: 'Isolated worktree per task', scope: null,
        criteria: { description: 'Worktree creation and cleanup works', checks: ['cargo test worktree'] },
        retry_policy: { max_retries: 3, escalate_on_failure: true },
      },
    },
    dependencies: {
      'task-5': [],
      'task-6': ['task-5'],
      'task-7': ['task-6'],
    },
    created_at: '2025-02-06T09:00:00Z', updated_at: '2025-02-06T10:00:00Z',
  },
  {
    id: 'graph-3', project_id: 'proj-2', name: 'React Modernization',
    description: 'Modernize React codebase with TypeScript and hooks',
    state: 'draft',
    tasks: {
      'task-8': {
        id: 'task-8', title: 'Migrate to React Router v7',
        description: 'Update routing patterns', scope: null,
        criteria: { description: 'All routes work with v7', checks: ['npm test'] },
        retry_policy: { max_retries: 2, escalate_on_failure: false },
      },
      'task-9': {
        id: 'task-9', title: 'Convert class components to hooks',
        description: 'Refactor class components', scope: null,
        criteria: { description: 'No class components remain', checks: ['npm test'] },
        retry_policy: { max_retries: 2, escalate_on_failure: false },
      },
    },
    dependencies: {
      'task-8': [],
      'task-9': ['task-8'],
    },
    created_at: '2025-02-03T10:00:00Z', updated_at: '2025-02-03T11:00:00Z',
  },
];

const mockFlows: TaskFlow[] = [
  {
    id: 'flow-1', graph_id: 'graph-1', project_id: 'proj-1',
    state: 'running',
    task_executions: {
      'task-1': { task_id: 'task-1', state: 'success', attempt_count: 1, updated_at: '2025-02-05T15:30:00Z', blocked_reason: null },
      'task-2': { task_id: 'task-2', state: 'running', attempt_count: 1, updated_at: '2025-02-07T10:15:00Z', blocked_reason: null },
      'task-3': { task_id: 'task-3', state: 'verifying', attempt_count: 2, updated_at: '2025-02-07T10:00:00Z', blocked_reason: null },
      'task-4': { task_id: 'task-4', state: 'pending', attempt_count: 0, updated_at: '2025-02-05T09:00:00Z', blocked_reason: 'Waiting on task-2, task-3' },
    },
    created_at: '2025-02-04T16:00:00Z', started_at: '2025-02-05T09:00:00Z',
    completed_at: null, updated_at: '2025-02-07T10:15:00Z',
  },
  {
    id: 'flow-2', graph_id: 'graph-2', project_id: 'proj-1',
    state: 'paused',
    task_executions: {
      'task-5': { task_id: 'task-5', state: 'retry', attempt_count: 2, updated_at: '2025-02-07T09:45:00Z', blocked_reason: null },
      'task-6': { task_id: 'task-6', state: 'failed', attempt_count: 3, updated_at: '2025-02-07T08:30:00Z', blocked_reason: null },
      'task-7': { task_id: 'task-7', state: 'escalated', attempt_count: 3, updated_at: '2025-02-07T07:00:00Z', blocked_reason: null },
    },
    created_at: '2025-02-06T09:00:00Z', started_at: '2025-02-06T10:00:00Z',
    completed_at: null, updated_at: '2025-02-07T09:45:00Z',
  },
];

const mockMergeStates: MergeState[] = [
  {
    flow_id: 'flow-1',
    status: 'prepared',
    target_branch: 'main',
    conflicts: [],
    commits: [],
    updated_at: '2025-02-07T10:00:00Z',
  },
];

const mockEvents: HivemindEvent[] = [
  {
    id: 'evt-1', type: 'TaskFlowStarted', category: 'flow',
    timestamp: '2025-02-07T10:15:32Z', sequence: 1,
    correlation: { project_id: 'proj-1', graph_id: 'graph-1', flow_id: 'flow-1', task_id: null, attempt_id: null },
    payload: {},
  },
  {
    id: 'evt-2', type: 'TaskExecutionStateChanged', category: 'execution',
    timestamp: '2025-02-07T10:15:33Z', sequence: 2,
    correlation: { project_id: 'proj-1', graph_id: 'graph-1', flow_id: 'flow-1', task_id: 'task-2', attempt_id: null },
    payload: { from: 'ready', to: 'running' },
  },
  {
    id: 'evt-3', type: 'AttemptStarted', category: 'execution',
    timestamp: '2025-02-07T10:15:34Z', sequence: 3,
    correlation: { project_id: 'proj-1', graph_id: 'graph-1', flow_id: 'flow-1', task_id: 'task-2', attempt_id: 'att-1' },
    payload: { attempt_number: 1 },
  },
  {
    id: 'evt-4', type: 'FileModified', category: 'filesystem',
    timestamp: '2025-02-07T10:16:45Z', sequence: 4,
    correlation: { project_id: 'proj-1', graph_id: 'graph-1', flow_id: 'flow-1', task_id: 'task-2', attempt_id: 'att-1' },
    payload: { path: 'src/core/enforcement.rs', change_type: 'modified' },
  },
  {
    id: 'evt-5', type: 'TaskExecutionStateChanged', category: 'execution',
    timestamp: '2025-02-07T10:18:00Z', sequence: 5,
    correlation: { project_id: 'proj-1', graph_id: 'graph-1', flow_id: 'flow-1', task_id: 'task-3', attempt_id: null },
    payload: { from: 'running', to: 'verifying' },
  },
  {
    id: 'evt-6', type: 'TaskRetryRequested', category: 'execution',
    timestamp: '2025-02-07T10:17:22Z', sequence: 6,
    correlation: { project_id: 'proj-1', graph_id: 'graph-2', flow_id: 'flow-2', task_id: 'task-5', attempt_id: null },
    payload: { reset_count: false },
  },
  {
    id: 'evt-7', type: 'HumanOverride', category: 'verification',
    timestamp: '2025-02-07T10:19:00Z', sequence: 7,
    correlation: { project_id: 'proj-1', graph_id: 'graph-2', flow_id: 'flow-2', task_id: 'task-7', attempt_id: null },
    payload: { decision: 'fail', reason: 'Maximum retries exceeded, needs manual intervention' },
  },
  {
    id: 'evt-8', type: 'TaskFlowPaused', category: 'flow',
    timestamp: '2025-02-07T10:20:15Z', sequence: 8,
    correlation: { project_id: 'proj-1', graph_id: 'graph-2', flow_id: 'flow-2', task_id: null, attempt_id: null },
    payload: { running_tasks: [] },
  },
  {
    id: 'evt-9', type: 'MergePrepared', category: 'merge',
    timestamp: '2025-02-07T10:21:00Z', sequence: 9,
    correlation: { project_id: 'proj-1', graph_id: 'graph-1', flow_id: 'flow-1', task_id: null, attempt_id: null },
    payload: { target_branch: 'main', conflicts: [] },
  },
  {
    id: 'evt-10', type: 'RepositoryAttached', category: 'project',
    timestamp: '2025-02-07T10:22:00Z', sequence: 10,
    correlation: { project_id: 'proj-2', graph_id: null, flow_id: null, task_id: null, attempt_id: null },
    payload: { name: 'webapp-backend', path: '/home/antonio/projects/webapp-backend', access_mode: 'readonly' },
  },
  {
    id: 'evt-11', type: 'TaskGraphCreated', category: 'graph',
    timestamp: '2025-02-07T10:23:00Z', sequence: 11,
    correlation: { project_id: 'proj-2', graph_id: 'graph-3', flow_id: null, task_id: null, attempt_id: null },
    payload: { name: 'React Modernization' },
  },
  {
    id: 'evt-12', type: 'TaskCreated', category: 'task',
    timestamp: '2025-02-07T10:24:00Z', sequence: 12,
    correlation: { project_id: 'proj-1', graph_id: null, flow_id: null, task_id: 'task-7', attempt_id: null },
    payload: { title: 'Add worktree management' },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// STORE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

interface HivemindStore {
  // ─── Data ───
  projects: Project[];
  tasks: Task[];
  graphs: TaskGraph[];
  flows: TaskFlow[];
  mergeStates: MergeState[];
  events: HivemindEvent[];
  runtimes: Runtime[];
  notifications: Notification[];

  apiConnected: boolean;
  apiError: string | null;

  // ─── UI State ───
  selectedProjectId: string | null;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  eventStreamPaused: boolean;
  mobileMenuOpen: boolean;

  // ─── Actions ───
  setSelectedProject: (id: string | null) => void;
  toggleSidebar: () => void;
  toggleCommandPalette: () => void;
  toggleEventStream: () => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  addEvent: (event: HivemindEvent) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  refreshFromApi: (eventsLimit?: number) => Promise<void>;

  // ─── Derived ───
  getProject: (id: string) => Project | undefined;
  getTasksForProject: (projectId: string) => Task[];
  getGraphsForProject: (projectId: string) => TaskGraph[];
  getFlowsForProject: (projectId: string) => TaskFlow[];
  getGraphForFlow: (flow: TaskFlow) => TaskGraph | undefined;
  getFlowExecStats: (flow: TaskFlow) => Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════
// STORE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

export const useHivemindStore = create<HivemindStore>((set, get) => ({
  // ─── Initial Data ───
  projects: mockProjects,
  tasks: mockTasks,
  graphs: mockGraphs,
  flows: mockFlows,
  mergeStates: mockMergeStates,
  events: mockEvents,
  runtimes: mockRuntimes,
  notifications: [
    {
      id: 'notif-1', type: 'warning', title: 'Task Escalated',
      message: 'Task "Add worktree management" escalated — requires human intervention',
      timestamp: '2025-02-07T10:19:00Z', read: false,
    },
    {
      id: 'notif-2', type: 'info', title: 'Flow Paused',
      message: 'Verification & Merge Sprint paused due to failures',
      timestamp: '2025-02-07T10:20:15Z', read: false,
    },
    {
      id: 'notif-3', type: 'success', title: 'Merge Prepared',
      message: 'Core Implementation Sprint 1 merge prepared for main',
      timestamp: '2025-02-07T10:21:00Z', read: true,
    },
  ],

  // ─── UI State ───
  selectedProjectId: 'proj-1',
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  eventStreamPaused: false,
  mobileMenuOpen: false,

  apiConnected: false,
  apiError: null,

  // ─── Actions ───
  setSelectedProject: (id) => set({ selectedProjectId: id }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  toggleEventStream: () => set((s) => ({ eventStreamPaused: !s.eventStreamPaused })),
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
  closeMobileMenu: () => set({ mobileMenuOpen: false }),

  addEvent: (event) =>
    set((s) => ({ events: [event, ...s.events] })),

  addNotification: (notification) =>
    set((s) => ({
      notifications: [
        { ...notification, id: generateId(), timestamp: new Date().toISOString(), read: false },
        ...s.notifications,
      ],
    })),

  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),

  clearNotifications: () => set({ notifications: [] }),

  refreshFromApi: async (eventsLimit = 200) => {
    try {
      const paused = get().eventStreamPaused;
      const effectiveLimit = paused ? 0 : eventsLimit;
      const res = await fetch(`${API_BASE_URL}/api/state?events_limit=${effectiveLimit}`);
      const json = (await res.json()) as ApiResponse<UiState>;

      if (!json.success) {
        set({ apiConnected: false, apiError: json.error.message });
        return;
      }

      set((s) => ({
        projects: json.data.projects,
        tasks: json.data.tasks,
        graphs: json.data.graphs,
        flows: json.data.flows,
        mergeStates: json.data.merge_states,
        events: paused ? s.events : json.data.events,
        apiConnected: true,
        apiError: null,
      }));

      const current = get().selectedProjectId;
      if (current && !json.data.projects.some((p) => p.id === current)) {
        set({ selectedProjectId: json.data.projects[0]?.id ?? null });
      }
    } catch (e) {
      set({ apiConnected: false, apiError: e instanceof Error ? e.message : String(e) });
    }
  },

  // ─── Derived ───
  getProject: (id) => get().projects.find((p) => p.id === id),
  getTasksForProject: (projectId) => get().tasks.filter((t) => t.project_id === projectId),
  getGraphsForProject: (projectId) => get().graphs.filter((g) => g.project_id === projectId),
  getFlowsForProject: (projectId) => get().flows.filter((f) => f.project_id === projectId),
  getGraphForFlow: (flow) => get().graphs.find((g) => g.id === flow.graph_id),

  getFlowExecStats: (flow) => {
    const stats: Record<string, number> = {};
    for (const exec of Object.values(flow.task_executions)) {
      stats[exec.state] = (stats[exec.state] || 0) + 1;
    }
    return stats;
  },
}));
