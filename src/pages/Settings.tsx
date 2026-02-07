import { motion } from 'motion/react';
import { Monitor, Bell, Shield, Palette } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import styles from './Settings.module.css';

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS PAGE
// Application configuration
// ═══════════════════════════════════════════════════════════════════════════

export function Settings() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Settings</h1>
        <p>Configure Hivemind to match your workflow</p>
      </header>

      <div className={styles.sections}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card variant="default">
            <div className={styles.sectionHeader}>
              <Monitor size={20} />
              <h3>Runtime Configuration</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.setting}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>Default Runtime</span>
                  <span className={styles.settingDesc}>Select the default agent runtime</span>
                </div>
                <select className={styles.select}>
                  <option>Claude Code</option>
                  <option>Codex CLI</option>
                  <option>OpenCode</option>
                </select>
              </div>
              <div className={styles.setting}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>Retry Limit</span>
                  <span className={styles.settingDesc}>Maximum task retries before escalation</span>
                </div>
                <input type="number" className={styles.input} defaultValue={3} min={1} max={10} />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="default">
            <div className={styles.sectionHeader}>
              <Bell size={20} />
              <h3>Notifications</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.setting}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>Task Failures</span>
                  <span className={styles.settingDesc}>Notify when tasks fail or escalate</span>
                </div>
                <label className={styles.toggle}>
                  <input type="checkbox" defaultChecked />
                  <span className={styles.toggleSlider} />
                </label>
              </div>
              <div className={styles.setting}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>Flow Completion</span>
                  <span className={styles.settingDesc}>Notify when TaskFlows complete</span>
                </div>
                <label className={styles.toggle}>
                  <input type="checkbox" defaultChecked />
                  <span className={styles.toggleSlider} />
                </label>
              </div>
              <div className={styles.setting}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>Scope Violations</span>
                  <span className={styles.settingDesc}>Notify on scope violations</span>
                </div>
                <label className={styles.toggle}>
                  <input type="checkbox" defaultChecked />
                  <span className={styles.toggleSlider} />
                </label>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="default">
            <div className={styles.sectionHeader}>
              <Shield size={20} />
              <h3>Scope Defaults</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.setting}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>Default Isolation</span>
                  <span className={styles.settingDesc}>Isolate conflicting scopes by default</span>
                </div>
                <label className={styles.toggle}>
                  <input type="checkbox" defaultChecked />
                  <span className={styles.toggleSlider} />
                </label>
              </div>
              <div className={styles.setting}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>Strict Mode</span>
                  <span className={styles.settingDesc}>Fail immediately on scope violations</span>
                </div>
                <label className={styles.toggle}>
                  <input type="checkbox" />
                  <span className={styles.toggleSlider} />
                </label>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card variant="default">
            <div className={styles.sectionHeader}>
              <Palette size={20} />
              <h3>Appearance</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.setting}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>Theme</span>
                  <span className={styles.settingDesc}>Visual theme preference</span>
                </div>
                <select className={styles.select}>
                  <option>Dark (Industrial)</option>
                  <option>Light</option>
                  <option>System</option>
                </select>
              </div>
              <div className={styles.setting}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>Compact Mode</span>
                  <span className={styles.settingDesc}>Reduce spacing for more content</span>
                </div>
                <label className={styles.toggle}>
                  <input type="checkbox" />
                  <span className={styles.toggleSlider} />
                </label>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <div className={styles.footer}>
        <Button variant="secondary">Reset to Defaults</Button>
        <Button variant="primary">Save Changes</Button>
      </div>
    </div>
  );
}
