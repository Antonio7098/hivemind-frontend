import { useEffect, useState } from 'react';
import { Monitor, Bell, Shield, Palette } from 'lucide-react';
import { Button } from '../components/Button';
import { PageHeader } from '../components/composites/PageHeader';
import { SectionCard } from '../components/composites/SectionCard';
import { SettingRow } from '../components/composites/SettingRow';
import { Toggle } from '../components/composites/Toggle';
import { Stack } from '../components/primitives/Stack';
import { useHivemindStore } from '../stores/hivemindStore';
import styles from './Settings.module.css';

export function Settings() {
  const {
    fetchVersion,
    fetchApiCatalog,
    refreshFromApi,
    addNotification,
    setRuntimeDefaults,
    listRuntimes,
    runtimeHealth,
  } = useHivemindStore();
  const [taskFailures, setTaskFailures] = useState(true);
  const [flowCompletion, setFlowCompletion] = useState(true);
  const [scopeViolations, setScopeViolations] = useState(true);
  const [defaultIsolation, setDefaultIsolation] = useState(true);
  const [strictMode, setStrictMode] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [serverVersion, setServerVersion] = useState('loading...');
  const [catalogRead, setCatalogRead] = useState<string[]>([]);
  const [catalogWrite, setCatalogWrite] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [defaultRole, setDefaultRole] = useState<'worker' | 'validator'>('worker');
  const [defaultAdapter, setDefaultAdapter] = useState('opencode');
  const [defaultBinary, setDefaultBinary] = useState('opencode');
  const [defaultModel, setDefaultModel] = useState('');
  const [defaultArgs, setDefaultArgs] = useState('');
  const [defaultEnv, setDefaultEnv] = useState('');
  const [defaultTimeout, setDefaultTimeout] = useState('600000');
  const [defaultMaxParallel, setDefaultMaxParallel] = useState('1');
  const [runtimeCatalogOutput, setRuntimeCatalogOutput] = useState('');
  const [runtimeHealthTargetType, setRuntimeHealthTargetType] = useState<'global' | 'project' | 'task' | 'flow'>('global');
  const [runtimeHealthTargetId, setRuntimeHealthTargetId] = useState('');

  const parseArgs = (raw: string): string[] =>
    raw
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean);

  const parseEnv = (raw: string): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const idx = trimmed.indexOf('=');
      if (idx <= 0) continue;
      out[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
    }
    return out;
  };

  const syncApiDiagnostics = async () => {
    setBusy(true);
    try {
      const [version, catalog] = await Promise.all([fetchVersion(), fetchApiCatalog()]);
      setServerVersion(version);
      setCatalogRead(catalog.read_endpoints);
      setCatalogWrite(catalog.write_endpoints);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'API diagnostics failed',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void syncApiDiagnostics();
  }, []);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Settings"
        subtitle="Configure Hivemind to match your workflow"
      />

      <Stack gap={4}>
        <SectionCard icon={<Monitor size={20} />} title="Runtime Configuration" delay={0.1}>
          <SettingRow
            label="Server Version"
            description="Connected hivemind backend version"
            control={<span className={styles.value}>{serverVersion}</span>}
          />
          <SettingRow
            label="API Endpoints"
            description="Read and write routes discovered via /api/catalog"
            control={<span className={styles.value}>{catalogRead.length + catalogWrite.length}</span>}
          />
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
          <SettingRow
            label="Runtime Defaults Role"
            description="Choose role for global runtime defaults"
            control={
              <select className={styles.select} value={defaultRole} onChange={(e) => setDefaultRole(e.target.value as 'worker' | 'validator')}>
                <option value="worker">worker</option>
                <option value="validator">validator</option>
              </select>
            }
          />
          <SettingRow
            label="Default Adapter"
            description="Global adapter used when no project/flow/task override exists"
            control={<input className={styles.input} value={defaultAdapter} onChange={(e) => setDefaultAdapter(e.target.value)} />}
          />
          <SettingRow
            label="Default Binary"
            description="Binary path for selected adapter"
            control={<input className={styles.input} value={defaultBinary} onChange={(e) => setDefaultBinary(e.target.value)} />}
          />
          <SettingRow
            label="Default Model"
            description="Optional model identifier"
            control={<input className={styles.input} value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)} />}
          />
          <SettingRow
            label="Default Timeout"
            description="Timeout in milliseconds"
            control={<input className={styles.input} value={defaultTimeout} onChange={(e) => setDefaultTimeout(e.target.value)} />}
          />
          <SettingRow
            label="Default Max Parallel"
            description="Concurrency limit for selected role defaults"
            control={<input className={styles.input} value={defaultMaxParallel} onChange={(e) => setDefaultMaxParallel(e.target.value)} />}
          />
          <SettingRow
            label="Default Args"
            description="Space-separated runtime args"
            control={<input className={styles.input} value={defaultArgs} onChange={(e) => setDefaultArgs(e.target.value)} />}
          />
          <SettingRow
            label="Default Env"
            description="Env vars in KEY=VALUE format, separated by newlines"
            control={<textarea className={styles.input} value={defaultEnv} onChange={(e) => setDefaultEnv(e.target.value)} rows={3} />}
          />
          <div className={styles.apiSplit}>
            <div className={styles.apiColumn}>
              <span className={styles.apiHeading}>Read ({catalogRead.length})</span>
              <div className={styles.apiList}>
                {catalogRead.map((endpoint) => (
                  <code key={endpoint} className={styles.endpoint}>{endpoint}</code>
                ))}
              </div>
            </div>
            <div className={styles.apiColumn}>
              <span className={styles.apiHeading}>Write ({catalogWrite.length})</span>
              <div className={styles.apiList}>
                {catalogWrite.map((endpoint) => (
                  <code key={endpoint} className={styles.endpoint}>{endpoint}</code>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.footer}>
            <Button
              variant="secondary"
              loading={busy}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  try {
                    const runtimes = await listRuntimes();
                    setRuntimeCatalogOutput(JSON.stringify(runtimes, null, 2));
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              List runtimes
            </Button>
            <Button
              variant="secondary"
              loading={busy}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  try {
                    const payload: { role: 'worker' | 'validator'; project?: string; task?: string; flow?: string } = { role: defaultRole };
                    if (runtimeHealthTargetType === 'project' && runtimeHealthTargetId.trim()) payload.project = runtimeHealthTargetId.trim();
                    if (runtimeHealthTargetType === 'task' && runtimeHealthTargetId.trim()) payload.task = runtimeHealthTargetId.trim();
                    if (runtimeHealthTargetType === 'flow' && runtimeHealthTargetId.trim()) payload.flow = runtimeHealthTargetId.trim();
                    const health = await runtimeHealth(payload);
                    setRuntimeCatalogOutput(JSON.stringify(health, null, 2));
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              Runtime health
            </Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  try {
                    await setRuntimeDefaults({
                      role: defaultRole,
                      adapter: defaultAdapter.trim() || undefined,
                      binary_path: defaultBinary.trim() || undefined,
                      model: defaultModel.trim() || undefined,
                      args: parseArgs(defaultArgs),
                      env: parseEnv(defaultEnv),
                      timeout_ms: Number(defaultTimeout) || 600000,
                      max_parallel_tasks: Math.max(Number(defaultMaxParallel) || 1, 1),
                    });
                    addNotification({ type: 'success', title: 'Runtime defaults saved' });
                  } catch (error) {
                    addNotification({
                      type: 'error',
                      title: 'Failed to save runtime defaults',
                      message: error instanceof Error ? error.message : String(error),
                    });
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              Save runtime defaults
            </Button>
          </div>
          <div className={styles.apiSplit}>
            <div className={styles.apiColumn}>
              <span className={styles.apiHeading}>Health Target</span>
              <select className={styles.select} value={runtimeHealthTargetType} onChange={(e) => setRuntimeHealthTargetType(e.target.value as 'global' | 'project' | 'task' | 'flow')}>
                <option value="global">global</option>
                <option value="project">project</option>
                <option value="task">task</option>
                <option value="flow">flow</option>
              </select>
              <input
                className={styles.input}
                placeholder="Target ID/name (optional)"
                value={runtimeHealthTargetId}
                onChange={(e) => setRuntimeHealthTargetId(e.target.value)}
              />
            </div>
            <div className={styles.apiColumn}>
              <span className={styles.apiHeading}>Runtime Diagnostics Output</span>
              <pre className={styles.apiList}>{runtimeCatalogOutput || 'No runtime diagnostics yet.'}</pre>
            </div>
          </div>
          <Button
            variant="secondary"
            loading={busy}
            onClick={() => {
              void syncApiDiagnostics();
            }}
          >
            Reload API diagnostics
          </Button>
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
        <Button
          variant="primary"
          loading={busy}
          onClick={() => {
            void refreshFromApi();
            void syncApiDiagnostics();
          }}
        >
          Sync with backend
        </Button>
      </div>
    </div>
  );
}
