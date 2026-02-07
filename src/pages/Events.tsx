import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Pause,
  Play,
  Download,
  Zap,
  GitBranch,
  Shield,
  CheckCircle2,
  User,
  Settings,
  FileText,
  Terminal,
} from 'lucide-react';
import { useHivemindStore } from '../stores/hivemindStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import type { HivemindEvent, EventCategory } from '../types';
import styles from './Events.module.css';

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS PAGE
// Live event stream with filtering
// ═══════════════════════════════════════════════════════════════════════════

const categoryConfig: Record<EventCategory, { icon: typeof Activity; color: string }> = {
  project: { icon: FileText, color: 'var(--text-tertiary)' },
  taskgraph: { icon: GitBranch, color: 'var(--status-info)' },
  taskflow: { icon: GitBranch, color: 'var(--amber-400)' },
  task: { icon: Zap, color: 'var(--status-info)' },
  attempt: { icon: Play, color: 'var(--state-running)' },
  agent: { icon: Terminal, color: 'var(--state-verifying)' },
  runtime: { icon: Settings, color: 'var(--text-secondary)' },
  scope: { icon: Shield, color: 'var(--status-warning)' },
  filesystem: { icon: FileText, color: 'var(--text-tertiary)' },
  verification: { icon: CheckCircle2, color: 'var(--state-verifying)' },
  merge: { icon: GitBranch, color: 'var(--state-success)' },
  human: { icon: User, color: 'var(--amber-500)' },
};

const getEventSeverity = (event: HivemindEvent): 'info' | 'warning' | 'error' | 'success' => {
  if (event.type.includes('Failed') || event.type.includes('Error') || event.type.includes('Violation')) {
    return 'error';
  }
  if (event.type.includes('Escalated') || event.type.includes('Warning') || event.type.includes('Degraded')) {
    return 'warning';
  }
  if (event.type.includes('Success') || event.type.includes('Completed') || event.type.includes('Passed')) {
    return 'success';
  }
  return 'info';
};

export function Events() {
  const { events, eventStreamPaused, toggleEventStream } = useHivemindStore();
  const [selectedCategories, setSelectedCategories] = useState<Set<EventCategory>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<HivemindEvent | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredEvents = selectedCategories.size > 0
    ? events.filter((e) => selectedCategories.has(e.category))
    : events;

  const toggleCategory = (category: EventCategory) => {
    const newSet = new Set(selectedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setSelectedCategories(newSet);
  };

  // Auto-scroll when new events arrive (if not paused)
  useEffect(() => {
    if (!eventStreamPaused && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [events, eventStreamPaused]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Event Stream</h1>
          <p>Real-time observability into system behavior</p>
        </div>
        <div className={styles.actions}>
          <Button
            variant={eventStreamPaused ? 'primary' : 'secondary'}
            icon={eventStreamPaused ? <Play size={16} /> : <Pause size={16} />}
            onClick={toggleEventStream}
          >
            {eventStreamPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="secondary" icon={<Download size={16} />}>
            Export
          </Button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <span className={styles.filterLabel}>Filter by category:</span>
        <div className={styles.filterChips}>
          {(Object.keys(categoryConfig) as EventCategory[]).map((category) => {
            const config = categoryConfig[category];
            const isActive = selectedCategories.has(category);
            return (
              <button
                key={category}
                className={`${styles.filterChip} ${isActive ? styles.active : ''}`}
                onClick={() => toggleCategory(category)}
              >
                <config.icon size={12} />
                <span>{category}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.content}>
        {/* Event List */}
        <div className={styles.eventListContainer}>
          <div className={styles.listHeader}>
            <div className={styles.liveIndicator}>
              {!eventStreamPaused && (
                <>
                  <span className={styles.liveDot} />
                  <span>Live</span>
                </>
              )}
              {eventStreamPaused && (
                <>
                  <Pause size={12} />
                  <span>Paused</span>
                </>
              )}
            </div>
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
                        <Badge variant="default" size="sm">
                          {event.category}
                        </Badge>
                        <span className={styles.eventActor}>
                          {event.actor.type}: {event.actor.name || event.actor.id}
                        </span>
                      </div>
                    </div>
                    <div className={`${styles.severityIndicator} ${styles[severity]}`} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Event Detail */}
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
                  <button
                    className={styles.closeBtn}
                    onClick={() => setSelectedEvent(null)}
                  >
                    &times;
                  </button>
                </div>
                <div className={styles.detailContent}>
                  <div className={styles.detailSection}>
                    <h4>Event Info</h4>
                    <div className={styles.detailGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Event ID</span>
                        <span className={styles.detailValue}>{selectedEvent.id}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Category</span>
                        <span className={styles.detailValue}>{selectedEvent.category}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Timestamp</span>
                        <span className={styles.detailValue}>
                          {new Date(selectedEvent.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Actor</span>
                        <span className={styles.detailValue}>
                          {selectedEvent.actor.name || selectedEvent.actor.id} ({selectedEvent.actor.type})
                        </span>
                      </div>
                    </div>
                  </div>

                  {Object.keys(selectedEvent.correlations).length > 0 && (
                    <div className={styles.detailSection}>
                      <h4>Correlations</h4>
                      <div className={styles.correlations}>
                        {Object.entries(selectedEvent.correlations).map(([key, value]) =>
                          value ? (
                            <div key={key} className={styles.correlation}>
                              <span className={styles.corrKey}>{key}</span>
                              <span className={styles.corrValue}>{value}</span>
                            </div>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}

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
