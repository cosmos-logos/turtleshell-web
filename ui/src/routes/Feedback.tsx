import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, CheckCircle2, Heart, Send, Loader2 } from 'lucide-react';
import {
  feedbackClient,
  type FeedbackRecord,
  type FeedbackStatus,
} from '@/lib/api/feedback-client';
import { FeedbackAdminPanel } from './FeedbackAdminPanel';
import { SurveyForm } from '@/components/feedback/SurveyForm';
import { getActiveSurvey } from '@/lib/surveys/definitions';
import type { SurveyAnswers, SurveyDefinition } from '@/lib/surveys/types';
import { logSession, getSessionLogStats } from '@/lib/api/session-log';
import { FileText } from 'lucide-react';

type Step = 'form' | 'submitting' | 'confirmed';

/**
 * Leave Feedback — survey form + thread of past submissions + admin responses.
 *
 * Wired to the generic `Feedback__c` backend as of 2026-05-23. The structured
 * survey answers ride `StructuredData__c` as `{ surveyKey, answers }`; the
 * freeform comment lands in `Body__c`. The thread renderer surfaces survey
 * answers as pills above the body so old TurtleShell behavior is preserved.
 *
 * The admin reply chain renders from `adminResponse / respondedAt /
 * respondedBy*` fields on the user-list response — those land on
 * `Feedback__c` once the §6 backend handoff ships (see
 * docs/handoff-olympus-grid-feedback-admin-reply-generic.md).
 */
export function Feedback() {
  const [step, setStep] = useState<Step>('form');
  const [survey] = useState<SurveyDefinition>(() => getActiveSurvey());
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [comments, setComments] = useState('');
  const [history, setHistory] = useState<FeedbackRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeSessionLog, setIncludeSessionLog] = useState(true);

  const loadHistory = () => {
    setLoadingHistory(true);
    feedbackClient
      .list()
      .then((rows) => setHistory(rows))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const allRequiredAnswered = useMemo(() => {
    return survey.questions
      .filter((q) => q.required)
      .every((q) => {
        const a = answers[q.key];
        if (typeof a === 'string') return a.length > 0;
        if (Array.isArray(a)) return a.length > 0;
        return false;
      });
  }, [survey.questions, answers]);

  const canSubmit = allRequiredAnswered && comments.trim().length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    setStep('submitting');
    // Breadcrumbs for the attached session log — when triaging this
    // feedback later, these three lines bracket the user's intent
    // ("they clicked Send", "it landed", "it failed with X").
    logSession('ui.feedback', 'submit.start', {
      bodyChars: comments.trim().length,
      surveyKey: survey.key,
    });
    try {
      const result = await feedbackClient.submit({
        body: comments.trim(),
        source: 'Survey',
        structuredData: {
          surveyKey: survey.key,
          answers,
        },
        includeSessionLog,
      });
      logSession('ui.feedback', 'submit.success', {
        feedbackId: result.feedbackId,
        includesSessionLog: result.includesSessionLog,
        attachmentSizeBytes: result.attachmentSizeBytes,
      });
      setStep('confirmed');
      setAnswers({});
      setComments('');
      loadHistory();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong — please try again.';
      logSession('ui.feedback', 'submit.fail', { err: msg }, 'error');
      setError(msg);
      setStep('form');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 text-shell-400 text-xs uppercase tracking-[0.3em] font-semibold">
            <MessageSquare size={14} />
            Leave Feedback
          </div>
          <h1 className="text-3xl font-bold tracking-tight">We want to hear from you.</h1>
          <p className="text-base text-text-muted leading-relaxed">
            You're one of the very first humans inside TurtleShell.ai. Every note you
            leave here is read personally by <span className="text-text-primary font-medium">Homer</span>,
            the founder, and shapes what we build next. Homer is CC'd on every submission.
          </p>
        </header>

        <FeedbackAdminPanel />

        {step === 'confirmed' ? (
          <Confirmation onWriteAnother={() => setStep('form')} />
        ) : (
          <FormCard
            survey={survey}
            answers={answers}
            setAnswers={setAnswers}
            comments={comments}
            setComments={setComments}
            includeSessionLog={includeSessionLog}
            setIncludeSessionLog={setIncludeSessionLog}
            submit={submit}
            canSubmit={canSubmit}
            submitting={step === 'submitting'}
            error={error}
          />
        )}

        <ThreadSection history={history} loading={loadingHistory} />
      </div>
    </div>
  );
}

