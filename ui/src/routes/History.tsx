import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  FileText,
  Image,
  Zap,
  Trash2,
  Bookmark,
  Loader2,
  Clock,
  ChevronRight,
  Play,
} from 'lucide-react';
import { useChatStore } from '@/lib/store/chat-store';
import { useEnvironmentStore } from '@/lib/store/environment-store';
import { useTestBetaEnabled } from '@/lib/beta';
import type { ChatMessage } from '@/types/chat';

type Category = 'all' | 'conversations' | 'logs' | 'images' | 'actions';

interface SavedConversation {
  id: string;
  data: {
    shellId: string;
    title: string;
    turns: { role: 'user' | 'assistant'; content: string; timestamp: string }[];
    messageCount: number;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}

// ── Seed Memories ─────────────────────────────────────
// These are pre-built conversation starters that are always available.
// Clicking a seed prefills the prompt in Chat and lets the user send it.

interface SeedMemory {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: string;
}

const SEED_MEMORIES: SeedMemory[] = [
  {
    id: 'seed-inception',
    title: 'Inception',
    description: 'Begin your journey. Let the agent introduce itself.',
    prompt: 'Who are you?',
    icon: '\u2728',
  },
];

// ── Categories + Mock Data ────────────────────────────

// All tabs (shown when Test Beta Features is on). Non-beta users see only
// "Conversations" — logs/images/actions are currently mock-data surfaces
// that don't yet round-trip from Mnemosyne/Plutus, so they're confusing
// for regular signups.
const CATEGORIES_ALL: { key: Category; label: string; icon: typeof MessageSquare }[] = [
  { key: 'all', label: 'All', icon: Clock },
  { key: 'conversations', label: 'Conversations', icon: MessageSquare },
  { key: 'logs', label: 'Logs', icon: FileText },
  { key: 'images', label: 'Images', icon: Image },
  { key: 'actions', label: 'Actions', icon: Zap },
];
const CATEGORIES_BETA_OFF: typeof CATEGORIES_ALL = [
  { key: 'conversations', label: 'Conversations', icon: MessageSquare },
];

const MOCK_LOGS = [
  { id: 'log-1', title: 'System boot log', timestamp: '2026-03-05T08:00:00Z', type: 'log' },
  { id: 'log-2', title: 'API error trace', timestamp: '2026-03-04T14:30:00Z', type: 'log' },
  { id: 'log-3', title: 'Deployment log', timestamp: '2026-03-04T10:15:00Z', type: 'log' },
  { id: 'log-4', title: 'Health check failures', timestamp: '2026-03-03T22:45:00Z', type: 'log' },
];

const MOCK_IMAGES = [
  { id: 'img-1', title: 'Screenshot: Dashboard', timestamp: '2026-03-05T09:00:00Z', type: 'image' },
  { id: 'img-2', title: 'Generated diagram', timestamp: '2026-03-04T16:00:00Z', type: 'image' },
  { id: 'img-3', title: 'Architecture overview', timestamp: '2026-03-03T11:20:00Z', type: 'image' },
];

const MOCK_ACTIONS = [
  { id: 'act-1', title: 'Created Salesforce case #12345', timestamp: '2026-03-05T10:00:00Z', type: 'action' },
  { id: 'act-2', title: 'Updated contact record', timestamp: '2026-03-04T15:30:00Z', type: 'action' },
  { id: 'act-3', title: 'Sent Slack notification', timestamp: '2026-03-03T09:45:00Z', type: 'action' },
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const TYPE_BADGES = {
  conversation: { color: 'bg-shell-500/20 text-shell-400', label: 'Conversation' },
  seed: { color: 'bg-amber-500/20 text-amber-400', label: 'Seed' },
  log: { color: 'bg-blue-500/20 text-blue-400', label: 'Log' },
  image: { color: 'bg-purple-500/20 text-purple-400', label: 'Image' },
  action: { color: 'bg-green-500/20 text-green-400', label: 'Action' },
} as const;

export function History() {
  const navigate = useNavigate();
  const testBetaEnabled = useTestBetaEnabled();
  const CATEGORIES = testBetaEnabled ? CATEGORIES_ALL : CATEGORIES_BETA_OFF;
  // Beta-off users land directly on "Conversations" since it's the only tab
  const [category, setCategory] = useState<Category>(testBetaEnabled ? 'all' : 'conversations');
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { saveConversation, setSaveConversation, memoryEnabled, resumeConversation, startFromSeed, clearAllHistory } = useChatStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const mnUrl = useEnvironmentStore.getState().getMnemosyneUrl();
      const ogToken = localStorage.getItem('og_access_token');
      const headers: Record<string, string> = {};
      if (ogToken) headers['x-user-identity'] = ogToken;
      const res = await fetch(`${mnUrl}/api/conversation/saved`, { headers });
      if (res.ok) {
        const data = await res.json();
        setConversations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('[History] Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleResume = async (conv: SavedConversation) => {
    let turns: ChatMessage[] = [];
    // List endpoint returns empty turns for performance — fetch full conversation
    if (!conv.data.turns || conv.data.turns.length === 0) {
      try {
        const mnUrl = useEnvironmentStore.getState().getMnemosyneUrl();
        const ogToken = localStorage.getItem('og_access_token');
        const headers: Record<string, string> = {};
        if (ogToken) headers['x-user-identity'] = ogToken;
        const res = await fetch(`${mnUrl}/api/conversation/saved/${conv.id}`, { headers });
        if (res.ok) {
          const full = await res.json();
          const fullTurns = full?.data?.turns || [];
          turns = fullTurns.map((t: any, i: number) => ({
            id: `${conv.id}-${i}`,
            role: t.role,
            content: t.content,
            timestamp: new Date(t.timestamp).getTime(),
          }));
        }
      } catch (err) {
        console.warn('[History] Failed to fetch conversation turns:', err);
      }
    } else {
      turns = conv.data.turns.map((t, i) => ({
        id: `${conv.id}-${i}`,
        role: t.role,
        content: t.content,
        timestamp: new Date(t.timestamp).getTime(),
      }));
    }
    resumeConversation(conv.id, turns);
    navigate('/app/chat');
  };

  const handleSeed = (seed: SeedMemory) => {
    startFromSeed(seed.prompt);
    navigate('/app/chat');
  };

  const handleDelete = async (id: string) => {
    try {
      const mnUrl = useEnvironmentStore.getState().getMnemosyneUrl();
      const ogToken = localStorage.getItem('og_access_token');
      const headers: Record<string, string> = {};
      if (ogToken) headers['x-user-identity'] = ogToken;
      const res = await fetch(`${mnUrl}/api/conversation/saved/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.warn('[History] Failed to delete conversation:', err);
    }
    setDeleteConfirm(null);
  };

  const showConversations = category === 'all' || category === 'conversations';
  const showLogs = category === 'all' || category === 'logs';
  const showImages = category === 'all' || category === 'images';
  const showActions = category === 'all' || category === 'actions';

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">History</h1>
          <p className="text-sm text-text-muted mt-1">
            Your activity timeline across conversations, logs, and actions.
          </p>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 p-1 bg-surface-1 rounded-xl border border-border-muted">
          {CATEGORIES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                category === key
                  ? 'bg-surface-3 text-text-primary'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Conversations section */}
        {showConversations && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <MessageSquare size={14} /> Conversations
              </h2>
              <div className="flex items-center gap-2">
                {showClearConfirm ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={async () => {
                        clearAllHistory();
                        // Also delete all server-side saved conversations
                        const mnUrl = useEnvironmentStore.getState().getMnemosyneUrl();
                        const ogToken = localStorage.getItem('og_access_token');
                        const delHeaders: Record<string, string> = {};
                        if (ogToken) delHeaders['x-user-identity'] = ogToken;
                        for (const conv of conversations) {
                          try { await fetch(`${mnUrl}/api/conversation/saved/${conv.id}`, { method: 'DELETE', headers: delHeaders }); } catch {}
                        }
                        setConversations([]);
                        setShowClearConfirm(false);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium text-text-muted hover:bg-surface-2 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={12} />
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setSaveConversation(!saveConversation)}
                  disabled={!memoryEnabled}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    !memoryEnabled
                      ? 'opacity-40 cursor-not-allowed text-text-muted'
                      : saveConversation
                        ? 'text-shell-400 bg-shell-500/10'
                        : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
                  }`}
                >
                  <Bookmark size={12} />
                  Auto-Save
                  <div className={`w-1.5 h-1.5 rounded-full ${saveConversation && memoryEnabled ? 'bg-shell-400' : 'bg-surface-3'}`} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {/* Seed memories — always shown first */}
              {SEED_MEMORIES.map((seed) => (
                <div
                  key={seed.id}
                  onClick={() => handleSeed(seed)}
                  className="group flex items-center gap-3 p-4 bg-gradient-to-r from-amber-500/5 to-shell-500/5 border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-all cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-base flex-shrink-0">
                    {seed.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary">{seed.title}</span>
                      <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_BADGES.seed.color}`}>
                        Seed
                      </span>
                    </div>
                    <div className="text-2xs text-text-muted mt-0.5">{seed.description}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-2xs text-amber-400/60 font-mono hidden group-hover:inline">&ldquo;{seed.prompt}&rdquo;</span>
                    <Play size={14} className="text-amber-400/40 group-hover:text-amber-400 transition-colors" />
                  </div>
                </div>
              ))}

              {/* Saved conversations */}
              {loading ? (
                <div className="flex items-center justify-center py-8 text-text-muted">
                  <Loader2 size={20} className="animate-spin mr-2" />
                  Loading conversations...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-5 bg-surface-1 border border-border-muted rounded-xl text-center">
                  <p className="text-sm text-text-muted">
                    {saveConversation
                      ? 'No saved conversations yet. Start a chat to begin.'
                      : 'Enable Auto-Save to persist conversations.'}
                  </p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="group flex items-center gap-3 p-4 bg-surface-1 border border-border-muted rounded-xl hover:border-border transition-all cursor-pointer"
                    onClick={() => handleResume(conv)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {conv.data.title}
                        </span>
                        <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_BADGES.conversation.color}`}>
                          {conv.data.messageCount} msgs
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-2xs text-text-muted">
                        <span>{formatDate(conv.metadata.createdAt)}</span>
                        <span>·</span>
                        <span>{relativeTime(conv.metadata.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {deleteConfirm === conv.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDelete(conv.id)}
                            className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 rounded text-xs text-text-muted hover:bg-surface-2 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(conv.id); }}
                            className="p-1.5 rounded-lg text-text-muted/30 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                          <ChevronRight size={14} className="text-text-muted/30 group-hover:text-text-muted transition-colors" />
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Logs section (mock) */}
        {showLogs && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <FileText size={14} /> Logs
            </h2>
            <div className="space-y-2">
              {MOCK_LOGS.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-4 bg-surface-1 border border-border-muted rounded-xl opacity-60 cursor-default"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary truncate">{item.title}</span>
                      <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_BADGES.log.color}`}>
                        {TYPE_BADGES.log.label}
                      </span>
                    </div>
                    <div className="text-2xs text-text-muted mt-1">{relativeTime(item.timestamp)}</div>
                  </div>
                  <span className="text-2xs text-text-muted/50">Coming soon</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Images section (mock) */}
        {showImages && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Image size={14} /> Images
            </h2>
            <div className="space-y-2">
              {MOCK_IMAGES.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-4 bg-surface-1 border border-border-muted rounded-xl opacity-60 cursor-default"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary truncate">{item.title}</span>
                      <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_BADGES.image.color}`}>
                        {TYPE_BADGES.image.label}
                      </span>
                    </div>
                    <div className="text-2xs text-text-muted mt-1">{relativeTime(item.timestamp)}</div>
                  </div>
                  <span className="text-2xs text-text-muted/50">Coming soon</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Actions section (mock) */}
        {showActions && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Zap size={14} /> Actions
            </h2>
            <div className="space-y-2">
              {MOCK_ACTIONS.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-4 bg-surface-1 border border-border-muted rounded-xl opacity-60 cursor-default"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary truncate">{item.title}</span>
                      <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_BADGES.action.color}`}>
                        {TYPE_BADGES.action.label}
                      </span>
                    </div>
                    <div className="text-2xs text-text-muted mt-1">{relativeTime(item.timestamp)}</div>
                  </div>
                  <span className="text-2xs text-text-muted/50">Coming soon</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
