import { useState, useEffect } from 'react';
import {
  Shield,
  FileText,
  Code,
  Layers,
  RefreshCw,
  CheckCircle,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { useHivemindStore } from '../stores/hivemindStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/composites/PageHeader';
import { TabPanel, TabList, Tab, TabContent } from '../components/composites/TabPanel';
import { Expandable } from '../components/composites/Expandable';
import { DataList, DataListItem, DataListEmpty } from '../components/composites/DataList';
import { Stack } from '../components/primitives/Stack';
import { Text } from '../components/primitives/Text';
import type {
  GovernanceConstitutionResult,
  GovernanceDocumentSummary,
  GovernanceNotepadResult,
  GlobalSkillSummary,
  GlobalTemplateSummary,
} from '../types';
import styles from './Governance.module.css';

export function Governance() {
  const {
    selectedProjectId,
    projects,
    fetchConstitution,
    checkConstitution,
    fetchGovernanceDocuments,
    fetchProjectNotepad,
    fetchGlobalNotepad,
    fetchGlobalSkills,
    fetchGlobalTemplates,
    refreshGraphSnapshot,
    addNotification,
  } = useHivemindStore();

  const [constitution, setConstitution] = useState<GovernanceConstitutionResult | null>(null);
  const [documents, setDocuments] = useState<GovernanceDocumentSummary[]>([]);
  const [projectNotepad, setProjectNotepad] = useState<GovernanceNotepadResult | null>(null);
  const [globalNotepad, setGlobalNotepad] = useState<GovernanceNotepadResult | null>(null);
  const [skills, setSkills] = useState<GlobalSkillSummary[]>([]);
  const [templates, setTemplates] = useState<GlobalTemplateSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const loadProjectData = async () => {
    if (!selectedProjectId || !selectedProject) return;
    setLoading(true);
    try {
      const [constitutionData, docsData, notepadData] = await Promise.all([
        fetchConstitution(selectedProject.name).catch(() => null),
        fetchGovernanceDocuments(selectedProject.name).catch(() => []),
        fetchProjectNotepad(selectedProject.name).catch(() => null),
      ]);
      setConstitution(constitutionData);
      setDocuments(docsData);
      setProjectNotepad(notepadData);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to load governance data',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalData = async () => {
    setLoading(true);
    try {
      const [notepadData, skillsData, templatesData] = await Promise.all([
        fetchGlobalNotepad().catch(() => null),
        fetchGlobalSkills().catch(() => []),
        fetchGlobalTemplates().catch(() => []),
      ]);
      setGlobalNotepad(notepadData);
      setSkills(skillsData);
      setTemplates(templatesData);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to load global governance data',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
    loadGlobalData();
  }, [selectedProjectId]);

  const runAction = async (label: string, action: () => Promise<void>) => {
    setBusyAction(label);
    try {
      await action();
      addNotification({ type: 'success', title: label, message: 'Operation completed' });
    } catch (error) {
      addNotification({
        type: 'error',
        title: `${label} failed`,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCheckConstitution = async () => {
    if (!selectedProject) return;
    await runAction('Check constitution', async () => {
      const result = await checkConstitution({ project: selectedProject.name });
      if (result.valid) {
        addNotification({ type: 'success', title: 'Constitution valid', message: 'All checks passed' });
      } else {
        addNotification({ 
          type: 'warning', 
          title: 'Constitution issues', 
          message: result.errors.join(', ') 
        });
      }
    });
  };

  const handleRefreshSnapshot = async () => {
    if (!selectedProject) return;
    await runAction('Refresh graph snapshot', async () => {
      await refreshGraphSnapshot({ project: selectedProject.name, trigger: 'manual' });
    });
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Governance"
        subtitle="Manage project constitution, documents, and global artifacts"
        actions={
          <Stack direction="row" gap={2}>
            <Button
              variant="secondary"
              icon={<RefreshCw size={14} />}
              loading={loading}
              onClick={() => {
                loadProjectData();
                loadGlobalData();
              }}
            >
              Refresh
            </Button>
          </Stack>
        }
      />

      <Card variant="default" className={styles.governanceCard}>
        <TabPanel defaultTab="project" variant="pills">
          <TabList>
            <Tab id="project" icon={<Shield size={14} />}>
              Project
              {selectedProject && <Badge variant="default" size="sm">{selectedProject.name}</Badge>}
            </Tab>
            <Tab id="global" icon={<Sparkles size={14} />}>
              Global
            </Tab>
          </TabList>

          <TabContent id="project">
            {!selectedProject ? (
              <div className={styles.emptyState}>
                <Shield size={48} strokeWidth={1} />
                <Text variant="body" color="muted">Select a project to view governance</Text>
              </div>
            ) : (
              <Stack direction="column" gap={4} className={styles.tabContent}>
                {/* Constitution Section */}
                <Expandable
                  title="Constitution"
                  subtitle={constitution?.initialized ? 'Initialized' : 'Not initialized'}
                  icon={<Shield size={16} />}
                  badge={
                    constitution?.initialized ? (
                      <Badge variant="success" size="sm">Active</Badge>
                    ) : (
                      <Badge variant="warning" size="sm">Not Set</Badge>
                    )
                  }
                  defaultOpen
                  variant="card"
                >
                  <Stack direction="column" gap={3}>
                    {constitution?.initialized ? (
                      <>
                        <div className={styles.constitutionMeta}>
                          <div className={styles.metaItem}>
                            <Text variant="caption" color="muted">Schema Version</Text>
                            <Text variant="body">{constitution.schema_version || 'N/A'}</Text>
                          </div>
                          {constitution.validated_at && (
                            <div className={styles.metaItem}>
                              <Text variant="caption" color="muted">Last Validated</Text>
                              <Text variant="body">
                                {new Date(constitution.validated_at).toLocaleString()}
                              </Text>
                            </div>
                          )}
                        </div>
                        {constitution.content && (
                          <pre className={styles.codeBlock}>{constitution.content}</pre>
                        )}
                        <div className={styles.actions}>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<CheckCircle size={12} />}
                            loading={busyAction === 'Check constitution'}
                            onClick={handleCheckConstitution}
                          >
                            Validate
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Text variant="body" color="muted">
                        No constitution configured for this project.
                      </Text>
                    )}
                  </Stack>
                </Expandable>

                {/* Documents Section */}
                <Expandable
                  title="Documents"
                  subtitle={`${documents.length} document(s)`}
                  icon={<FileText size={16} />}
                  badge={<Badge variant="default" size="sm">{documents.length}</Badge>}
                  variant="card"
                >
                  {documents.length === 0 ? (
                    <DataListEmpty
                      icon={<FileText size={32} strokeWidth={1} />}
                      title="No Documents"
                      description="Create governance documents to define project rules"
                    />
                  ) : (
                    <DataList>
                      {documents.map(doc => (
                        <DataListItem
                          key={doc.document_id}
                          icon={<FileText size={16} />}
                          title={doc.title}
                          subtitle={`${doc.revision_count} revision(s)`}
                          value={new Date(doc.updated_at).toLocaleDateString()}
                        />
                      ))}
                    </DataList>
                  )}
                </Expandable>

                {/* Project Notepad */}
                <Expandable
                  title="Project Notepad"
                  subtitle="Scratchpad for project notes"
                  icon={<BookOpen size={16} />}
                  variant="card"
                >
                  {projectNotepad?.content ? (
                    <pre className={styles.notepad}>{projectNotepad.content}</pre>
                  ) : (
                    <Text variant="body" color="muted">No notepad content.</Text>
                  )}
                </Expandable>

                {/* Graph Snapshot */}
                <Expandable
                  title="Code Graph"
                  subtitle="UCP-based code structure snapshot"
                  icon={<Layers size={16} />}
                  variant="card"
                >
                  <Stack direction="column" gap={3}>
                    <Text variant="body" color="secondary">
                      Refresh the code graph snapshot to update the project's understanding of the codebase structure.
                    </Text>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<RefreshCw size={12} />}
                      loading={busyAction === 'Refresh graph snapshot'}
                      onClick={handleRefreshSnapshot}
                    >
                      Refresh Snapshot
                    </Button>
                  </Stack>
                </Expandable>
              </Stack>
            )}
          </TabContent>

          <TabContent id="global">
            <Stack direction="column" gap={4} className={styles.tabContent}>
              {/* Global Skills */}
              <Expandable
                title="Skills"
                subtitle={`${skills.length} skill(s) defined`}
                icon={<Code size={16} />}
                badge={<Badge variant="default" size="sm">{skills.length}</Badge>}
                defaultOpen
                variant="card"
              >
                {skills.length === 0 ? (
                  <DataListEmpty
                    icon={<Code size={32} strokeWidth={1} />}
                    title="No Skills"
                    description="Define global skills to share across projects"
                  />
                ) : (
                  <DataList>
                    {skills.map(skill => (
                      <DataListItem
                        key={skill.skill_id}
                        icon={<Code size={16} />}
                        title={skill.name}
                        subtitle={skill.description || skill.skill_id}
                        value={new Date(skill.updated_at).toLocaleDateString()}
                      />
                    ))}
                  </DataList>
                )}
              </Expandable>

              {/* Global Templates */}
              <Expandable
                title="Templates"
                subtitle={`${templates.length} template(s) defined`}
                icon={<Layers size={16} />}
                badge={<Badge variant="default" size="sm">{templates.length}</Badge>}
                variant="card"
              >
                {templates.length === 0 ? (
                  <DataListEmpty
                    icon={<Layers size={32} strokeWidth={1} />}
                    title="No Templates"
                    description="Define global templates for consistent agent prompts"
                  />
                ) : (
                  <DataList>
                    {templates.map(template => (
                      <DataListItem
                        key={template.template_id}
                        icon={<Layers size={16} />}
                        title={template.template_id}
                        subtitle={`System: ${template.system_prompt_id} • ${template.skill_ids.length} skill(s)`}
                        value={new Date(template.updated_at).toLocaleDateString()}
                      />
                    ))}
                  </DataList>
                )}
              </Expandable>

              {/* Global Notepad */}
              <Expandable
                title="Global Notepad"
                subtitle="Shared scratchpad across all projects"
                icon={<BookOpen size={16} />}
                variant="card"
              >
                {globalNotepad?.content ? (
                  <pre className={styles.notepad}>{globalNotepad.content}</pre>
                ) : (
                  <Text variant="body" color="muted">No global notepad content.</Text>
                )}
              </Expandable>
            </Stack>
          </TabContent>
        </TabPanel>
      </Card>
    </div>
  );
}
