import { Outlet } from 'react-router-dom';
import { TopNav } from '../components/TopNav';
import { CommandPalette } from '../components/CommandPalette';
import styles from './TopNavLayout.module.css';

export function TopNavLayout() {
  return (
    <div className={styles.layout}>
      <TopNav />
      <main className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
      <CommandPalette />
    </div>
  );
}