function FormCard({
  survey,
  answers,
  setAnswers,
  comments,
  setComments,
  includeSessionLog,
  setIncludeSessionLog,
  submit,
  canSubmit,
  submitting,
  error,
}: {
  survey: SurveyDefinition;
  answers: SurveyAnswers;
  setAnswers: (a: SurveyAnswers) => void;
  comments: string;
  setComments: (s: string) => void;
  includeSessionLog: boolean;
  setIncludeSessionLog: (v: boolean) => void;
  submit: () => void;
  canSubmit: boolean;
  submitting: boolean;
  error: string | null;
}) {
  // Refresh the stats whenever the user pokes the textarea — that's a
  // reliable proxy for "they're paying attention to this card" and
  // keeps the displayed event count from going stale during long edits.
  const stats = useMemo(
    () => getSessionLogStats(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [comments, includeSessionLog],
  );
  const kbApprox = (stats.rawBytes / 1024).toFixed(1);
  return (
    <section className="p-6 bg-surface-1 border border-border-muted rounded-xl space-y-5">
      <SurveyForm
        survey={survey}
        answers={answers}
        onAnswersChange={setAnswers}
        disabled={submitting}
      />

      <div className="space-y-2">
        <div className="text-sm font-semibold">Tell us everything.</div>
        <div className="text-2xs text-text-muted">
          What worked, what didn't, what you wish existed. Raw and honest — we'd rather hear it than not.
        </div>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          disabled={submitting}
          placeholder="Write like you're messaging a friend who asked how it went…"
          rows={6}
          className="w-full px-3 py-2 bg-surface-2 border border-border-muted rounded-lg text-sm transition-colors focus:outline-none focus:border-shell-500 resize-y"
        />
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Session-log attachment indicator. Visible by default so the user
          knows what's being shipped along with their feedback; toggle
          lets them opt out (no opt-in default — too easy to miss). */}
      <label className="flex items-start gap-3 px-3 py-2.5 bg-surface-2/60 border border-border-muted rounded-lg cursor-pointer hover:border-shell-500/40 transition-colors">
        <input
          type="checkbox"
          checked={includeSessionLog}
          onChange={(e) => setIncludeSessionLog(e.target.checked)}
          disabled={submitting}
          className="mt-0.5 accent-shell-500"
        />
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5 text-xs font-medium text-text-primary">
            <FileText size={12} className="text-shell-400" />
            Attach session log
          </span>
          <span className="block text-2xs text-text-muted leading-relaxed mt-0.5">
            {includeSessionLog
              ? stats.count === 0
                ? 'No events captured yet — boot just started.'
                : `${stats.count} event${stats.count === 1 ? '' : 's'} · ~${kbApprox} KB. Route changes, fetches, errors. No textarea contents, no tokens.`
              : 'No log will be attached — body + survey answers only.'}
          </span>
        </span>
      </label>

      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="text-2xs text-text-muted leading-relaxed max-w-[320px]">
          Homer is CC'd on this. You'll hear back inside your TurtleShell thread.
        </p>
        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            !canSubmit || submitting
              ? 'bg-surface-3 text-text-muted cursor-not-allowed'
              : 'bg-shell-500 text-white hover:bg-shell-500/90 hover:-translate-y-px'
          }`}
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {submitting ? 'Sending…' : 'Send feedback'}
        </button>
      </div>
    </section>
  );
}

function Confirmation({ onWriteAnother }: { onWriteAnother: () => void }) {
  return (
    <section className="p-8 bg-gradient-to-br from-shell-500/10 to-shell-500/5 border border-shell-500/30 rounded-xl text-center space-y-4">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-shell-500/20 text-shell-400">
        <CheckCircle2 size={28} />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Thank you — it landed.</h2>
        <p className="text-sm text-text-muted leading-relaxed max-w-md mx-auto">
          Homer got a copy of this personally. We'll reply inside your TurtleShell account —
          the thread shows up below as soon as we write back.
        </p>
      </div>
      <div className="pt-2 flex items-center justify-center gap-2 text-xs text-text-muted">
        <Heart size={12} className="text-shell-400" />
        <span>Every word shapes what we build next.</span>
      </div>
      <div className="pt-2">
        <button
          onClick={onWriteAnother}
          className="text-xs text-shell-400 hover:underline font-medium"
        >
          Send another →
        </button>
      </div>
    </section>
  );
}

function ThreadSection({
  history,
  loading,
}: {
  history: FeedbackRecord[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <section className="text-center py-8 text-text-muted text-xs">
        <Loader2 size={14} className="inline animate-spin mr-2" />
        Loading your feedback history…
      </section>
    );
  }
  if (history.length === 0) {
    return null;
  }
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] font-semibold text-text-muted">
        <div className="h-px flex-1 bg-border-muted" />
        Your thread
        <div className="h-px flex-1 bg-border-muted" />
      </div>
      <div className="space-y-4">
        {history.map((fb) => (
          <FeedbackEntry key={fb.id} fb={fb} />
        ))}
      </div>
    </section>
  );
}

function FeedbackEntry({ fb }: { fb: FeedbackRecord }) {
  const submittedLabel = new Date(fb.createdAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const surveyPills = extractAnswerPills(fb.structuredData);
  return (
    <div className="p-4 bg-surface-1 border border-border-muted rounded-xl space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-2xs uppercase tracking-wider text-text-muted">
            {fb.name} · {submittedLabel}
          </div>
          {surveyPills.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
              {surveyPills.map((label, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-surface-2 rounded">
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
        <StatusPill status={fb.status} />
      </div>
      {fb.body && (
        <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
          {fb.body}
        </div>
      )}
      {fb.adminResponse && (
        <div className="pt-3 border-t border-border-muted space-y-2">
          <ResponderLine fb={fb} />
          <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed bg-shell-500/5 border-l-2 border-shell-500 px-3 py-2 rounded-r">
            {fb.adminResponse}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Pull display labels from `structuredData.answers`. Used to render the
 * old "[Web] [Yes]" pills above the comment body for survey submissions.
 * Tolerant of null/unparseable structuredData (returns empty array).
 */
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

/**
 * The avatar + name + timestamp row above an admin reply. When Homer
 * replies, the user sees Homer's face, his display name, and his @handle
 * as a link to his public profile.
 */
function ResponderLine({ fb }: { fb: FeedbackRecord }) {
  const displayName = fb.respondedByName || 'TurtleShell team';
  const username = fb.respondedByUsername || null;
  const avatarUrl = fb.respondedByAvatarUrl || null;
  const isImageUrl = !!avatarUrl && /^https?:\/\//i.test(avatarUrl);
  const initials =
    displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0] || '')
      .join('')
      .toUpperCase() || 'T';
  const timestamp = fb.respondedAt
    ? new Date(fb.respondedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-full bg-shell-500/10 border border-shell-500/40 flex items-center justify-center overflow-hidden flex-shrink-0 text-sm">
        {isImageUrl ? (
          <img src={avatarUrl as string} alt={displayName} className="w-full h-full object-cover" />
        ) : avatarUrl ? (
          <span>{avatarUrl}</span>
        ) : (
          <span className="text-shell-400 font-semibold text-xs">{initials}</span>
        )}
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <div className="text-xs font-semibold text-text-primary">
          {displayName} <span className="text-text-muted font-normal">replied</span>
        </div>
        <div className="flex items-center gap-1.5 text-2xs text-text-muted">
          {username && (
            <a
              href={`https://turtleshell.ai/u/${encodeURIComponent(username)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-shell-400 hover:underline no-underline"
            >
              @{username}
            </a>
          )}
          {username && timestamp && <span>·</span>}
          {timestamp && <span>{timestamp}</span>}
        </div>
      </div>
    </div>
  );
}

const STATUS_PILLS: Record<FeedbackStatus, { label: string; classes: string }> = {
  New:        { label: 'We’ll get to this', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  Read:       { label: 'Homer read it',          classes: 'bg-surface-2 text-text-muted border-border-muted' },
  Triaged:    { label: 'Triaged',                classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  InProgress: { label: 'In progress',            classes: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  Responded:  { label: 'Replied',                classes: 'bg-shell-500/10 text-shell-400 border-shell-500/30' },
  Resolved:   { label: 'Resolved',               classes: 'bg-shell-500/10 text-shell-400 border-shell-500/30' },
  WontFix:    { label: 'Closed',                 classes: 'bg-surface-2 text-text-muted border-border-muted' },
};

function StatusPill({ status }: { status: FeedbackStatus }) {
  const s = STATUS_PILLS[status] ?? STATUS_PILLS.New;
  return (
    <span className={`px-2 py-0.5 rounded text-2xs font-medium border whitespace-nowrap ${s.classes}`}>
      {s.label}
    </span>
  );
}
