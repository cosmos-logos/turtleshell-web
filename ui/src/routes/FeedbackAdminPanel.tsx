import { useEffect, useMemo, useState } from 'react';
import { Inbox, Loader2, MessageSquare, Send, CheckCheck, X, ChevronRight } from 'lucide-react';
import {
  feedbackClient,
  isFeedbackAuthzFailure,
  type FeedbackRecord,
} from '@/lib/api/feedback-client';

/**
 * Hidden SuperAdmin triage panel embedded in the Feedback route.
 *
 * Gating is probe-based: on mount we call `feedbackClient.listAdmin()`.
 * If the server accepts the call, the panel renders. If the server throws
 * an authz-shaped error (see `isFeedbackAuthzFailure`), the panel stays
 * hidden — non-admins never see it exists. Transient errors (network)
 * surface inline without hiding, so a hiccup doesn't blink the panel
 * for a real admin.
 *
 * Wired to the new generic `/v1/app/feedback/turtleshell/admin*`
 * endpoints (Feedback__c-backed). Admin sees feedback from BOTH web and
 * iOS surfaces — they share one Application + one queue.
 */
export function FeedbackAdminPanel() {
  type Access = 'unknown' | 'allowed' | 'denied';

  const [access, setAccess] = useState<Access>('unknown');
  const [all, setAll] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'unread' | 'all'>('unread');
  const [selected, setSelected] = useState<FeedbackRecord | null>(null);

  useEffect(() => {
    void probeAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function probeAndLoad() {
    setLoading(true);
    try {
      const rows = await feedbackClient.listAdmin();
      setAll(rows);
      setAccess('allowed');
      setError(null);
    } catch (e) {
      if (isFeedbackAuthzFailure(e)) {
        setAccess('denied');
      } else {
        // Transient — leave access as-is, surface a note
        setError(e instanceof Error ? e.message : 'Failed to load admin queue.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (access === 'denied') return;
    setLoading(true);
    try {
      const rows = await feedbackClient.listAdmin();
      setAll(rows);
      setError(null);
    } catch (e) {
      if (isFeedbackAuthzFailure(e)) {
        setAccess('denied');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to refresh.');
      }
    } finally {
      setLoading(false);
    }
  }

  // Local filter — instant toggle, no round-trip.
  const queue = useMemo(() => {
    if (filter === 'unread') return all.filter((r) => r.status === 'New');
    return all;
  }, [all, filter]);

  // "Waiting on a reply" = anything we haven't replied to or closed.
  const unrespondedCount = all.filter(
    (r) => r.status !== 'Responded' && r.status !== 'Resolved' && r.status !== 'WontFix',
  ).length;

  function onUpdated(updated: FeedbackRecord) {
    setAll((prev) => {
      const idx = prev.findIndex((r) => r.id === updated.id);
      if (idx === -1) return [updated, ...prev];
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
    setSelected(updated);
  }

  if (access !== 'allowed') return null;

  return (
    <section className="p-5 rounded-xl border border-shell-500/30 bg-shell-500/[0.03] space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-shell-400 text-xs uppercase tracking-[0.3em] font-semibold">
            <Inbox size={14} />
            Admin Queue
          </div>
          <div className="text-base font-semibold text-text-primary">
            {unrespondedCount === 0
              ? 'All caught up. Thank you.'
              : `${unrespondedCount} waiting on a personal reply`}
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-xs text-text-muted hover:text-shell-400 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Refresh'}
        </button>
      </header>

      <div className="flex items-center gap-2">
        <FilterPill label="Unread" active={filter === 'unread'} onClick={() => setFilter('unread')} />
        <FilterPill label="All" active={filter === 'all'} onClick={() => setFilter('all')} />
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
          {error}
        </div>
      )}

      {queue.length === 0 ? (
        <div className="py-6 text-center text-xs text-text-muted">
          {filter === 'unread' ? 'Nothing unread. Breathe.' : 'No feedback yet.'}
        </div>
      ) : (
        <ul className="space-y-2">
          {queue.map((r) => {
            const answerPills = extractAnswerPills(r.structuredData);
            return (
              <li key={r.id}>
                <button
                  onClick={() => setSelected(r)}
                  className="w-full text-left p-3 rounded-lg bg-surface-1 border border-border-muted hover:border-shell-500/40 transition-colors flex items-start gap-3"
                >
                  <StatusDot status={r.status} />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-2xs text-text-muted flex-wrap">
                      <span className="font-semibold">{r.name}</span>
                      <span>·</span>
                      <span>{formatDate(r.createdAt)}</span>
                      {r.submittedByUsername && (
                        <>
                          <span>·</span>
                          <span className="text-shell-400">@{r.submittedByUsername}</span>
                        </>
                      )}
                      <span className="px-1.5 py-0.5 bg-surface-2 rounded">{r.source}</span>
                      {answerPills.map((p, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-surface-2 rounded">{p}</span>
                      ))}
                      {r.includesSessionLog && (
                        <span className="px-1.5 py-0.5 bg-shell-500/10 text-shell-400 rounded">log</span>
                      )}
                    </div>
                    {r.body && (
                      <p className="text-sm text-text-primary line-clamp-2">{r.body}</p>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-text-muted/40 mt-1 flex-shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <ReplyModal
          record={selected}
          onClose={() => setSelected(null)}
          onUpdated={onUpdated}
        />
      )}
    </section>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-shell-500 text-white'
          : 'bg-surface-2 text-text-muted hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  );
}

function StatusDot({ status }: { status: FeedbackRecord['status'] }) {
  const cls =
    status === 'New' || status === 'Triaged'
      ? 'bg-amber-400'
      : status === 'Read'
        ? 'bg-text-muted/60'
        : status === 'InProgress'
          ? 'bg-blue-400'
          : 'bg-shell-400'; // Responded | Resolved | WontFix
  return <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${cls}`} />;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

/** Pull display labels from `structuredData.answers`. Tolerant of
 *  null/unparseable structuredData (returns empty array). */
function extractAnswerPills(
  structuredData: FeedbackRecord['structuredData'],
): string[] {
  if (!structuredData || typeof structuredData === 'string') return [];
  const data = structuredData as Record<string, unknown>;
  const answers = data.answers;
  if (!answers || typeof answers !== 'object') return [];
  return Object.values(answers as Record<string, unknown>)
    .map((v) => (Array.isArray(v) ? v.join(', ') : String(v)))
    .filter((s) => s.length > 0);
}

// ────────────────────────────────────────────────────────────────
// Reply modal
//
// Read-only when the row is already Responded — a reply is a one-shot
// (user already got the email; letting admin rewrite history would be
// misleading). Otherwise shows a text editor + Send + optional Mark-read.
// ────────────────────────────────────────────────────────────────

function ReplyModal({
  record,
  onClose,
  onUpdated,
}: {
  record: FeedbackRecord;
  onClose: () => void;
  onUpdated: (r: FeedbackRecord) => void;
}) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = record.status === 'Responded';
  const answerPills = extractAnswerPills(record.structuredData);
  const structuredKey =
    record.structuredData &&
    typeof record.structuredData !== 'string' &&
    typeof (record.structuredData as Record<string, unknown>).surveyKey === 'string'
      ? ((record.structuredData as Record<string, unknown>).surveyKey as string)
      : null;

  async function send() {
    const trimmed = message.trim();
    if (!trimmed || sending) return;
    setError(null);
    setSending(true);
    try {
      const updated = await feedbackClient.respondAdmin(record.id, trimmed);
      onUpdated(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed — try again.');
      setSending(false);
    }
  }

  async function markRead() {
    if (sending) return;
    setSending(true);
    try {
      const updated = await feedbackClient.markReadAdmin(record.id);
      onUpdated(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mark-read failed.');
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-surface-0 border border-border-muted rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-border-muted">
          <div>
            <div className="text-xs text-text-muted font-semibold tracking-wider">
              {record.name} · {formatDate(record.createdAt)}
              {record.submittedByUsername && (
                <span className="text-shell-400 ml-1">· @{record.submittedByUsername}</span>
              )}
            </div>
            <div className="text-sm font-semibold text-text-primary mt-0.5">
              {locked ? 'Thread' : 'Reply'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 text-2xs bg-surface-2 rounded-full">{record.source}</span>
            {structuredKey && (
              <span className="px-2 py-0.5 text-2xs bg-surface-2 rounded-full">{structuredKey}</span>
            )}
            {answerPills.map((p, i) => (
              <span key={i} className="px-2 py-0.5 text-2xs bg-surface-2 rounded-full">{p}</span>
            ))}
            {record.clientVersion && (
              <span className="px-2 py-0.5 text-2xs bg-surface-2 rounded-full">v{record.clientVersion}</span>
            )}
            {record.includesSessionLog && (
              <span className="px-2 py-0.5 text-2xs bg-shell-500/10 text-shell-400 rounded-full">log attached</span>
            )}
          </div>

          {record.body && (
            <div className="space-y-1">
              <div className="text-2xs uppercase tracking-wider font-semibold text-text-muted">
                User said
              </div>
              <p className="text-sm text-text-primary whitespace-pre-wrap bg-surface-1 border border-border-muted rounded-lg p-3">
                {record.body}
              </p>
            </div>
          )}

          {locked ? (
            <div className="space-y-1">
              <div className="text-2xs uppercase tracking-wider font-semibold text-shell-400">
                Your reply (sent)
              </div>
              {record.adminResponse && (
                <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed bg-shell-500/5 border-l-2 border-shell-500 px-3 py-2 rounded-r">
                  {record.adminResponse}
                </div>
              )}
              {record.respondedAt && (
                <div className="text-2xs text-text-muted">
                  Sent {formatDate(record.respondedAt)}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-2xs uppercase tracking-wider font-semibold text-shell-400 flex items-center gap-1.5">
                <MessageSquare size={10} />
                Your reply
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending}
                placeholder="A personal note — the user will see your avatar + name on it, and an email lands in their inbox with homer@ on the CC."
                rows={6}
                className="w-full px-3 py-2 bg-surface-2 border border-border-muted rounded-lg text-sm transition-colors focus:outline-none focus:border-shell-500 resize-y"
              />
            </div>
          )}

          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        {!locked && (
          <footer className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border-muted">
            {record.status === 'New' ? (
              <button
                onClick={markRead}
                disabled={sending}
                className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary disabled:opacity-50"
              >
                <CheckCheck size={14} />
                Mark read
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={send}
              disabled={!message.trim() || sending}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                !message.trim() || sending
                  ? 'bg-surface-3 text-text-muted cursor-not-allowed'
                  : 'bg-shell-500 text-white hover:bg-shell-500/90 hover:-translate-y-px'
              }`}
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? 'Sending…' : 'Send reply'}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
