import { motion } from 'motion/react';
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from 'lucide-react';
import { useHivemindStore } from '../stores/hivemindStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader } from '../components/composites/PageHeader';
import { EmptyState } from '../components/composites/EmptyState';
import styles from './Notifications.module.css';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success': return CheckCircle2;
    case 'warning': return AlertTriangle;
    case 'error': return XCircle;
    default: return Info;
  }
};

export function Notifications() {
  const { notifications, markNotificationRead, clearNotifications } = useHivemindStore();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
            : 'All caught up!'
        }
        actions={
          <>
            <Button
              variant="secondary"
              icon={<CheckCheck size={16} />}
              onClick={() => notifications.forEach((n) => markNotificationRead(n.id))}
            >
              Mark All Read
            </Button>
            <Button
              variant="ghost"
              icon={<Trash2 size={16} />}
              onClick={clearNotifications}
            >
              Clear All
            </Button>
          </>
        }
      />

      <div className={styles.notificationList}>
        {notifications.length === 0 ? (
          <Card variant="outlined">
            <EmptyState
              icon={<Bell size={48} strokeWidth={1} />}
              title="No Notifications"
              description="You're all caught up! New notifications will appear here."
            />
          </Card>
        ) : (
          notifications.map((notification, index) => {
            const Icon = getNotificationIcon(notification.type);
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  variant="default"
                  hoverable
                  className={`${styles.notification} ${!notification.read ? styles.unread : ''} ${styles[notification.type]}`}
                  onClick={() => markNotificationRead(notification.id)}
                >
                  <div className={styles.notificationIcon}>
                    <Icon size={20} />
                  </div>
                  <div className={styles.notificationContent}>
                    <div className={styles.notificationHeader}>
                      <h4 className={styles.notificationTitle}>{notification.title}</h4>
                      <span className={styles.notificationTime}>
                        {new Date(notification.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {notification.message && (
                      <p className={styles.notificationMessage}>{notification.message}</p>
                    )}
                  </div>
                  {!notification.read && <div className={styles.unreadDot} />}
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
