import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  GitBranch,
  ListTodo,
  ExternalLink,
  MoreVertical,
  Archive,
  Settings,
} from 'lucide-react';
import { useHivemindStore } from '../stores/hivemindStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import styles from './Projects.module.css';

// ═══════════════════════════════════════════════════════════════════════════
// PROJECTS PAGE
// Project listing and management
// ═══════════════════════════════════════════════════════════════════════════

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

export function Projects() {
  const { projects, setSelectedProject, selectedProjectId } = useHivemindStore();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Projects</h1>
          <p>Manage your orchestration projects</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />}>
          New Project
        </Button>
      </header>

      <motion.div
        className={styles.projectGrid}
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {projects.map((project) => (
          <motion.div key={project.id} variants={fadeInUp}>
            <Card
              variant="elevated"
              hoverable
              padding="none"
              className={`${styles.projectCard} ${selectedProjectId === project.id ? styles.active : ''}`}
              onClick={() => setSelectedProject(project.id)}
            >
              <div className={styles.cardContent}>
                <div className={styles.cardHeader}>
                  <div className={styles.projectIcon}>
                    <FolderKanban size={24} />
                  </div>
                  <button className={styles.menuBtn}>
                    <MoreVertical size={16} />
                  </button>
                </div>

                <div className={styles.projectInfo}>
                  <h3 className={styles.projectName}>{project.name}</h3>
                  <p className={styles.projectDesc}>{project.description}</p>
                </div>

                <div className={styles.projectStats}>
                  <div className={styles.stat}>
                    <ListTodo size={14} />
                    <span>{project.taskCount} tasks</span>
                  </div>
                  <div className={styles.stat}>
                    <GitBranch size={14} />
                    <span>{project.activeFlowCount} flows</span>
                  </div>
                </div>

                <div className={styles.repositories}>
                  <span className={styles.repoLabel}>Repositories</span>
                  <div className={styles.repoList}>
                    {project.repositories.map((repo) => (
                      <div key={repo.id} className={styles.repoItem}>
                        <span className={styles.repoName}>{repo.name}</span>
                        <Badge
                          variant={repo.accessMode === 'rw' ? 'amber' : 'default'}
                          size="sm"
                        >
                          {repo.accessMode.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.updatedAt}>
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                  <div className={styles.actions}>
                    <Link to={`/projects/${project.id}`} className={styles.actionBtn}>
                      <ExternalLink size={14} />
                    </Link>
                    <button className={styles.actionBtn}>
                      <Settings size={14} />
                    </button>
                    <button className={styles.actionBtn}>
                      <Archive size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {selectedProjectId === project.id && (
                <div className={styles.activeIndicator} />
              )}
            </Card>
          </motion.div>
        ))}

        {/* New Project Card */}
        <motion.div variants={fadeInUp}>
          <Card variant="outlined" className={styles.newProjectCard}>
            <div className={styles.newProjectContent}>
              <div className={styles.newProjectIcon}>
                <Plus size={32} />
              </div>
              <span className={styles.newProjectText}>Create New Project</span>
              <p className={styles.newProjectDesc}>
                Start orchestrating a new codebase
              </p>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
