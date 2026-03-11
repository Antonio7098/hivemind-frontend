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
  model?: string | null;
  args: string[];
  env: Record<string, string>;
  timeout_ms: number;
  max_parallel_tasks: number;
}

export type RuntimeRole = 'worker' | 'validator';

export interface RuntimeRoleDefaults {
  worker?: ProjectRuntimeConfig | null;
  validator?: ProjectRuntimeConfig | null;
}

export interface TaskRuntimeConfig {
  adapter_name: string;
  binary_path: string;
  model?: string | null;
  args: string[];
  env: Record<string, string>;
  timeout_ms: number;
}

export interface TaskRuntimeRoleOverrides {
  worker?: TaskRuntimeConfig | null;
  validator?: TaskRuntimeConfig | null;
}

export type RunMode = 'manual' | 'auto';

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
  runtime_defaults?: RuntimeRoleDefaults;
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
  runtime_override?: TaskRuntimeConfig | null;
  runtime_overrides?: TaskRuntimeRoleOverrides;
  run_mode?: RunMode;
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
  checkpoints?: string[];
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

export type FlowState =
  | 'created'
  | 'running'
  | 'paused'
  | 'frozen_for_merge'
  | 'completed'
  | 'merged'
  | 'aborted';

export type RetryMode = 'clean' | 'continue';

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
  retry_mode?: RetryMode;
  frozen_commit_sha?: string | null;
  integrated_commit_sha?: string | null;
  updated_at: string;
  blocked_reason: string | null;
}

export interface TaskFlow {
  id: string;
  graph_id: string;
  project_id: string;
  base_revision?: string | null;
  run_mode?: RunMode;
  depends_on_flows?: string[];
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
  check_results: CheckResult[];
  checkpoints: AttemptCheckpoint[];
  all_checkpoints_completed: boolean;
}

export type AttemptCheckpointState = 'declared' | 'active' | 'completed';

export interface AttemptCheckpoint {
  checkpoint_id: string;
  order: number;
  total: number;
  state: AttemptCheckpointState;
  commit_hash?: string | null;
  completed_at?: string | null;
  summary?: string | null;
}

