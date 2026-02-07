import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  GitBranch,
  Activity,
  Settings,
  ChevronLeft,
  Hexagon,
  Bell,
  Search,
} from 'lucide-react';
import { useHivemindStore } from '../stores/hivemindStore';
import { StatusIndicator } from './StatusIndicator';
import styles from './Sidebar.module.css';

// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR COMPONENT
// Main navigation with project context and runtime status
// ═══════════════════════════════════════════════════════════════════════════

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/projects', icon: FolderKanban, label: 'Projects' },
  { path: '/tasks', icon: ListTodo, label: 'Tasks' },
  { path: '/flows', icon: GitBranch, label: 'TaskFlows' },
  { path: '/events', icon: Activity, label: 'Events' },
];

export function Sidebar() {
  const location = useLocation();
  const {
    sidebarCollapsed,
    toggleSidebar,
    toggleCommandPalette,
    runtimes,
    notifications,
    selectedProjectId,
    projects,
  } = useHivemindStore();

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <motion.aside
      className={styles.sidebar}
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Logo & Branding */}
      <div className={styles.header}>
        <div className={styles.logo}>
          <Hexagon className={styles.logoIcon} strokeWidth={1.5} />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                className={styles.logoText}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
              >
                Hivemind
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button
          className={styles.collapseBtn}
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <motion.div
            animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
            transition={{ duration: 0.25 }}
          >
            <ChevronLeft size={18} />
          </motion.div>
        </button>
      </div>

      {/* Command Palette Trigger */}
      <button className={styles.searchBtn} onClick={toggleCommandPalette}>
        <Search size={16} />
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={styles.searchLabel}
            >
              Search...
            </motion.span>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.kbd
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={styles.shortcut}
            >
              ⌘K
            </motion.kbd>
          )}
        </AnimatePresence>
      </button>

      {/* Active Project */}
      {selectedProject && !sidebarCollapsed && (
        <div className={styles.projectContext}>
          <span className={styles.projectLabel}>Active Project</span>
          <span className={styles.projectName}>{selectedProject.name}</span>
        </div>
      )}

      {/* Navigation */}
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <item.icon size={20} strokeWidth={1.5} />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className={styles.navLabel}
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
            {item.path === location.pathname && (
              <motion.div
                className={styles.activeIndicator}
                layoutId="activeNav"
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Runtime Status */}
      <div className={styles.runtimeSection}>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={styles.sectionLabel}
            >
              Runtimes
            </motion.span>
          )}
        </AnimatePresence>
        <div className={styles.runtimes}>
          {runtimes.map((runtime) => (
            <div key={runtime.id} className={styles.runtimeItem}>
              <StatusIndicator status={runtime.status} size="sm" />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={styles.runtimeName}
                  >
                    {runtime.name}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <NavLink
          to="/notifications"
          className={`${styles.footerBtn} ${unreadCount > 0 ? styles.hasNotif : ''}`}
        >
          <Bell size={18} />
          {unreadCount > 0 && <span className={styles.notifBadge}>{unreadCount}</span>}
        </NavLink>
        <NavLink to="/settings" className={styles.footerBtn}>
          <Settings size={18} />
        </NavLink>
      </div>
    </motion.aside>
  );
}
