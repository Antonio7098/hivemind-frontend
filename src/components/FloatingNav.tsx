import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Network,
  Play,
  Activity,
  GitMerge,
  Settings,
  Bell,
  Search,
  Palette,
} from 'lucide-react';
import { useHivemindStore } from '../stores/hivemindStore';
import styles from './FloatingNav.module.css';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/projects', icon: FolderKanban, label: 'Projects' },
  { path: '/tasks', icon: ListTodo, label: 'Tasks' },
  { path: '/graphs', icon: Network, label: 'Graphs' },
  { path: '/flows', icon: Play, label: 'Flows' },
  { path: '/merges', icon: GitMerge, label: 'Merges' },
  { path: '/events', icon: Activity, label: 'Events' },
  { path: '/themes', icon: Palette, label: 'Themes' },
];

export function FloatingNav() {
  const location = useLocation();
  const { toggleCommandPalette, notifications } = useHivemindStore();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <motion.nav
      className={styles.dock}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.pills}>
        {navItems.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`${styles.pill} ${isActive ? styles.active : ''}`}
              title={item.label}
            >
              <item.icon size={18} strokeWidth={1.5} />
              {isActive && (
                <motion.span
                  className={styles.pillLabel}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {item.label}
                </motion.span>
              )}
              {isActive && (
                <motion.div
                  className={styles.activeBg}
                  layoutId="floatingActive"
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
            </NavLink>
          );
        })}

        <div className={styles.separator} />

        <button className={styles.pill} onClick={toggleCommandPalette} title="Search">
          <Search size={18} />
        </button>
        <NavLink to="/notifications" className={styles.pill} title="Notifications">
          <Bell size={18} />
          {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
        </NavLink>
        <NavLink to="/settings" className={styles.pill} title="Settings">
          <Settings size={18} />
        </NavLink>
      </div>
    </motion.nav>
  );
}
