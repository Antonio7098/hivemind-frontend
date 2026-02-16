import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  GitBranch,
  ListTodo,
  Play,
  MoreVertical,
  Terminal,
  GitFork,
  Clock,
  Power,
} from 'lucide-react';
import { useHivemindStore } from '../stores/hivemindStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/composites/PageHeader';
import { Grid } from '../components/primitives/Grid';
import { Stack } from '../components/primitives/Stack';
import { Text } from '../components/primitives/Text';
import { IconBox } from '../components/primitives/IconBox';
import styles from './Projects.module.css';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

export function Projects() {
  const navigate = useNavigate();
  const {
    projects,
    tasks,
    graphs,
    flows,
    setSelectedProject,
    selectedProjectId,
    createProject,
    updateProject,
    setProjectRuntime,
    attachProjectRepo,
    detachProjectRepo,
    refreshFromApi,
    addNotification,
    apiError,
  } = useHivemindStore();

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [runtimeAdapter, setRuntimeAdapter] = useState('opencode');
  const [runtimeBinary, setRuntimeBinary] = useState('opencode');
  const [runtimeRole, setRuntimeRole] = useState<'worker' | 'validator'>('worker');
  const [runtimeModel, setRuntimeModel] = useState('');
  const [runtimeArgs, setRuntimeArgs] = useState('');
  const [runtimeEnv, setRuntimeEnv] = useState('');
  const [runtimeTimeout, setRuntimeTimeout] = useState('600000');
  const [runtimeMaxParallel, setRuntimeMaxParallel] = useState('1');

  const [repoPath, setRepoPath] = useState('');
  const [repoName, setRepoName] = useState('');
  const [repoAccess, setRepoAccess] = useState<'rw' | 'ro'>('rw');
  const [detachRepoName, setDetachRepoName] = useState('');

  useEffect(() => {
    if (!selectedProject) return;

    setEditName(selectedProject.name);
    setEditDescription(selectedProject.description ?? '');

    const selectedRuntime =
      (runtimeRole === 'validator'
        ? selectedProject.runtime_defaults?.validator
        : selectedProject.runtime_defaults?.worker) ?? selectedProject.runtime;
    setRuntimeAdapter(selectedRuntime?.adapter_name ?? 'opencode');
    setRuntimeBinary(selectedRuntime?.binary_path ?? 'opencode');
    setRuntimeModel(selectedRuntime?.model ?? '');
    setRuntimeArgs(selectedRuntime?.args.join(' ') ?? '');
    setRuntimeEnv(
      Object.entries(selectedRuntime?.env ?? {})
        .map(([key, value]) => `${key}=${value}`)
        .join('\n'),
    );
    setRuntimeTimeout(String(selectedRuntime?.timeout_ms ?? 600000));
    setRuntimeMaxParallel(String(selectedRuntime?.max_parallel_tasks ?? 1));

    setDetachRepoName(selectedProject.repositories[0]?.name ?? '');
  }, [selectedProject, runtimeRole]);

  const runAction = async (label: string, action: () => Promise<void>) => {
    setBusyAction(label);
    try {
      await action();
      addNotification({
        type: 'success',
        title: 'Project updated',
        message: `${label} completed successfully`,
      });
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

  const parseArgs = (raw: string): string[] =>
    raw
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean);

  const parseEnv = (raw: string): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const idx = trimmed.indexOf('=');
      if (idx <= 0) continue;
      out[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
    }
    return out;
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Projects"
        subtitle="Manage your orchestration projects"
        actions={
          <Button
            variant="secondary"
            loading={busyAction === 'Refresh state'}
            onClick={() => runAction('Refresh state', async () => refreshFromApi())}
          >
            Refresh
          </Button>
        }
      />

      <Card variant="outlined" className={styles.opsPanel}>
        <div className={styles.opsHeaderRow}>
          <Text variant="h4">Project operations</Text>
          {apiError && <Text variant="caption" color="warning">{apiError}</Text>}
        </div>

        <div className={styles.opsGrid}>
          <section className={styles.opsSection}>
            <Text variant="overline" color="muted">Create</Text>
            <input
              className={styles.opInput}
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
            <textarea
              className={styles.opTextarea}
              placeholder="Description (optional)"
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
            />
            <Button
              variant="primary"
              icon={<Plus size={14} />}
              loading={busyAction === 'Create project'}
              disabled={!newProjectName.trim()}
              onClick={() =>
                runAction('Create project', async () => {
                  await createProject({
                    name: newProjectName.trim(),
                    description: newProjectDescription.trim() || undefined,
                  });
                  setNewProjectName('');
                  setNewProjectDescription('');
                })
              }
            >
              Create project
            </Button>
          </section>

          <section className={styles.opsSection}>
            <Text variant="overline" color="muted">Edit selected</Text>
            <input
              className={styles.opInput}
              placeholder="Project name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={!selectedProject}
            />
            <textarea
              className={styles.opTextarea}
              placeholder="Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              disabled={!selectedProject}
            />
            <Button
              variant="secondary"
              loading={busyAction === 'Update project'}
              disabled={!selectedProject}
              onClick={() =>
                runAction('Update project', async () => {
                  if (!selectedProject) return;
                  await updateProject({
                    project: selectedProject.id,
                    name: editName.trim() || undefined,
                    description: editDescription.trim() || undefined,
                  });
                })
              }
            >
              Save metadata
            </Button>
          </section>

          <section className={styles.opsSection}>
            <Text variant="overline" color="muted">Runtime</Text>
            <input
              className={styles.opInput}
              placeholder="Adapter"
              value={runtimeAdapter}
              onChange={(e) => setRuntimeAdapter(e.target.value)}
              disabled={!selectedProject}
            />
            <input
              className={styles.opInput}
              placeholder="Binary path"
              value={runtimeBinary}
              onChange={(e) => setRuntimeBinary(e.target.value)}
              disabled={!selectedProject}
            />
            <select
              className={styles.opInput}
              value={runtimeRole}
              onChange={(e) => setRuntimeRole(e.target.value as 'worker' | 'validator')}
              disabled={!selectedProject}
            >
              <option value="worker">worker runtime</option>
              <option value="validator">validator runtime</option>
            </select>
            <input
              className={styles.opInput}
              placeholder="Model (optional)"
              value={runtimeModel}
              onChange={(e) => setRuntimeModel(e.target.value)}
              disabled={!selectedProject}
            />
            <input
              className={styles.opInput}
              placeholder="Args (space separated)"
              value={runtimeArgs}
              onChange={(e) => setRuntimeArgs(e.target.value)}
              disabled={!selectedProject}
            />
            <textarea
              className={styles.opTextarea}
              placeholder="Env (KEY=VALUE per line)"
              value={runtimeEnv}
              onChange={(e) => setRuntimeEnv(e.target.value)}
              disabled={!selectedProject}
            />
            <input
              className={styles.opInput}
              placeholder="Timeout ms"
              value={runtimeTimeout}
              onChange={(e) => setRuntimeTimeout(e.target.value)}
              disabled={!selectedProject}
            />
            <input
              className={styles.opInput}
              placeholder="Max parallel tasks"
              value={runtimeMaxParallel}
              onChange={(e) => setRuntimeMaxParallel(e.target.value)}
              disabled={!selectedProject}
            />
            <Button
              variant="secondary"
              loading={busyAction === 'Configure runtime'}
              disabled={!selectedProject}
              onClick={() =>
                runAction('Configure runtime', async () => {
                  if (!selectedProject) return;
                  await setProjectRuntime({
                    project: selectedProject.id,
                    role: runtimeRole,
                    adapter: runtimeAdapter.trim() || undefined,
                    binary_path: runtimeBinary.trim() || undefined,
                    model: runtimeModel.trim() || undefined,
                    args: parseArgs(runtimeArgs),
                    env: parseEnv(runtimeEnv),
                    timeout_ms: Number(runtimeTimeout) || 600000,
                    max_parallel_tasks: Math.max(Number(runtimeMaxParallel) || 1, 1),
                  });
                })
              }
            >
              Save runtime
            </Button>
          </section>

          <section className={styles.opsSection}>
            <Text variant="overline" color="muted">Repositories</Text>
            <input
              className={styles.opInput}
              placeholder="Absolute repo path"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              disabled={!selectedProject}
            />
            <input
              className={styles.opInput}
              placeholder="Repo name (optional)"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              disabled={!selectedProject}
            />
            <select
              className={styles.opInput}
              value={repoAccess}
              onChange={(e) => setRepoAccess(e.target.value as 'rw' | 'ro')}
              disabled={!selectedProject}
            >
              <option value="rw">readwrite</option>
              <option value="ro">readonly</option>
            </select>
            <Button
              variant="secondary"
              loading={busyAction === 'Attach repository'}
              disabled={!selectedProject || !repoPath.trim()}
              onClick={() =>
                runAction('Attach repository', async () => {
                  if (!selectedProject) return;
                  await attachProjectRepo({
                    project: selectedProject.id,
                    path: repoPath.trim(),
                    name: repoName.trim() || undefined,
                    access: repoAccess,
                  });
                  setRepoPath('');
                  setRepoName('');
                })
              }
            >
              Attach repo
            </Button>

            <select
              className={styles.opInput}
              value={detachRepoName}
              onChange={(e) => setDetachRepoName(e.target.value)}
              disabled={!selectedProject || selectedProject.repositories.length === 0}
            >
              {selectedProject?.repositories.map((repo) => (
                <option key={repo.name} value={repo.name}>{repo.name}</option>
              ))}
            </select>
            <Button
              variant="danger"
              loading={busyAction === 'Detach repository'}
              disabled={!selectedProject || !detachRepoName}
              onClick={() =>
                runAction('Detach repository', async () => {
                  if (!selectedProject || !detachRepoName) return;
                  await detachProjectRepo({
                    project: selectedProject.id,
                    repo_name: detachRepoName,
                  });
                })
              }
            >
              Detach repo
            </Button>
          </section>
        </div>
      </Card>

      <motion.div variants={stagger} initial="hidden" animate="show">
        <Grid columns={3} gap={4} className={styles.projectGrid}>
          {projects.map((project) => {
            const taskCount = tasks.filter(
              (t) => t.project_id === project.id && t.state === 'open'
            ).length;
            const graphCount = graphs.filter(
              (g) => g.project_id === project.id
            ).length;
            const flowCount = flows.filter(
              (f) =>
                f.project_id === project.id &&
                (f.state === 'running' || f.state === 'paused')
            ).length;

            const isActive = selectedProjectId === project.id;

            return (
              <motion.div key={project.id} variants={fadeInUp}>
                <Card
                  variant="elevated"
                  hoverable
                  padding="none"
                  className={`${styles.projectCard} ${isActive ? styles.active : ''}`}
                  onClick={() => {
                    setSelectedProject(project.id);
                    navigate(`/projects/${project.id}`);
                  }}
                >
                  <div className={styles.cardContent}>
                    {/* Header: icon + menu */}
                    <div className={styles.cardHeader}>
                      <IconBox size="xl" color="var(--void)" bg="linear-gradient(135deg, var(--accent-500) 0%, var(--accent-600) 100%)">
                        <FolderKanban size={24} />
                      </IconBox>
                      <button className={styles.menuBtn}>
                        <MoreVertical size={16} />
                      </button>
                    </div>

                    {/* Name + description */}
                    <Stack gap={1}>
                      <Text variant="h4">{project.name}</Text>
                      <Text variant="body-sm" color="tertiary">
                        {project.description ?? 'No description'}
                      </Text>
                    </Stack>

                    {/* Stats row */}
                    <Stack direction="row" gap={4} className={styles.projectStats}>
                      <div className={styles.stat}>
                        <ListTodo size={14} />
                        <span>{taskCount} open tasks</span>
                      </div>
                      <div className={styles.stat}>
                        <GitFork size={14} />
                        <span>{graphCount} graphs</span>
                      </div>
                      <div className={styles.stat}>
                        <Play size={14} />
                        <span>{flowCount} active flows</span>
                      </div>
                    </Stack>

                    {/* Repositories */}
                    <div className={styles.repositories}>
                      <Text variant="overline" color="muted">Repositories</Text>
                      <div className={styles.repoList}>
                        {project.repositories.map((repo) => (
                          <div key={repo.path} className={styles.repoItem}>
                            <Stack direction="row" gap={2} align="center">
                              <GitBranch size={12} style={{ color: 'var(--text-muted)' }} />
                              <Text variant="mono-sm" color="secondary">{repo.name}</Text>
                            </Stack>
                            <Badge
                              variant={repo.access_mode === 'readwrite' ? 'amber' : 'default'}
                              size="sm"
                            >
                              {repo.access_mode}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Runtime config */}
                    <div className={styles.cardFooter}>
                      <Stack direction="row" gap={2} align="center">
                        {project.runtime ? (
                          <>
                            <Terminal size={12} style={{ color: 'var(--accent-500)' }} />
                            <Text variant="caption" color="accent">{project.runtime.adapter_name}</Text>
                          </>
                        ) : (
                          <>
                            <Power size={12} style={{ color: 'var(--text-muted)' }} />
                            <Text variant="caption" color="muted">No runtime</Text>
                          </>
                        )}
                      </Stack>
                      <Stack direction="row" gap={1} align="center">
                        <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                        <Text variant="caption" color="muted">
                          {new Date(project.updated_at).toLocaleDateString()}
                        </Text>
                      </Stack>
                    </div>
                  </div>

                  {isActive && <div className={styles.activeIndicator} />}
                </Card>
              </motion.div>
            );
          })}

          {/* Create New Project placeholder */}
          <motion.div variants={fadeInUp}>
            <Card variant="outlined" className={styles.newProjectCard}>
              <div className={styles.newProjectContent}>
                <div className={styles.newProjectIcon}>
                  <Plus size={32} />
                </div>
                <Text variant="body" weight={600}>Create New Project</Text>
                <Text variant="body-sm" color="tertiary">Start orchestrating a new codebase</Text>
              </div>
            </Card>
          </motion.div>
        </Grid>
      </motion.div>
    </div>
  );
}
