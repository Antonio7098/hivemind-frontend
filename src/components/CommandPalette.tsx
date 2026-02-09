import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  GitBranch,
  Activity,
  Plus,
  Play,
  Pause,
  X,
} from 'lucide-react';
import { useHivemindStore } from '../stores/hivemindStore';
import styles from './CommandPalette.module.css';

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND PALETTE
// Quick navigation and actions with keyboard support
// ═══════════════════════════════════════════════════════════════════════════

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: typeof Search;
  shortcut?: string;
  category: string;
  action: () => void;
}

export function CommandPalette() {
  const navigate = useNavigate();
  const { commandPaletteOpen, toggleCommandPalette, projects, flows, graphs } =
    useHivemindStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const graphMap = Object.fromEntries(graphs.map((g) => [g.id, g]));

  const commands: Command[] = [
    // Navigation
    { id: 'nav-dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, category: 'Navigation', action: () => navigate('/') },
    { id: 'nav-projects', label: 'Go to Projects', icon: FolderKanban, shortcut: 'G P', category: 'Navigation', action: () => navigate('/projects') },
    { id: 'nav-tasks', label: 'Go to Tasks', icon: ListTodo, shortcut: 'G T', category: 'Navigation', action: () => navigate('/tasks') },
    { id: 'nav-flows', label: 'Go to Flows', icon: GitBranch, shortcut: 'G F', category: 'Navigation', action: () => navigate('/flows') },
    { id: 'nav-events', label: 'Go to Events', icon: Activity, shortcut: 'G E', category: 'Navigation', action: () => navigate('/events') },
    // Actions
    { id: 'action-new-project', label: 'Create New Project', icon: Plus, category: 'Actions', action: () => { navigate('/projects'); toggleCommandPalette(); } },
    { id: 'action-new-task', label: 'Create New Task', icon: Plus, category: 'Actions', action: () => { navigate('/tasks'); toggleCommandPalette(); } },
    // Projects
    ...projects.map((p) => ({
      id: `project-${p.id}`,
      label: p.name,
      description: p.description ?? undefined,
      icon: FolderKanban,
      category: 'Projects',
      action: () => navigate(`/projects/${p.id}`),
    })),
    // Flows
    ...flows.map((f) => {
      const graph = graphMap[f.graph_id];
      const execs = Object.values(f.task_executions);
      const done = execs.filter((e) => e.state === 'success').length;
      return {
        id: `flow-${f.id}`,
        label: graph?.name ?? f.id,
        description: `${f.state} - ${done}/${execs.length} tasks`,
        icon: f.state === 'running' ? Play : f.state === 'paused' ? Pause : GitBranch,
        category: 'Flows',
        action: () => navigate(`/flows/${f.id}`),
      };
    }),
  ];

  const filteredCommands = query
    ? commands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          cmd.description?.toLowerCase().includes(query.toLowerCase()) ||
          cmd.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const groupedCommands = filteredCommands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<string, Command[]>
  );

  const flatCommands = Object.values(groupedCommands).flat();

  const executeCommand = useCallback(
    (command: Command) => {
      command.action();
      toggleCommandPalette();
      setQuery('');
      setSelectedIndex(0);
    },
    [toggleCommandPalette]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!commandPaletteOpen) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          toggleCommandPalette();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % flatCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + flatCommands.length) % flatCommands.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (flatCommands[selectedIndex]) {
            executeCommand(flatCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          toggleCommandPalette();
          setQuery('');
          setSelectedIndex(0);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, toggleCommandPalette, flatCommands, selectedIndex, executeCommand]);

  // Reset selection when query changes
  

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleCommandPalette}
          />
          <motion.div
            className={styles.container}
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.searchWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Type a command or search..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                autoFocus
              />
              <button className={styles.closeBtn} onClick={toggleCommandPalette}>
                <X size={16} />
              </button>
            </div>

            <div className={styles.results}>
              {Object.entries(groupedCommands).map(([category, cmds]) => (
                <div key={category} className={styles.group}>
                  <div className={styles.groupLabel}>{category}</div>
                  {cmds.map((cmd) => {
                    const globalIndex = flatCommands.findIndex((c) => c.id === cmd.id);
                    return (
                      <button
                        key={cmd.id}
                        className={`${styles.item} ${globalIndex === selectedIndex ? styles.selected : ''}`}
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                      >
                        <cmd.icon size={16} className={styles.itemIcon} />
                        <div className={styles.itemContent}>
                          <span className={styles.itemLabel}>{cmd.label}</span>
                          {cmd.description && (
                            <span className={styles.itemDesc}>{cmd.description}</span>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <kbd className={styles.itemShortcut}>{cmd.shortcut}</kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
              {flatCommands.length === 0 && (
                <div className={styles.empty}>No results found</div>
              )}
            </div>

            <div className={styles.footer}>
              <span>
                <kbd>↑↓</kbd> Navigate
              </span>
              <span>
                <kbd>↵</kbd> Select
              </span>
              <span>
                <kbd>esc</kbd> Close
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
