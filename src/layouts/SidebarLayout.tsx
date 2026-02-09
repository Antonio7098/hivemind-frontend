import { Outlet } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sidebar } from '../components/Sidebar';
import { CommandPalette } from '../components/CommandPalette';
import { useHivemindStore } from '../stores/hivemindStore';
import styles from './SidebarLayout.module.css';

export function SidebarLayout() {
  const { sidebarCollapsed } = useHivemindStore();

  return (
    <div className={styles.layout}>
      <Sidebar />
      <motion.main
        className={styles.main}
        animate={{ marginLeft: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.content}>
          <Outlet />
        </div>
      </motion.main>
      <CommandPalette />
    </div>
  );
}
