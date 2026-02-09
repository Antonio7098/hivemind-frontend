// ═══════════════════════════════════════════════════════════════════════════
// HIVEMIND TYPE DEFINITIONS
// Matched to Rust backend structs (src/core/)
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// SCOPE MODEL (src/core/scope.rs)
// ─────────────────────────────────────────────────────────────────────────────

export type FilePermission = 'read' | 'write' | 'deny';

export interface PathRule {
  pattern: string;
  permission: FilePermission;
}

export interface FilesystemScope {
  rules: PathRule[];
}

export type RepoAccessMode = 'readonly' | 'readwrite';

export interface RepositoryScope {
  repo: string;
  mode: RepoAccessMode;
}

export type GitPermission = 'commit' | 'branch' | 'push';

export interface GitScope {
  permissions: GitPermission[];
}

export interface ExecutionScope {
  allowed: string[];
  denied: string[];
}

export interface Scope {
  filesystem: FilesystemScope;
  repositories: RepositoryScope[];
  git: GitScope;
  execution: ExecutionScope;
}

export type ScopeCompatibility = 'compatible' | 'soft_conflict' | 'hard_conflict';

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT (src/core/state.rs)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectRuntimeConfig {
  adapter_name: string;
  binary_path: string;
  args: string[];
  env: Record<string, string>;
  timeout_ms: number;
}

export interface Repository {
  name: string;
  path: string;
  access_mode: RepoAccessMode;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  repositories: Repository[];
  runtime: ProjectRuntimeConfig | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK (src/core/state.rs) — simple Open/Closed items
// ─────────────────────────────────────────────────────────────────────────────

export type TaskState = 'open' | 'closed';

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  scope: Scope | null;
  state: TaskState;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK GRAPH (src/core/graph.rs) — static DAG of planned intent
// ─────────────────────────────────────────────────────────────────────────────

export interface RetryPolicy {
  max_retries: number;
  escalate_on_failure: boolean;
}

export interface SuccessCriteria {
  description: string;
  checks: string[];
}

export interface GraphTask {
  id: string;
  title: string;
  description: string | null;
  criteria: SuccessCriteria;
  retry_policy: RetryPolicy;
  scope: Scope | null;
}

export type GraphState = 'draft' | 'validated' | 'locked';

export interface TaskGraph {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  state: GraphState;
  tasks: Record<string, GraphTask>;
  dependencies: Record<string, string[]>;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK FLOW (src/core/flow.rs) — runtime execution instance
// ─────────────────────────────────────────────────────────────────────────────

export type FlowState = 'created' | 'running' | 'paused' | 'completed' | 'aborted';

export type TaskExecState =
  | 'pending'
  | 'ready'
  | 'running'
  | 'verifying'
  | 'success'
  | 'retry'
  | 'failed'
  | 'escalated';

export interface TaskExecution {
  task_id: string;
  state: TaskExecState;
  attempt_count: number;
  updated_at: string;
  blocked_reason: string | null;
}

export interface TaskFlow {
  id: string;
  graph_id: string;
  project_id: string;
  state: FlowState;
  task_executions: Record<string, TaskExecution>;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MERGE STATE (src/core/state.rs)
// ─────────────────────────────────────────────────────────────────────────────

export type MergeStatus = 'prepared' | 'approved' | 'completed';

export interface MergeState {
  flow_id: string;
  status: MergeStatus;
  target_branch: string | null;
  conflicts: string[];
  commits: string[];
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTEMPT STATE (src/core/state.rs)
// ─────────────────────────────────────────────────────────────────────────────

export interface AttemptState {
  id: string;
  flow_id: string;
  task_id: string;
  attempt_number: number;
  started_at: string;
  baseline_id: string | null;
  diff_id: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS (src/core/events.rs) — immutable, append-only event log
// ─────────────────────────────────────────────────────────────────────────────

export interface CorrelationIds {
  project_id: string | null;
  graph_id: string | null;
  flow_id: string | null;
  task_id: string | null;
  attempt_id: string | null;
}

export type EventType =
  | 'ProjectCreated'
  | 'ProjectUpdated'
  | 'ProjectRuntimeConfigured'
  | 'RepositoryAttached'
  | 'RepositoryDetached'
  | 'TaskCreated'
  | 'TaskUpdated'
  | 'TaskClosed'
  | 'TaskGraphCreated'
  | 'TaskAddedToGraph'
  | 'DependencyAdded'
  | 'ScopeAssigned'
  | 'TaskFlowCreated'
  | 'TaskFlowStarted'
  | 'TaskFlowPaused'
  | 'TaskFlowResumed'
  | 'TaskFlowCompleted'
  | 'TaskFlowAborted'
  | 'TaskReady'
  | 'TaskBlocked'
  | 'TaskExecutionStateChanged'
  | 'TaskRetryRequested'
  | 'TaskAborted'
  | 'HumanOverride'
  | 'MergePrepared'
  | 'MergeApproved'
  | 'MergeCompleted'
  | 'AttemptStarted'
  | 'BaselineCaptured'
  | 'DiffComputed'
  | 'FileModified'
  | 'CheckpointCommitCreated'
  | 'RuntimeStarted'
  | 'RuntimeOutputChunk'
  | 'RuntimeExited'
  | 'RuntimeTerminated'
  | 'RuntimeFilesystemObserved';

export type EventCategory =
  | 'project'
  | 'task'
  | 'graph'
  | 'flow'
  | 'execution'
  | 'verification'
  | 'merge'
  | 'runtime'
  | 'filesystem';

export interface HivemindEvent {
  id: string;
  type: EventType;
  category: EventCategory;
  timestamp: string;
  sequence: number | null;
  correlation: CorrelationIds;
  payload: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  timestamp: string;
  read: boolean;
}

export interface Runtime {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'degraded' | 'offline';
  version?: string;
}
