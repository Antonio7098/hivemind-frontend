import { useState } from 'react';
import { Monitor, Bell, Shield, Palette } from 'lucide-react';
import { Button } from '../components/Button';
import { PageHeader } from '../components/composites/PageHeader';
import { SectionCard } from '../components/composites/SectionCard';
import { SettingRow } from '../components/composites/SettingRow';
import { Toggle } from '../components/composites/Toggle';
import { Stack } from '../components/primitives/Stack';
import styles from './Settings.module.css';

export function Settings() {
  const [taskFailures, setTaskFailures] = useState(true);
  const [flowCompletion, setFlowCompletion] = useState(true);
  const [scopeViolations, setScopeViolations] = useState(true);
  const [defaultIsolation, setDefaultIsolation] = useState(true);
  const [strictMode, setStrictMode] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Settings"
        subtitle="Configure Hivemind to match your workflow"
      />

      <Stack gap={4}>
        <SectionCard icon={<Monitor size={20} />} title="Runtime Configuration" delay={0.1}>
          <SettingRow
            label="Default Runtime"
            description="Select the default agent runtime"
            control={
              <select className={styles.select}>
                <option>Claude Code</option>
                <option>Codex CLI</option>
                <option>OpenCode</option>
              </select>
            }
          />
          <SettingRow
            label="Retry Limit"
            description="Maximum task retries before escalation"
            control={
              <input type="number" className={styles.input} defaultValue={3} min={1} max={10} />
            }
          />
        </SectionCard>

        <SectionCard icon={<Bell size={20} />} title="Notifications" delay={0.2}>
          <SettingRow
            label="Task Failures"
            description="Notify when tasks fail or escalate"
            control={<Toggle checked={taskFailures} onChange={setTaskFailures} />}
          />
          <SettingRow
            label="Flow Completion"
            description="Notify when TaskFlows complete"
            control={<Toggle checked={flowCompletion} onChange={setFlowCompletion} />}
          />
          <SettingRow
            label="Scope Violations"
            description="Notify on scope violations"
            control={<Toggle checked={scopeViolations} onChange={setScopeViolations} />}
          />
        </SectionCard>

        <SectionCard icon={<Shield size={20} />} title="Scope Defaults" delay={0.3}>
          <SettingRow
            label="Default Isolation"
            description="Isolate conflicting scopes by default"
            control={<Toggle checked={defaultIsolation} onChange={setDefaultIsolation} />}
          />
          <SettingRow
            label="Strict Mode"
            description="Fail immediately on scope violations"
            control={<Toggle checked={strictMode} onChange={setStrictMode} />}
          />
        </SectionCard>

        <SectionCard icon={<Palette size={20} />} title="Appearance" delay={0.4}>
          <SettingRow
            label="Theme"
            description="Visual theme preference"
            control={
              <select className={styles.select}>
                <option>Dark (Industrial)</option>
                <option>Light</option>
                <option>System</option>
              </select>
            }
          />
          <SettingRow
            label="Compact Mode"
            description="Reduce spacing for more content"
            control={<Toggle checked={compactMode} onChange={setCompactMode} />}
          />
        </SectionCard>
      </Stack>

      <div className={styles.footer}>
        <Button variant="secondary">Reset to Defaults</Button>
        <Button variant="primary">Save Changes</Button>
      </div>
    </div>
  );
}
