import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bot, GitBranch, MessageSquare, RefreshCw, Send, Shield, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { PageHeader } from '../components/composites/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Stack } from '../components/primitives/Stack';
import { Text } from '../components/primitives/Text';
import { API_BASE_URL, useHivemindStore } from '../stores/hivemindStore';
import type {
  ChatInvokeResponse,
  ChatMode,
  ChatSessionInspectView,
  ChatSessionMessageView,
  ChatSessionSummaryView,
  ChatStreamEnvelope,
} from '../types';
import styles from './Chat.module.css';

type ChatUiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  requestId?: string | null;
  provider?: string | null;
  finalState?: string | null;
  response?: ChatInvokeResponse;
  streaming?: boolean;
  streamingSource?: 'chunk' | 'delta';
};

type ChatStreamStatus = 'disabled' | 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'resyncing';

const CHAT_ACTOR_STORAGE_KEY = 'hm-chat-actor';
const CHAT_ACCESS_TOKEN_STORAGE_KEY = 'hm-chat-access-token';

function makeMessageId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatTimestamp(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildSessionTitle(message: string) {
  const trimmed = message.trim();
  return trimmed.length <= 48 ? trimmed : `${trimmed.slice(0, 48)}…`;
}

function loadStoredChatSetting(key: string) {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(key) ?? '';
}

function streamMessageKey(messageId: string, requestId?: string | null) {
  return requestId ?? messageId;
}

function appendChunkLine(current: string, nextLine: string) {
  return current ? `${current}\n${nextLine}`.trim() : nextLine;
}

function appendTextDelta(current: string, nextChunk: string) {
  return `${current}${nextChunk}`;
}

function buildChatStreamUrl(sessionId: string, actor: string, accessToken: string, cursor?: string | null) {
  const params = new URLSearchParams({ session_id: sessionId });
  const normalizedActor = actor.trim();
  const normalizedToken = accessToken.trim();
  if (normalizedActor) params.set('actor', normalizedActor);
  if (normalizedToken) params.set('access_token', normalizedToken);
  if (cursor) params.set('cursor', cursor);
  return `${API_BASE_URL}/api/chat/sessions/stream?${params.toString()}`;
}

function streamStatusCopy(status: ChatStreamStatus) {
  switch (status) {
    case 'disabled':
      return { label: 'stream unavailable', variant: 'warning' as const };
    case 'idle':
      return { label: 'stream idle', variant: 'default' as const };
    case 'connecting':
      return { label: 'stream connecting', variant: 'amber' as const };
    case 'connected':
      return { label: 'stream live', variant: 'success' as const };
    case 'reconnecting':
      return { label: 'reconnecting', variant: 'warning' as const };
    case 'resyncing':
      return { label: 'resyncing', variant: 'info' as const };
  }
  return { label: 'stream idle', variant: 'default' as const };
}

function mapSessionMessage(
  message: ChatSessionMessageView,
  responsesByRequestId: Record<string, ChatInvokeResponse>,
): ChatUiMessage {
  return {
    id: message.message_id,
    role: message.role,
    content: message.content,
    createdAt: message.created_at,
    requestId: message.request_id,
    provider: message.provider,
    finalState: message.final_state,
    response: message.request_id ? responsesByRequestId[message.request_id] : undefined,
  };
}

function summarizeSession(session: ChatSessionInspectView): ChatSessionSummaryView {
  const lastMessage = session.messages.at(-1) ?? null;
  return {
    session_id: session.session_id,
    mode: session.mode,
    title: session.title,
    owner_actor_id: session.owner_actor_id,
    project_id: session.project_id,
    task_id: session.task_id,
    flow_id: session.flow_id,
    created_at: session.created_at,
    updated_at: session.updated_at,
    message_count: session.messages.length,
    last_message_preview: lastMessage?.content ?? null,
  };
}

export function Chat() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    apiCatalog,
    fetchApiCatalog,
    createChatSession,
    inspectChatSession,
    listChatSessions,
    sendChatSessionMessage,
    projects,
    selectedProjectId,
    setSelectedProject,
    tasks,
    flows,
  } = useHivemindStore();

  const [mode, setMode] = useState<ChatMode>('plan');
  const [draft, setDraft] = useState('');
  const [sessions, setSessions] = useState<ChatSessionSummaryView[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatUiMessage[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionLookupValue, setSessionLookupValue] = useState('');
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [latestAssistantResponse, setLatestAssistantResponse] = useState<ChatInvokeResponse | null>(null);
  const [responsesByRequestId, setResponsesByRequestId] = useState<Record<string, ChatInvokeResponse>>({});
  const [chatActor, setChatActor] = useState(() => loadStoredChatSetting(CHAT_ACTOR_STORAGE_KEY));
  const [chatAccessToken, setChatAccessToken] = useState(() => loadStoredChatSetting(CHAT_ACCESS_TOKEN_STORAGE_KEY));
  const [streamStatus, setStreamStatus] = useState<ChatStreamStatus>('idle');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamReconnectNonce, setStreamReconnectNonce] = useState(0);
  const [lastStreamCursor, setLastStreamCursor] = useState<string | null>(null);
  const responsesByRequestIdRef = useRef<Record<string, ChatInvokeResponse>>({});
  const lastStreamCursorRef = useRef<string | null>(null);
  const searchParamsKey = searchParams.toString();
  const sessionIdFromUrl = searchParams.get('session');

  useEffect(() => {
    responsesByRequestIdRef.current = responsesByRequestId;
  }, [responsesByRequestId]);

  useEffect(() => {
    lastStreamCursorRef.current = lastStreamCursor;
  }, [lastStreamCursor]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (chatActor.trim()) {
      window.localStorage.setItem(CHAT_ACTOR_STORAGE_KEY, chatActor.trim());
      return;
    }
    window.localStorage.removeItem(CHAT_ACTOR_STORAGE_KEY);
  }, [chatActor]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (chatAccessToken.trim()) {
      window.localStorage.setItem(CHAT_ACCESS_TOKEN_STORAGE_KEY, chatAccessToken.trim());
      return;
    }
    window.localStorage.removeItem(CHAT_ACCESS_TOKEN_STORAGE_KEY);
  }, [chatAccessToken]);

  useEffect(() => {
    if (apiCatalog) return;
    void fetchApiCatalog().catch(() => undefined);
  }, [apiCatalog, fetchApiCatalog]);

  const readEndpoints = apiCatalog?.read_endpoints ?? [];
  const writeEndpoints = apiCatalog?.write_endpoints ?? [];
  const hasChatApi = writeEndpoints.includes('/api/chat/sessions/send');
  const hasChatStreamApi = readEndpoints.some((endpoint) => endpoint.startsWith('/api/chat/sessions/stream'));
  const streamStatusMeta = streamStatusCopy(streamStatus);

  const projectTasks = useMemo(
    () => tasks.filter((task) => !selectedProjectId || task.project_id === selectedProjectId),
    [tasks, selectedProjectId],
  );
  const projectFlows = useMemo(
    () => flows.filter((flow) => !selectedProjectId || flow.project_id === selectedProjectId),
    [flows, selectedProjectId],
  );

  const projectTaskCount = projectTasks.length;
  const projectFlowCount = projectFlows.length;
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const selectedSession = sessions.find((session) => session.session_id === selectedSessionId) ?? null;

  useEffect(() => {
    setSessionLookupValue(sessionIdFromUrl ?? '');
  }, [sessionIdFromUrl]);

  useEffect(() => {
    if (sessionIdFromUrl && sessionIdFromUrl !== selectedSessionId) {
      setSelectedSessionId(sessionIdFromUrl);
    }
  }, [selectedSessionId, sessionIdFromUrl]);

  useEffect(() => {
    lastStreamCursorRef.current = null;
    setLastStreamCursor(null);
    setStreamError(null);
  }, [selectedSessionId]);

  useEffect(() => {
    const next = new URLSearchParams(searchParamsKey);
    if (selectedSessionId) {
      next.set('session', selectedSessionId);
    } else {
      next.delete('session');
    }
    if (next.toString() !== searchParamsKey) {
      setSearchParams(next, { replace: true });
    }
  }, [searchParamsKey, selectedSessionId, setSearchParams]);

  const refreshSessions = async () => {
    if (!hasChatApi) return;
    setLoadingSessions(true);
    try {
      const nextSessions = await listChatSessions({
        project: selectedProjectId ?? undefined,
        limit: 30,
        actor: chatActor,
        accessToken: chatAccessToken,
      });
      setSessions(nextSessions);
      if (
        selectedSessionId &&
        !sessionIdFromUrl &&
        !nextSessions.some((session) => session.session_id === selectedSessionId)
      ) {
        setSelectedSessionId(nextSessions[0]?.session_id ?? null);
      }
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : String(sessionError));
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (!hasChatApi) return;
    void refreshSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatAccessToken, chatActor, hasChatApi, selectedProjectId]);

  useEffect(() => {
    if (!selectedTaskId || projectTasks.some((task) => task.id === selectedTaskId)) return;
    setSelectedTaskId(null);
  }, [projectTasks, selectedTaskId]);

  useEffect(() => {
    if (!selectedFlowId || projectFlows.some((flow) => flow.id === selectedFlowId)) return;
    setSelectedFlowId(null);
  }, [projectFlows, selectedFlowId]);

  useEffect(() => {
    if (!selectedSessionId || !hasChatApi) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setLoadingConversation(true);
    void inspectChatSession({
      session_id: selectedSessionId,
      actor: chatActor,
      accessToken: chatAccessToken,
    })
      .then((session) => {
        if (cancelled) return;
        setMode(session.mode);
        if (session.project_id && session.project_id !== selectedProjectId) {
          setSelectedProject(session.project_id);
        }
        setSelectedTaskId(session.task_id);
        setSelectedFlowId(session.flow_id);
        setMessages(session.messages.map((message) => mapSessionMessage(message, responsesByRequestIdRef.current)));
        setSessions((current) => {
          const summary = summarizeSession(session);
          const deduped = current.filter((entry) => entry.session_id !== summary.session_id);
          return [summary, ...deduped].sort(
            (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
          );
        });
      })
      .catch((sessionError) => {
        if (cancelled) return;
        setError(sessionError instanceof Error ? sessionError.message : String(sessionError));
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingConversation(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chatAccessToken, chatActor, hasChatApi, inspectChatSession, selectedProjectId, selectedSessionId, setSelectedProject]);

  useEffect(() => {
    if (!hasChatStreamApi) {
      setStreamStatus('disabled');
      return;
    }
    if (!selectedSessionId) {
      setStreamStatus('idle');
      setStreamError(null);
      setLastStreamCursor(null);
      return;
    }

    let disposed = false;
    let source: EventSource | null = null;
    let retryTimer: number | null = null;
    let reconnectAttempts = 0;

    const clearRetry = () => {
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      reconnectAttempts += 1;
      const delayMs = Math.min(8000, 1000 * reconnectAttempts);
      setStreamStatus(lastStreamCursorRef.current ? 'resyncing' : 'reconnecting');
      setStreamError(`Chat stream disconnected. Retrying in ${Math.ceil(delayMs / 1000)}s…`);
      clearRetry();
      retryTimer = window.setTimeout(() => {
        connect(true);
      }, delayMs);
    };

    const connect = (resumeFromCursor: boolean) => {
      if (disposed) return;
      const resumeCursor = resumeFromCursor ? lastStreamCursorRef.current : null;
      setStreamStatus(resumeCursor ? 'resyncing' : 'connecting');
      if (!resumeFromCursor) {
        setStreamError(null);
      }

      const onChat = (event: MessageEvent<string>) => {
        let envelope: ChatStreamEnvelope;
        try {
          envelope = JSON.parse(event.data) as ChatStreamEnvelope;
        } catch {
          return;
        }

        if (envelope.session_id !== selectedSessionId) {
          return;
        }

        const durableCursor = event.lastEventId && !event.lastEventId.startsWith('live:')
          ? event.lastEventId
          : null;
        if (durableCursor) {
          lastStreamCursorRef.current = durableCursor;
          setLastStreamCursor(durableCursor);
        }
        setStreamStatus('connected');
        setStreamError(null);

        if (envelope.event.kind === 'stream_chunk') {
          const { chunk } = envelope.event;
          const requestKey = streamMessageKey(chunk.message_id, chunk.request_id);
          setMessages((current) => {
            const existingIndex = current.findIndex(
              (message) => message.streaming && streamMessageKey(message.id, message.requestId) === requestKey,
            );
            const nextLine = `${chunk.directive_kind}: ${chunk.content}`;
            if (existingIndex >= 0) {
              const next = [...current];
              next[existingIndex] = {
                ...next[existingIndex],
                content: appendChunkLine(next[existingIndex].content, nextLine),
                streamingSource: 'chunk',
              };
              return next;
            }
            return [
              ...current,
              {
                id: chunk.message_id,
                role: 'assistant',
                content: nextLine,
                requestId: chunk.request_id,
                streaming: true,
                streamingSource: 'chunk',
              },
            ];
          });
          return;
        }

        if (envelope.event.kind === 'text_delta') {
          const { delta } = envelope.event;
          const requestKey = streamMessageKey(delta.message_id, delta.request_id);
          setMessages((current) => {
            const existingIndex = current.findIndex(
              (message) => message.streaming && streamMessageKey(message.id, message.requestId) === requestKey,
            );
            if (existingIndex >= 0) {
              const next = [...current];
              next[existingIndex] = {
                ...next[existingIndex],
                content: appendTextDelta(next[existingIndex].content, delta.content),
                streamingSource: 'delta',
              };
              return next;
            }
            return [
              ...current,
              {
                id: delta.message_id,
                role: 'assistant',
                content: delta.content,
                requestId: delta.request_id,
                streaming: true,
                streamingSource: 'delta',
              },
            ];
          });
          return;
        }

        const message = envelope.event.message;
        setMessages((current) => {
          const nextMessage = mapSessionMessage(message, responsesByRequestIdRef.current);
          const filtered = current.filter((entry) => !(
            entry.streaming && (
              streamMessageKey(entry.id, entry.requestId) === streamMessageKey(message.message_id, message.request_id)
            )
          ));
          const existingIndex = filtered.findIndex((entry) => entry.id === message.message_id);
          if (existingIndex >= 0) {
            const next = [...filtered];
            next[existingIndex] = nextMessage;
            return next;
          }
          return [...filtered, nextMessage];
        });
      };

      source = new EventSource(buildChatStreamUrl(selectedSessionId, chatActor, chatAccessToken, resumeCursor));
      source.onopen = () => {
        reconnectAttempts = 0;
        setStreamStatus(resumeCursor ? 'resyncing' : 'connected');
      };
      source.onerror = () => {
        source?.removeEventListener('chat', onChat as EventListener);
        source?.close();
        source = null;
        scheduleReconnect();
      };
      source.addEventListener('chat', onChat as EventListener);
    };

    connect(Boolean(lastStreamCursorRef.current));

    return () => {
      disposed = true;
      clearRetry();
      source?.close();
    };
  }, [chatAccessToken, chatActor, hasChatStreamApi, selectedSessionId, streamReconnectNonce]);

  const modeCopy = mode === 'plan'
    ? {
        title: 'Plan mode',
        description: 'Shape a flow/plan conversation before execution. Best for graph design, dependency planning, and review-oriented prompts.',
        placeholder: 'Plan the next flow, graph, or execution strategy…',
      }
    : {
        title: 'Free Flow mode',
        description: 'Ad-hoc agent conversation for open-ended exploration and operator steering outside a formal flow.',
        placeholder: 'Ask a free-form question or steer an agent session…',
      };

  const sendDisabled = !hasChatApi || sending || draft.trim().length === 0;

  const startNewChat = () => {
    setSelectedSessionId(null);
    setMessages([]);
    setDraft('');
    setLatestAssistantResponse(null);
    setShareStatus(null);
    setStreamError(null);
  };

  const handleOpenSessionLookup = () => {
    const nextSessionId = sessionLookupValue.trim();
    if (!nextSessionId) return;
    setError(null);
    setSelectedSessionId(nextSessionId);
  };

  const handleCopySessionLink = async () => {
    if (!selectedSessionId) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('session', selectedSessionId);
      await navigator.clipboard.writeText(url.toString());
      setShareStatus('Session link copied');
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : String(copyError));
    }
  };

  const handleSend = async () => {
    const message = draft.trim();
    if (!message || sending || !hasChatApi) return;

    setError(null);
    setSending(true);

    try {
      let sessionId = selectedSessionId;
      if (!sessionId) {
        const created = await createChatSession({
          mode,
          title: buildSessionTitle(message),
          project: selectedProjectId ?? undefined,
          task: selectedTaskId ?? undefined,
          flow: selectedFlowId ?? undefined,
          actor: chatActor,
          accessToken: chatAccessToken,
        });
        sessionId = created.session_id;
        setSelectedSessionId(created.session_id);
      }

      setMessages((current) => [
        ...current,
        { id: makeMessageId(), role: 'user', content: message, createdAt: new Date().toISOString() },
      ]);
      setDraft('');

      const sendResult = await sendChatSessionMessage({
        session_id: sessionId,
        message,
        actor: chatActor,
        accessToken: chatAccessToken,
      });
      const response = sendResult.response;
      const nextResponses = { ...responsesByRequestIdRef.current, [response.request_id]: response };
      setLatestAssistantResponse(response);
      setResponsesByRequestId(nextResponses);

      const inspected = await inspectChatSession({
        session_id: sessionId,
        actor: chatActor,
        accessToken: chatAccessToken,
      });
      setMode(inspected.mode);
      if (inspected.project_id && inspected.project_id !== selectedProjectId) {
        setSelectedProject(inspected.project_id);
      }
      setSelectedTaskId(inspected.task_id);
      setSelectedFlowId(inspected.flow_id);
      setMessages(inspected.messages.map((entry) => mapSessionMessage(entry, nextResponses)));
      await refreshSessions();
      setShareStatus(null);
    } catch (invokeError) {
      setError(invokeError instanceof Error ? invokeError.message : String(invokeError));
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleReconnectStream = () => {
    setStreamError(null);
    setStreamReconnectNonce((current) => current + 1);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Chat"
        subtitle="Dedicated workspace for persisted planning and free-form agent conversations"
        actions={
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeButton} ${mode === 'freeflow' ? styles.activeMode : ''}`}
              onClick={() => setMode('freeflow')}
              disabled={Boolean(selectedSessionId)}
            >
              <MessageSquare size={14} />
              Free Flow
            </button>
            <button
              className={`${styles.modeButton} ${mode === 'plan' ? styles.activeMode : ''}`}
              onClick={() => setMode('plan')}
              disabled={Boolean(selectedSessionId)}
            >
              <Sparkles size={14} />
              Plan
            </button>
          </div>
        }
      />

      <div className={styles.layout}>
        <Card variant="outlined" className={styles.primaryCard}>
          <Stack gap={3}>
            <Stack direction="row" gap={2} align="center">
              <Bot size={18} />
              <Text variant="h4">{selectedSession?.title ?? modeCopy.title}</Text>
              <Badge variant={hasChatApi ? 'info' : 'warning'} size="sm">
                {hasChatApi ? 'session api ready' : 'api unavailable'}
              </Badge>
              {hasChatStreamApi && (
                <Badge variant={streamStatusMeta.variant} size="sm">
                  {streamStatusMeta.label}
                </Badge>
              )}
              {selectedSession && <Badge variant="default" size="sm">{selectedSession.mode}</Badge>}
            </Stack>
            {selectedSessionId && (
              <div className={styles.sessionMetaRow}>
                <Text variant="caption" color="muted">Session ID: {selectedSessionId}</Text>
                {selectedSession?.owner_actor_id && (
                  <Badge variant="default" size="sm">actor {selectedSession.owner_actor_id}</Badge>
                )}
                <Button variant="ghost" onClick={() => void handleCopySessionLink()}>
                  Copy link
                </Button>
                {shareStatus && <Text variant="caption" color="secondary">{shareStatus}</Text>}
              </div>
            )}
            <Text variant="body-sm" color="secondary">{modeCopy.description}</Text>
            {selectedSessionId && hasChatStreamApi && (
              <div className={styles.streamStatusRow}>
                <div className={styles.streamStatusMeta}>
                  {streamStatus === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
                  <Text variant="caption" color={streamError ? 'warning' : 'muted'}>
                    {streamError ?? (lastStreamCursor
                      ? `Watching live updates. Durable cursor: ${lastStreamCursor}`
                      : 'Watching live updates for this session.')}
                  </Text>
                </div>
                <Button
                  variant="ghost"
                  icon={<RefreshCw size={14} />}
                  onClick={handleReconnectStream}
                  disabled={!selectedSessionId || !hasChatStreamApi}
                >
                  Reconnect
                </Button>
              </div>
            )}

            <div className={styles.messageList}>
              {loadingConversation ? (
                <div className={styles.emptyState}>
                  <Text variant="body-sm" color="secondary">Loading conversation…</Text>
                </div>
              ) : messages.length === 0 ? (
                <div className={styles.emptyState}>
                  <Text variant="body-sm" color="secondary">
                    Start a {mode === 'plan' ? 'planning' : 'free-flow'} conversation for
                    {selectedProject ? ` ${selectedProject.name}` : ' the current workspace'}.
                  </Text>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`${styles.messageBubble} ${message.role === 'assistant' ? styles.assistantMessage : styles.userMessage}`}
                  >
                    <div className={styles.messageMetaRow}>
                      <Badge variant={message.role === 'assistant' ? 'info' : 'default'} size="sm">
                        {message.role}
                      </Badge>
                      {message.provider && <Badge variant="default" size="sm">{message.provider}</Badge>}
                      {message.finalState && <Badge variant="default" size="sm">{message.finalState}</Badge>}
                      {message.streaming && (
                        <Badge variant="warning" size="sm">
                          {message.streamingSource === 'delta' ? 'live text' : 'streaming'}
                        </Badge>
                      )}
                      {message.createdAt && (
                        <Text variant="caption" color="muted">{formatTimestamp(message.createdAt)}</Text>
                      )}
                    </div>
                    <Text variant="body-sm" className={styles.messageText}>{message.content}</Text>
                    {message.response && message.response.turns.length > 0 && (
                      <div className={styles.turnList}>
                        {message.response.turns.map((turn) => (
                          <div key={`${message.id}-${turn.turn_index}`} className={styles.turnItem}>
                            <Text variant="caption" color="muted">
                              #{turn.turn_index} {turn.from_state} → {turn.to_state}
                            </Text>
                            <Text variant="body-sm" className={styles.turnText}>
                              <strong>{turn.directive_kind}:</strong> {turn.directive_text}
                            </Text>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <textarea
              className={styles.composer}
              placeholder={modeCopy.placeholder}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              disabled={!hasChatApi || sending}
            />

            <div className={styles.actionRow}>
              <Button
                variant="primary"
                icon={<Send size={14} />}
                loading={sending}
                disabled={sendDisabled}
                onClick={() => void handleSend()}
              >
                Send
              </Button>
              <Button variant="secondary" onClick={startNewChat}>New Chat</Button>
              <Button variant="secondary" icon={<GitBranch size={14} />} onClick={() => navigate('/flows')}>
                Open Flows
              </Button>
              <Button variant="secondary" onClick={() => navigate('/tasks')}>
                Inspect Task Attempts
              </Button>
            </div>

            <Text variant="caption" color={hasChatApi ? 'muted' : 'warning'}>
              {hasChatApi
                ? `Chat uses persisted sessions${hasChatStreamApi ? ' with live stream events, reconnect, and cursor-based resync' : ''}. Press Ctrl/Cmd+Enter to send.`
                : 'The current backend still does not advertise a chat endpoint, so send remains disabled.'}
            </Text>
            {error && <Text variant="body-sm" color="error">{error}</Text>}
          </Stack>
        </Card>

        <div className={styles.sideColumn}>
          <Card variant="outlined">
            <Stack gap={3}>
              <div className={styles.sectionHeaderRow}>
                <Text variant="h4">Stream access</Text>
                <Badge variant={streamStatusMeta.variant} size="sm">{streamStatusMeta.label}</Badge>
              </div>
              <label className={styles.fieldGroup}>
                <Text variant="caption" color="muted">Actor ID</Text>
                <input
                  className={styles.textInput}
                  value={chatActor}
                  onChange={(event) => setChatActor(event.target.value)}
                  placeholder="anonymous"
                />
              </label>
              <label className={styles.fieldGroup}>
                <Text variant="caption" color="muted">Access token</Text>
                <input
                  className={styles.textInput}
                  type="password"
                  value={chatAccessToken}
                  onChange={(event) => setChatAccessToken(event.target.value)}
                  placeholder="Optional unless server requires --chat-api-token"
                />
              </label>
              <div className={styles.streamControlsRow}>
                <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={handleReconnectStream}>
                  Reconnect & resync
                </Button>
                <Button
                  variant="ghost"
                  icon={<Shield size={14} />}
                  onClick={() => setChatAccessToken('')}
                  disabled={!chatAccessToken}
                >
                  Clear token
                </Button>
              </div>
              <div className={styles.detailList}>
                <Text variant="caption" color="muted">
                  {lastStreamCursor ? `Last durable cursor: ${lastStreamCursor}` : 'No durable cursor recorded yet.'}
                </Text>
                <Text variant="caption" color="muted">
                  Browser SSE uses query-based `actor` / `access_token` so authenticated streams can reconnect cleanly.
                </Text>
              </div>
            </Stack>
          </Card>

          <Card variant="outlined">
            <Stack gap={3}>
              <div className={styles.sectionHeaderRow}>
                <Text variant="h4">Sessions</Text>
                <Button variant="ghost" onClick={() => void refreshSessions()} disabled={!hasChatApi || loadingSessions}>
                  Refresh
                </Button>
              </div>
              <label className={styles.fieldGroup}>
                <Text variant="caption" color="muted">Open by session ID</Text>
                <div className={styles.sessionLookupRow}>
                  <input
                    className={styles.textInput}
                    value={sessionLookupValue}
                    onChange={(event) => setSessionLookupValue(event.target.value)}
                    placeholder="Paste a session ID"
                  />
                  <Button variant="secondary" onClick={handleOpenSessionLookup} disabled={!sessionLookupValue.trim()}>
                    Open
                  </Button>
                </div>
              </label>
              <div className={styles.sessionList}>
                {loadingSessions ? (
                  <Text variant="body-sm" color="secondary">Loading sessions…</Text>
                ) : sessions.length === 0 ? (
                  <Text variant="body-sm" color="secondary">
                    No chat sessions yet for {selectedProject?.name ?? 'the current scope'}.
                  </Text>
                ) : (
                  sessions.map((session) => (
                    <button
                      key={session.session_id}
                      className={`${styles.sessionRow} ${session.session_id === selectedSessionId ? styles.activeSessionRow : ''}`}
                      onClick={() => setSelectedSessionId(session.session_id)}
                    >
                      <div className={styles.sessionRowHeader}>
                        <Text variant="body-sm" className={styles.sessionTitle}>{session.title}</Text>
                        <Badge variant="default" size="sm">{session.mode}</Badge>
                      </div>
                      {session.owner_actor_id && (
                        <Text variant="caption" color="muted">Actor: {session.owner_actor_id}</Text>
                      )}
                      {session.last_message_preview && (
                        <Text variant="caption" color="muted">{session.last_message_preview}</Text>
                      )}
                    </button>
                  ))
                )}
              </div>
            </Stack>
          </Card>

          <Card variant="outlined">
            <Stack gap={3}>
              <Text variant="h4">Session scope</Text>
              <label className={styles.fieldGroup}>
                <Text variant="caption" color="muted">Task context</Text>
                <select
                  className={styles.select}
                  value={selectedTaskId ?? ''}
                  onChange={(event) => setSelectedTaskId(event.target.value || null)}
                  disabled={Boolean(selectedSessionId)}
                >
                  <option value="">No task binding</option>
                  {projectTasks.map((task) => (
                    <option key={task.id} value={task.id}>{task.title}</option>
                  ))}
                </select>
              </label>
              <label className={styles.fieldGroup}>
                <Text variant="caption" color="muted">Flow context</Text>
                <select
                  className={styles.select}
                  value={selectedFlowId ?? ''}
                  onChange={(event) => setSelectedFlowId(event.target.value || null)}
                  disabled={Boolean(selectedSessionId)}
                >
                  <option value="">No flow binding</option>
                  {projectFlows.map((flow) => (
                    <option key={flow.id} value={flow.id}>{flow.id}</option>
                  ))}
                </select>
              </label>
              <Text variant="caption" color="muted">
                {selectedSessionId
                  ? 'Existing sessions keep their original project/task/flow bindings.'
                  : 'Task and flow bindings are applied when the next new session is created.'}
              </Text>
            </Stack>
          </Card>

          <Card variant="outlined">
            <Stack gap={3}>
              <Text variant="h4">Current workspace</Text>
              <div className={styles.statsGrid}>
                <div className={styles.statTile}>
                  <Text variant="caption" color="muted">Project</Text>
                  <Text variant="h4">{selectedProject?.name ?? 'All projects'}</Text>
                </div>
                <div className={styles.statTile}>
                  <Text variant="caption" color="muted">Tasks</Text>
                  <Text variant="h3">{projectTaskCount}</Text>
                </div>
                <div className={styles.statTile}>
                  <Text variant="caption" color="muted">Flows</Text>
                  <Text variant="h3">{projectFlowCount}</Text>
                </div>
              </div>
              <Text variant="body-sm" color="secondary">
                Chat now persists thread history, binds optional task/flow context, and can stream loop progress over SSE while Tasks still gives the richest attempt/runtime inspection experience.
              </Text>
            </Stack>
          </Card>

          <Card variant="outlined">
            <Stack gap={2}>
              <Text variant="h4">Latest response trace</Text>
              {latestAssistantResponse ? (
                <>
                  <div className={styles.endpointList}>
                    <code>{latestAssistantResponse.provider}</code>
                    <code>{latestAssistantResponse.model}</code>
                    <code>{latestAssistantResponse.final_state}</code>
                  </div>
                  <Text variant="body-sm" color="secondary">
                    Runtime source: {latestAssistantResponse.runtime_selection_source ?? 'server defaults'}
                  </Text>
                  <Text variant="body-sm" color="secondary">
                    Transport: {latestAssistantResponse.transport.active_transport ?? 'n/a'} · attempts {latestAssistantResponse.transport.attempts.length}
                  </Text>
                </>
              ) : (
                <Text variant="body-sm" color="secondary">
                  Send a message to inspect the selected provider/model, loop turns, and transport telemetry.
                </Text>
              )}
            </Stack>
          </Card>
        </div>
      </div>
    </div>
  );
}