import { useState, createContext, useContext, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import styles from './TabPanel.module.css';

type TabContextValue = {
  activeTab: string;
  setActiveTab: (id: string) => void;
};

const TabContext = createContext<TabContextValue | null>(null);

function useTabContext() {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error('Tab components must be used within TabPanel');
  return ctx;
}

type TabPanelProps = {
  defaultTab?: string;
  value?: string;
  onTabChange?: (id: string) => void;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
};

export function TabPanel({ defaultTab, value, onTabChange, children, className = '', variant = 'default' }: TabPanelProps) {
  const [internalActive, setInternalActive] = useState(() => defaultTab ?? '');
  const activeTab = value !== undefined ? value : internalActive;

  const handleSetActiveTab = (id: string) => {
    onTabChange?.(id);
    if (value === undefined) {
      setInternalActive(id);
    }
  };

  return (
    <TabContext.Provider value={{ activeTab, setActiveTab: handleSetActiveTab }}>
      <div className={`${styles.tabPanel} ${styles[variant]} ${className}`}>
        {children}
      </div>
    </TabContext.Provider>
  );
}

type TabListProps = {
  children: ReactNode;
  className?: string;
};

export function TabList({ children, className = '' }: TabListProps) {
  return (
    <div className={`${styles.tabList} ${className}`} role="tablist">
      {children}
    </div>
  );
}

type TabProps = {
  id: string;
  children: ReactNode;
  icon?: ReactNode;
  badge?: string | number;
  disabled?: boolean;
};

export function Tab({ id, children, icon, badge, disabled = false }: TabProps) {
  const { activeTab, setActiveTab } = useTabContext();
  const isActive = activeTab === id;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${id}`}
      className={`${styles.tab} ${isActive ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
      onClick={() => !disabled && setActiveTab(id)}
      disabled={disabled}
    >
      {icon && <span className={styles.tabIcon}>{icon}</span>}
      <span className={styles.tabLabel}>{children}</span>
      {badge !== undefined && (
        <span className={styles.tabBadge}>{badge}</span>
      )}
      {isActive && (
        <motion.div
          className={styles.activeIndicator}
          layoutId="tab-indicator"
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}
    </button>
  );
}

type TabContentProps = {
  id: string;
  children: ReactNode;
  className?: string;
};

export function TabContent({ id, children, className = '' }: TabContentProps) {
  const { activeTab } = useTabContext();
  const isActive = activeTab === id;

  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key={id}
          id={`tabpanel-${id}`}
          role="tabpanel"
          aria-labelledby={id}
          className={`${styles.tabContent} ${className}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
