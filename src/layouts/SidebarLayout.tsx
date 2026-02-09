import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Hexagon } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { CommandPalette } from '../components/CommandPalette';
import { useHivemindStore } from '../stores/hivemindStore';
import styles from './SidebarLayout.module.css';
import { useEffect } from 'react';

export function SidebarLayout() {
  const { sidebarCollapsed, mobileMenuOpen, toggleMobileMenu, closeMobileMenu } =
    useHivemindStore();
  const location = useLocation();

  // Close mobile menu on navigation
  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname, closeMobileMenu]);

  return (
    <div className={styles.layout}>
      {/* Mobile top bar */}
      <div className={styles.mobileBar}>
        <button
          className={styles.hamburger}
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className={styles.mobileBrand}>
          <Hexagon size={20} strokeWidth={1.5} />
          <span>Hivemind</span>
        </div>
        <div className={styles.mobileSpacer} />
      </div>

      {/* Backdrop for mobile sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeMobileMenu}
          />
        )}
      </AnimatePresence>

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
