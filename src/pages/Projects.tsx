import { motion } from 'motion/react';
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
import { EmptyState } from '../components/composites/EmptyState';
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
  const { projects, tasks, graphs, flows, setSelectedProject, selectedProjectId } =
    useHivemindStore();

  if (projects.length === 0) {
    return (
      <div className={styles.page}>
        <PageHeader
          title="Projects"
          actions={
            <Button variant="primary" icon={<Plus size={16} />}>New Project</Button>
          }
        />
        <EmptyState
          icon={<FolderKanban size={48} strokeWidth={1} />}
          title="No projects yet"
          description="Create your first project to start orchestrating"
          action={<Button variant="primary" icon={<Plus size={16} />}>New Project</Button>}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Projects"
        subtitle="Manage your orchestration projects"
        actions={
          <Button variant="primary" icon={<Plus size={16} />}>New Project</Button>
        }
      />

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
                  onClick={() => setSelectedProject(project.id)}
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
