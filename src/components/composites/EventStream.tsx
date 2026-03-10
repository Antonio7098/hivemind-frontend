import { type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  GitBranch,
  Play,
  Zap,
  Shield,
  Eye,
  GitMerge,
  ListChecks,
  Server,
  Layers,
  AlertCircle,
  CheckCircle,
  Clock,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { Badge } from '../Badge';
import styles from './EventStream.module.css';

type EventData = {
  id: string;
  type: string;
  category: string;
  timestamp: string;
  correlation: {
    project_id?: string | null;
    graph_id?: string | null;
    flow_id?: string | null;
    task_id?: string | null;
    attempt_id?: string | null;
  };
  payload: Record<string, unknown>;
};

type EventStreamProps = {
  events: EventData[];
  onEventClick?: (event: EventData) => void;
  maxHeight?: string;
  className?: string;
  showCorrelation?: boolean;
  compact?: boolean;
};

const CATEGORY_ICONS: Record<string, ReactNode> = {
  error: <AlertCircle size={14} />,
  task: <Zap size={14} />,
  flow: <GitBranch size={14} />,
  execution: <Play size={14} />,
  verification: <Shield size={14} />,
  scope: <Shield size={14} />,
  merge: <GitMerge size={14} />,
  graph: <Layers size={14} />,
  project: <ListChecks size={14} />,
  runtime: <Server size={14} />,
  filesystem: <Eye size={14} />,
};

const CATEGORY_COLORS: Record<string, string> = {
  error: 'var(--state-failed)',
  task: 'var(--accent-500)',
  flow: 'var(--state-running)',
  execution: 'var(--state-running)',
  verification: 'var(--state-verifying)',
  scope: 'var(--state-retry)',
  merge: 'var(--state-success)',
  graph: 'var(--text-tertiary)',
  project: 'var(--text-tertiary)',
  runtime: 'var(--state-running)',
  filesystem: 'var(--text-tertiary)',
};

function getEventIcon(type: string): ReactNode {
  if (type.includes('Failed') || type.includes('Error')) return <XCircle size={14} />;
  if (type.includes('Completed') || type.includes('Success')) return <CheckCircle size={14} />;
  if (type.includes('Started') || type.includes('Running')) return <Play size={14} />;
  if (type.includes('Retry')) return <RotateCcw size={14} />;
  if (type.includes('Pending') || type.includes('Waiting')) return <Clock size={14} />;
  return <Activity size={14} />;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}

function formatEventType(type: string): string {
  return type.replace(/([A-Z])/g, ' $1').trim();
}

export function EventStream({ 
  events, 
  onEventClick, 
  maxHeight = '400px',
  className = '',
  showCorrelation = true,
  compact = false,
}: EventStreamProps) {
  return (
    <div 
      className={`${styles.stream} ${compact ? styles.compact : ''} ${className}`}
      style={{ maxHeight }}
    >
      {events.length === 0 ? (
        <div className={styles.empty}>
          <Activity size={24} strokeWidth={1.5} />
          <span>No events yet</span>
        </div>
      ) : (
        events.map((event, index) => (
          <motion.div
            key={event.id}
            className={`${styles.event} ${onEventClick ? styles.clickable : ''}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02, duration: 0.15 }}
            onClick={() => onEventClick?.(event)}
          >
            <div 
              className={styles.indicator}
              style={{ backgroundColor: CATEGORY_COLORS[event.category] || 'var(--text-muted)' }}
            />
            
            <div className={styles.iconWrapper}>
              {CATEGORY_ICONS[event.category] || <Activity size={14} />}
            </div>
            
            <div className={styles.content}>
              <div className={styles.header}>
                <span className={styles.type}>{formatEventType(event.type)}</span>
                <Badge 
                  variant={event.category === 'error' ? 'error' : 'default'} 
                  size="sm"
                >
                  {event.category}
                </Badge>
              </div>
              
              {showCorrelation && (
                <div className={styles.correlation}>
                  {event.correlation.flow_id && (
                    <span className={styles.correlationItem}>
                      <GitBranch size={10} />
                      {event.correlation.flow_id.slice(0, 8)}
                    </span>
                  )}
                  {event.correlation.task_id && (
                    <span className={styles.correlationItem}>
                      <Zap size={10} />
                      {event.correlation.task_id.slice(0, 8)}
                    </span>
                  )}
                  {event.correlation.attempt_id && (
                    <span className={styles.correlationItem}>
                      <Play size={10} />
                      {event.correlation.attempt_id.slice(0, 8)}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <span className={styles.timestamp}>
              {formatTimestamp(event.timestamp)}
            </span>
          </motion.div>
        ))
      )}
    </div>
  );
}

type EventDetailProps = {
  event: EventData;
  className?: string;
};

export function EventDetail({ event, className = '' }: EventDetailProps) {
  return (
    <div className={`${styles.detail} ${className}`}>
      <div className={styles.detailHeader}>
        <div className={styles.detailType}>
          {getEventIcon(event.type)}
          <span>{formatEventType(event.type)}</span>
        </div>
        <Badge variant={event.category === 'error' ? 'error' : 'default'}>
          {event.category}
        </Badge>
      </div>
      
      <div className={styles.detailMeta}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Event ID</span>
          <code className={styles.detailValue}>{event.id}</code>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Timestamp</span>
          <span className={styles.detailValue}>
            {new Date(event.timestamp).toLocaleString()}
          </span>
        </div>
      </div>
      
      {Object.keys(event.correlation).some(k => event.correlation[k as keyof typeof event.correlation]) && (
        <div className={styles.detailSection}>
          <h4 className={styles.detailSectionTitle}>Correlation</h4>
          <div className={styles.detailGrid}>
            {event.correlation.project_id && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Project</span>
                <code className={styles.detailValue}>{event.correlation.project_id}</code>
              </div>
            )}
            {event.correlation.graph_id && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Graph</span>
                <code className={styles.detailValue}>{event.correlation.graph_id}</code>
              </div>
            )}
            {event.correlation.flow_id && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Flow</span>
                <code className={styles.detailValue}>{event.correlation.flow_id}</code>
              </div>
            )}
            {event.correlation.task_id && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Task</span>
                <code className={styles.detailValue}>{event.correlation.task_id}</code>
              </div>
            )}
            {event.correlation.attempt_id && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Attempt</span>
                <code className={styles.detailValue}>{event.correlation.attempt_id}</code>
              </div>
            )}
          </div>
        </div>
      )}
      
      {Object.keys(event.payload).length > 0 && (
        <div className={styles.detailSection}>
          <h4 className={styles.detailSectionTitle}>Payload</h4>
          <pre className={styles.payload}>
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
