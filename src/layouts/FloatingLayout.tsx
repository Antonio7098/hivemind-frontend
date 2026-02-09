import { Outlet } from 'react-router-dom';
import { FloatingNav } from '../components/FloatingNav';
import { CommandPalette } from '../components/CommandPalette';
import styles from './FloatingLayout.module.css';

export function FloatingLayout() {
  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
      <FloatingNav />
      <CommandPalette />
    </div>
  );
}
