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
  Hexagon,
  Search,
  Palette,
} from 'lucide-react';
import { useHivemindStore } from '../stores/hivemindStore';
import styles from './TopNav.module.css';

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

export function TopNav() {
  const location = useLocation();
  const { toggleCommandPalette, notifications } = useHivemindStore();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className={styles.topNav}>
      <div className={styles.left}>
        <div className={styles.brand}>
          <Hexagon className={styles.logo} strokeWidth={1.5} />
          <span className={styles.brandText}>Hivemind</span>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <item.icon size={16} strokeWidth={1.5} />
              <span>{item.label}</span>
              {item.path === location.pathname && (
                <motion.div
                  className={styles.activeBar}
                  layoutId="topNavActive"
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className={styles.right}>
        <button className={styles.searchBtn} onClick={toggleCommandPalette}>
          <Search size={16} />
          <span className={styles.searchLabel}>Search</span>
          <kbd className={styles.kbd}>⌘K</kbd>
        </button>
        <NavLink to="/notifications" className={styles.iconBtn}>
          <Bell size={18} />
          {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
        </NavLink>
        <NavLink to="/settings" className={styles.iconBtn}>
          <Settings size={18} />
        </NavLink>
      </div>
    </header>
  );
}
