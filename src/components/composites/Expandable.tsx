import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import styles from './Expandable.module.css';

type ExpandableProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'card' | 'minimal';
  trailing?: ReactNode;
};

export function Expandable({
  title,
  subtitle,
  icon,
  badge,
  defaultOpen = false,
  children,
  className = '',
  variant = 'default',
  trailing,
}: ExpandableProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`${styles.expandable} ${styles[variant]} ${isOpen ? styles.open : ''} ${className}`}>
      <button
        className={styles.header}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <motion.span
          className={styles.chevron}
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight size={16} />
        </motion.span>
        
        {icon && <span className={styles.icon}>{icon}</span>}
        
        <div className={styles.titleGroup}>
          <span className={styles.title}>{title}</span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </div>
        
        {badge && <span className={styles.badge}>{badge}</span>}
        {trailing && <span className={styles.trailing}>{trailing}</span>}
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            className={styles.content}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className={styles.contentInner}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type ExpandableGroupProps = {
  children: ReactNode;
  className?: string;
  accordion?: boolean;
};

export function ExpandableGroup({ children, className = '', accordion = false }: ExpandableGroupProps) {
  return (
    <div className={`${styles.group} ${accordion ? styles.accordion : ''} ${className}`}>
      {children}
    </div>
  );
}
