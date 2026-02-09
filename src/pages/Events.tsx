import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Pause,
  Play,
  Download,
  Zap,
  Shield,
  FileText,
  Terminal,
  FolderKanban,
  ListTodo,
  Network,
  GitMerge,
} from 'lucide-react';
import { useHivemindStore } from '../stores/hivemindStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/composites/PageHeader';
import { FilterBar } from '../components/composites/FilterBar';
import { LiveIndicator } from '../components/composites/LiveIndicator';
import { KeyValueGrid } from '../components/composites/KeyValueGrid';
import type { HivemindEvent, EventCategory, CorrelationIds } from '../types';
import styles from './Events.module.css';

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY CONFIG — icon + color per EventCategory
// ═══════════════════════════════════════════════════════════════════════════

const categoryConfig: Record<EventCategory, { icon: typeof Zap; color: string }> = {
  project:      { icon: FolderKanban, color: 'var(--text-tertiary)' },
  task:         { icon: ListTodo,     color: 'var(--status-info)' },
  graph:        { icon: Network,      color: 'var(--accent-400)' },
  flow:         { icon: Play,         color: 'var(--state-running)' },
  execution:    { icon: Zap,          color: 'var(--accent-500)' },
  verification: { icon: Shield,       color: 'var(--state-verifying)' },
  merge:        { icon: GitMerge,     color: 'var(--state-success)' },
  runtime:      { icon: Terminal,     color: 'var(--text-secondary)' },
  filesystem:   { icon: FileText,     color: 'var(--text-tertiary)' },
};

// ═══════════════════════════════════════════════════════════════════════════
// SEVERITY — derived from EventType string keywords
// ═══════════════════════════════════════════════════════════════════════════

const getEventSeverity = (event: HivemindEvent): 'info' | 'warning' | 'error' | 'success' => {
  const t = event.type;
  if (/Error|Failed|Aborted|Violated/.test(t)) return 'error';
  if (/Retry|Paused|Blocked/.test(t)) return 'warning';
  if (/Completed|Success|Approved/.test(t)) return 'success';
  return 'info';
};

// ═══════════════════════════════════════════════════════════════════════════
// CORRELATION LABEL MAP — snake_case field → display label
// ═══════════════════════════════════════════════════════════════════════════

const correlationLabels: Record<keyof CorrelationIds, string> = {
  project_id: 'Project',
  graph_id:   'Graph',
  flow_id:    'Flow',
  task_id:    'Task',
  attempt_id: 'Attempt',
};

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS PAGE
// ═══════════════════════════════════════════════════════════════════════════

export function Events() {
  const { events, eventStreamPaused, toggleEventStream } = useHivemindStore();
  const [selectedCategories, setSelectedCategories] = useState<Set<EventCategory>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<HivemindEvent | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ─── Filtering ─────────────────────────────────────────────────────────
  const filteredEvents = selectedCategories.size > 0
    ? events.filter((e) => selectedCategories.has(e.category))
    : events;

  const toggleCategory = (id: string) => {
    const category = id as EventCategory;
    const next = new Set(selectedCategories);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    setSelectedCategories(next);
  };

  // Auto-scroll to top when new events arrive (while not paused)
  useEffect(() => {
    if (!eventStreamPaused && listRef.current) listRef.current.scrollTop = 0;
  }, [events, eventStreamPaused]);

  // ─── Filter Chips ──────────────────────────────────────────────────────
  const filterChips = (Object.keys(categoryConfig) as EventCategory[]).map((cat) => {
    const Icon = categoryConfig[cat].icon;
    return {
      id: cat,
      label: cat,
      icon: <Icon size={12} />,
      active: selectedCategories.has(cat),
    };
  });

  // ─── Export handler ────────────────────────────────────────────────────
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hivemind-events-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Event Stream"
        subtitle="Real-time observability into system behavior"
        actions={
          <>
            <Button
              variant={eventStreamPaused ? 'primary' : 'secondary'}
              icon={eventStreamPaused ? <Play size={16} /> : <Pause size={16} />}
              onClick={toggleEventStream}
            >
              {eventStreamPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button variant="secondary" icon={<Download size={16} />} onClick={handleExport}>
              Export
            </Button>
          </>
        }
      />

      <FilterBar
        label="Filter by category:"
        chips={filterChips}
        onToggle={toggleCategory}
      />

      <div className={styles.content}>
        {/* ─── Left: Event List ─────────────────────────────────────────── */}
        <div className={styles.eventListContainer}>
          <div className={styles.listHeader}>
            <LiveIndicator live={!eventStreamPaused} />
            <span className={styles.eventCount}>{filteredEvents.length} events</span>
          </div>

          <div className={styles.eventList} ref={listRef}>
            <AnimatePresence initial={false}>
              {filteredEvents.map((event, index) => {
                const config = categoryConfig[event.category];
                const severity = getEventSeverity(event);
                const Icon = config.icon;
                return (
                  <motion.div
                    key={event.id}
                    className={`${styles.eventItem} ${styles[severity]} ${selectedEvent?.id === event.id ? styles.selected : ''}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02, duration: 0.2 }}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className={styles.eventIcon} style={{ color: config.color }}>
                      <Icon size={16} />
                    </div>
                    <div className={styles.eventContent}>
                      <div className={styles.eventTop}>
                        <span className={styles.eventType}>{event.type}</span>
                        <span className={styles.eventTime}>
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className={styles.eventBottom}>
                        <Badge variant="default" size="sm">{event.category}</Badge>
                        {event.sequence !== null && (
                          <span className={styles.eventSequence}>#{event.sequence}</span>
                        )}
                      </div>
                    </div>
                    <div className={`${styles.severityIndicator} ${styles[severity]}`} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* ─── Right: Event Detail Panel ───────────────────────────────── */}
        <AnimatePresence>
          {selectedEvent && (
            <motion.div
              className={styles.eventDetail}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card variant="elevated" padding="none">
                <div className={styles.detailHeader}>
                  <h3>{selectedEvent.type}</h3>
                  <button className={styles.closeBtn} onClick={() => setSelectedEvent(null)}>
                    &times;
                  </button>
                </div>
                <div className={styles.detailContent}>
                  {/* Event Info */}
                  <div className={styles.detailSection}>
                    <h4>Event Info</h4>
                    <KeyValueGrid
                      items={[
                        { label: 'ID', value: selectedEvent.id },
                        { label: 'Type', value: selectedEvent.type },
                        { label: 'Category', value: selectedEvent.category },
                        { label: 'Timestamp', value: new Date(selectedEvent.timestamp).toLocaleString() },
                        { label: 'Sequence', value: selectedEvent.sequence ?? 'N/A' },
                      ]}
                    />
                  </div>

                  {/* Correlation IDs — only non-null values */}
                  {Object.values(selectedEvent.correlation).some((v) => v !== null) && (
                    <div className={styles.detailSection}>
                      <h4>Correlation IDs</h4>
                      <div className={styles.correlations}>
                        {(Object.keys(selectedEvent.correlation) as (keyof CorrelationIds)[]).map(
                          (key) => {
                            const value = selectedEvent.correlation[key];
                            if (value === null) return null;
                            return (
                              <div key={key} className={styles.correlation}>
                                <span className={styles.corrKey}>{correlationLabels[key]}</span>
                                <Badge variant="amber" size="sm">{value}</Badge>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}

                  {/* Payload */}
                  <div className={styles.detailSection}>
                    <h4>Payload</h4>
                    <pre className={styles.payload}>
                      {JSON.stringify(selectedEvent.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
