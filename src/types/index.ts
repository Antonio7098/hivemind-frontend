// ═══════════════════════════════════════════════════════════════════════════
// HIVEMIND TYPE DEFINITIONS
// Based on architecture docs
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  repositories: Repository[];
  taskCount: number;
  activeFlowCount: number;
  status: 'active' | 'archived';
}

export interface Repository {
  id: string;
  name: string;
  path: string;
  accessMode: 'ro' | 'rw';
  attachedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type TaskState =
  | 'pending'
  | 'running'
  | 'verifying'
  | 'success'
  | 'retry'
  | 'failed'
  | 'escalated';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  state: TaskState;
  scope?: Scope;
  createdAt: string;
  updatedAt: string;
  attempts: Attempt[];
  verificationResults?: VerificationResult[];
  retryCount: number;
  maxRetries: number;
  assignedAgent?: Agent;
}

export interface Scope {
  id: string;
  filesystemPaths: FilesystemPermission[];
  repositories: RepositoryPermission[];
  executionPermissions: string[];
  gitPermissions: GitPermission[];
}

export interface FilesystemPermission {
  pattern: string;
  permission: 'read' | 'write' | 'deny';
}

export interface RepositoryPermission {
  repositoryId: string;
  accessMode: 'ro' | 'rw';
}

export interface GitPermission {
  action: 'commit' | 'branch' | 'push' | 'merge';
  allowed: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type AgentRole = 'planner' | 'worker' | 'verifier' | 'merge' | 'freeflow';

export interface Agent {
  id: string;
  role: AgentRole;
  runtime: Runtime;
  status: 'idle' | 'active' | 'terminated';
}

export interface Runtime {
  id: string;
  name: string;
  type: 'claude-code' | 'codex-cli' | 'opencode' | 'gemini-cli';
  status: 'healthy' | 'degraded' | 'offline';
  version?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTEMPT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Attempt {
  id: string;
  taskId: string;
  agentId: string;
  startedAt: string;
  completedAt?: string;
  exitStatus: 'success' | 'failed' | 'crashed' | 'running';
  outputSummary?: string;
  diff?: Diff;
  checkpointCommit?: string;
}

export interface Diff {
  id: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  files: DiffFile[];
}

export interface DiffFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface VerificationResult {
  id: string;
  attemptId: string;
  automatedChecks: AutomatedCheck[];
  verifierDecision?: VerifierDecision;
  humanOverride?: HumanOverride;
  outcome: 'pass' | 'soft_fail' | 'hard_fail';
  timestamp: string;
}

export interface AutomatedCheck {
  name: string;
  type: 'test' | 'lint' | 'typecheck' | 'build' | 'custom';
  status: 'pass' | 'fail' | 'skip';
  message?: string;
  duration?: number;
}

export interface VerifierDecision {
  decision: 'pass' | 'soft_fail' | 'hard_fail';
  reasoning: string;
  confidence: number;
}

export interface HumanOverride {
  userId: string;
  decision: 'pass' | 'fail';
  reason: string;
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TASKGRAPH TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskGraph {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  tasks: TaskNode[];
  edges: TaskEdge[];
  createdAt: string;
  status: 'draft' | 'validated' | 'immutable';
}

export interface TaskNode {
  taskId: string;
  position: { x: number; y: number };
}

export interface TaskEdge {
  from: string;
  to: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TASKFLOW TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type TaskFlowState =
  | 'created'
  | 'running'
  | 'paused'
  | 'completed'
  | 'aborted';

export interface TaskFlow {
  id: string;
  graphId: string;
  projectId: string;
  name: string;
  state: TaskFlowState;
  tasks: TaskFlowTask[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  progress: {
    total: number;
    completed: number;
    failed: number;
    running: number;
  };
}

export interface TaskFlowTask {
  taskId: string;
  state: TaskState;
  attemptCount: number;
  currentAttemptId?: string;
  dependencies: string[];
  dependents: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type EventCategory =
  | 'project'
  | 'taskgraph'
  | 'taskflow'
  | 'task'
  | 'attempt'
  | 'agent'
  | 'runtime'
  | 'scope'
  | 'filesystem'
  | 'verification'
  | 'merge'
  | 'human';

export interface HivemindEvent {
  id: string;
  type: string;
  category: EventCategory;
  timestamp: string;
  correlations: {
    projectId?: string;
    taskGraphId?: string;
    taskFlowId?: string;
    taskId?: string;
    attemptId?: string;
  };
  actor: {
    type: 'system' | 'agent' | 'human';
    id: string;
    name?: string;
  };
  payload: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// MERGE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface MergePreparation {
  id: string;
  flowId: string;
  targetBranch: string;
  status: 'preparing' | 'ready' | 'conflict' | 'merged';
  commits: MergeCommit[];
  conflicts?: MergeConflict[];
  preparedAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface MergeCommit {
  sha: string;
  message: string;
  taskId: string;
}

export interface MergeConflict {
  file: string;
  type: 'content' | 'mode' | 'rename';
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI STATE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  timestamp: string;
  read: boolean;
}

export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  shortcut?: string;
  action: () => void;
  category?: string;
}