export interface CheckResult {
  name: string;
  passed: boolean;
  exit_code: number;
  output: string;
  duration_ms: number;
  required: boolean;
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
  | 'error'
  | 'project'
  | 'task'
  | 'graph'
  | 'flow'
  | 'execution'
  | 'verification'
  | 'scope'
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

export interface RuntimeListEntry {
  adapter_name: string;
  default_binary: string;
  available: boolean;
  opencode_compatible: boolean;
}

export interface RuntimeHealthStatus {
  adapter_name: string;
  binary_path: string;
  healthy: boolean;
  target?: string | null;
  details?: string | null;
}

export interface WorktreeStatus {
  flow_id: string;
  task_id: string;
  path: string;
  is_worktree: boolean;
  head_commit: string | null;
  branch: string | null;
}

export interface CheckpointCompletionResult {
  flow_id: string;
  task_id: string;
  attempt_id: string;
  checkpoint_id: string;
  order: number;
  total: number;
  next_checkpoint_id: string | null;
  all_completed: boolean;
  commit_hash: string;
}

export interface VerifyResultsView {
  attempt_id: string;
  task_id: string;
  flow_id: string;
  attempt_number: number;
  check_results: Record<string, unknown>[];
}

export interface AttemptInspectView {
  attempt_id: string;
  task_id: string;
  flow_id: string;
  attempt_number: number;
  started_at: string;
  baseline_id: string | null;
  diff_id: string | null;
  runtime_session: AttemptRuntimeSessionView | null;
  turn_refs: AttemptTurnRefView[];
  approvals: RuntimeApprovalView[];
  pending_approvals: RuntimeApprovalView[];
  diff: string | null;
}

export interface RuntimeApprovalView {
  approval_id: string;
  call_id: string;
  invocation_id: string;
  turn_index: number;
  tool_name: string;
  approval_kind: string;
  status: string;
  resource: string | null;
  decision: string | null;
  summary: string | null;
  requested_at: string;
  resolved_at: string | null;
  policy_tags: string[];
}

export interface AttemptRuntimeSessionView {
  adapter_name: string;
  session_id: string;
  discovered_at: string;
}

export interface AttemptTurnRefView {
  ordinal: number;
  adapter_name: string;
  stream: string;
  provider_session_id: string | null;
  provider_turn_id: string | null;
  git_ref: string | null;
  commit_sha: string | null;
  summary: string | null;
}

export interface RuntimeStreamItemView {
  event_id: string;
  sequence: number;
  timestamp: string;
  flow_id: string | null;
  task_id: string | null;
  attempt_id: string | null;
  kind: string;
  stream: string | null;
  title: string | null;
  text: string | null;
  data: Record<string, unknown>;
}

export type ChatMode = 'freeflow' | 'plan';
export type ChatHistoryRole = 'user' | 'assistant';

export interface ChatHistoryMessageInput {
  role: ChatHistoryRole;
  content: string;
}

export interface ChatInvokeTurnView {
  turn_index: number;
  from_state: string;
  to_state: string;
  directive_kind: string;
  directive_text: string;
  raw_output: string;
}

export interface ChatTransportAttemptTrace {
  turn_index: number;
  attempt: number;
  transport: string;
  code: string;
  message: string;
  retryable: boolean;
  rate_limited: boolean;
  status_code: number | null;
  backoff_ms: number | null;
}

export interface ChatTransportFallbackTrace {
  turn_index: number;
  from_transport: string;
  to_transport: string;
  reason: string;
}

export interface ChatTransportTelemetry {
  attempts: ChatTransportAttemptTrace[];
  fallback_activations: ChatTransportFallbackTrace[];
  active_transport: string | null;
}

export interface ChatInvokeResponse {
  request_id: string;
  mode: ChatMode;
  project_id: string | null;
  task_id: string | null;
  flow_id: string | null;
  runtime_selection_source: string | null;
  provider: string;
  model: string;
  assistant_message: string;
  final_state: string;
  turns: ChatInvokeTurnView[];
  transport: ChatTransportTelemetry;
}

export interface ChatSessionMessageView {
  message_id: string;
  role: ChatHistoryRole;
  content: string;
  created_at: string;
  request_id: string | null;
  provider: string | null;
  model: string | null;
  final_state: string | null;
  runtime_selection_source: string | null;
}

export interface ChatSessionSummaryView {
  session_id: string;
  mode: ChatMode;
  title: string;
  owner_actor_id?: string | null;
  project_id: string | null;
  task_id: string | null;
  flow_id: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_preview: string | null;
}

export interface ChatSessionInspectView {
  session_id: string;
  mode: ChatMode;
  title: string;
  owner_actor_id?: string | null;
  project_id: string | null;
  task_id: string | null;
  flow_id: string | null;
  created_at: string;
  updated_at: string;
  messages: ChatSessionMessageView[];
}

export interface ChatSessionSendResponse {
  session_id: string;
  user_message_id: string;
  assistant_message_id: string;
  response: ChatInvokeResponse;
}

export interface ChatStreamChunkView {
  session_id: string;
  message_id: string;
  request_id: string | null;
  turn_index: number;
  from_state: string;
  to_state: string;
  directive_kind: string;
  content: string;
}

export interface ChatStreamTextDeltaView {
  session_id: string;
  message_id: string;
  request_id: string | null;
  content: string;
}

export type ChatStreamEvent =
  | { kind: 'message_appended'; message: ChatSessionMessageView }
  | { kind: 'stream_chunk'; chunk: ChatStreamChunkView }
  | { kind: 'text_delta'; delta: ChatStreamTextDeltaView };

export interface ChatStreamEnvelope {
  cursor: string;
  session_id: string;
  event: ChatStreamEvent;
}

export interface ApiCatalog {
  read_endpoints: string[];
  write_endpoints: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// GOVERNANCE (Phase 3)
// ─────────────────────────────────────────────────────────────────────────────

export interface GovernanceConstitutionResult {
  project_id: string;
  project_name: string;
  initialized: boolean;
  content: string | null;
  schema_version: string | null;
  validated_at: string | null;
  validated_by: string | null;
}

export interface GovernanceConstitutionCheckResult {
  project_id: string;
  project_name: string;
  initialized: boolean;
  valid: boolean;
  errors: string[];
}

export interface GovernanceDocumentSummary {
  document_id: string;
  title: string;
  revision_count: number;
  created_at: string;
  updated_at: string;
}

export interface GovernanceDocumentRevision {
  revision_id: string;
  content: string;
  created_at: string;
  created_by: string | null;
}

export interface GovernanceDocumentInspectResult {
  document_id: string;
  title: string;
  description: string | null;
  current_content: string;
  revisions: GovernanceDocumentRevision[];
  created_at: string;
  updated_at: string;
}

export interface GovernanceNotepadResult {
  project_id: string | null;
  content: string;
  updated_at: string;
}

export interface GlobalSkillSummary {
  skill_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface GlobalSkillInspectResult {
  skill_id: string;
  name: string;
  description: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface GlobalTemplateSummary {
  template_id: string;
  system_prompt_id: string;
  skill_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface GlobalTemplateInspectResult {
  template_id: string;
  system_prompt_id: string;
  skill_ids: string[];
  resolved_content: string | null;
  created_at: string;
  updated_at: string;
}

export interface GraphSnapshotRefreshResult {
  project_id: string;
  project_name: string;
  snapshot_id: string;
  trigger: string;
  node_count: number;
  edge_count: number;
}
