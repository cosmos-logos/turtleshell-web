import { useEffect, useState } from 'react';
import { MessageSquare, CheckCircle2, Heart, Send, Loader2 } from 'lucide-react';
import {
  feedbackClient,
  type FeedbackRecord,
  type FeedbackPlatform,
  type FeedbackOnboardingSuccess,
} from '@/lib/api/feedback-client';

type Step = 'form' | 'submitting' | 'confirmed';

interface FormState {
  onboardingSuccess: FeedbackOnboardingSuccess | '';
  platform: FeedbackPlatform | '';
  comments: string;
}

const EMPTY_FORM: FormState = {
  onboardingSuccess: '',
  platform: '',
  comments: '',
};

/**
 * Leave Feedback — survey form + thread of past submissions + admin responses.
 *
 * Intentionally warm: the goal isn't to file a ticket, it's to have a short
 * direct conversation with the founder. The confirmation state reassures the
 * user that homer@ is personally CC'd on every submission, which removes the
 * "this disappeared into a black hole" feeling that kills feedback loops.
 */
export function Feedback() {
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [history, setHistory] = useState<FeedbackRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const canSubmit =
    form.onboardingSuccess !== '' && form.platform !== '' && form.comments.trim().length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    setStep('submitting');
    try {
      await feedbackClient.submit({
        onboardingSuccess: form.onboardingSuccess as FeedbackOnboardingSuccess,
        platform: form.platform as FeedbackPlatform,
        comments: form.comments.trim(),
        client: 'turtleshell-web',
        rawPayload: {
          answers: {
            onboardingSuccess: form.onboardingSuccess,
            platform: form.platform,
            comments: form.comments.trim(),
          },
          submittedAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
        },
      });
      setStep('confirmed');
      setForm(EMPTY_FORM);
      loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong — please try again.');
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

        {step === 'confirmed' ? (
          <Confirmation onWriteAnother={() => setStep('form')} />
        ) : (
          <FormCard
            form={form}
            setForm={setForm}
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
  form,
  setForm,
  submit,
  canSubmit,
  submitting,
  error,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  submit: () => void;
  canSubmit: boolean;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <section className="p-6 bg-surface-1 border border-border-muted rounded-xl space-y-5">
      <div className="space-y-2">
        <div className="text-sm font-semibold">How did onboarding go?</div>
        <div className="flex flex-col sm:flex-row gap-2">
          {(
            [
              { value: 'Yes', label: 'Smooth — no problems' },
              { value: 'Partially', label: 'Partially — some friction' },
              { value: 'No', label: 'I got stuck' },
            ] as const
          ).map((opt) => {
            const selected = form.onboardingSuccess === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setForm({ ...form, onboardingSuccess: opt.value })}
                disabled={submitting}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium border transition-colors text-left ${
                  selected
                    ? 'bg-shell-500/10 border-shell-500 text-text-primary'
                    : 'bg-surface-2 border-border-muted text-text-secondary hover:border-shell-500/40'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold">Which platform?</div>
        <div className="flex gap-2 flex-wrap">
          {(['Web', 'iOS', 'Both', 'Other'] as const).map((p) => {
            const selected = form.platform === p;
            return (
              <button
                key={p}
                onClick={() => setForm({ ...form, platform: p })}
                disabled={submitting}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selected
                    ? 'bg-shell-500/10 border-shell-500 text-text-primary'
                    : 'bg-surface-2 border-border-muted text-text-secondary hover:border-shell-500/40'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold">Tell us everything.</div>
        <div className="text-2xs text-text-muted">
          What worked, what didn't, what you wish existed. Raw and honest — we'd rather hear it than not.
        </div>
        <textarea
          value={form.comments}
          onChange={(e) => setForm({ ...form, comments: e.target.value })}
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
  const submittedLabel = new Date(fb.createdDate).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return (
    <div className="p-4 bg-surface-1 border border-border-muted rounded-xl space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-2xs uppercase tracking-wider text-text-muted">
            {fb.name} · {submittedLabel}
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            {fb.platform && <span className="px-1.5 py-0.5 bg-surface-2 rounded">{fb.platform}</span>}
            {fb.onboardingSuccess && (
              <span className="px-1.5 py-0.5 bg-surface-2 rounded">{fb.onboardingSuccess}</span>
            )}
          </div>
        </div>
        <StatusPill status={fb.status} />
      </div>
      {fb.comments && (
        <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
          {fb.comments}
        </div>
      )}
      {fb.adminResponse && (
        <div className="pt-3 border-t border-border-muted space-y-2">
          <div className="text-2xs uppercase tracking-wider text-shell-400 font-semibold">
            Reply from TurtleShell
            {fb.respondedAt && (
              <span className="text-text-muted ml-2 normal-case tracking-normal">
                {new Date(fb.respondedAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            )}
          </div>
          <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed bg-shell-500/5 border-l-2 border-shell-500 px-3 py-2 rounded-r">
            {fb.adminResponse}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: FeedbackRecord['status'] }) {
  const map: Record<FeedbackRecord['status'], { label: string; classes: string }> = {
    Unread: { label: 'We\u2019ll get to this', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    Read: { label: 'Homer read it', classes: 'bg-surface-2 text-text-muted border-border-muted' },
    Responded: { label: 'Replied', classes: 'bg-shell-500/10 text-shell-400 border-shell-500/30' },
  };
  const s = map[status];
  return (
    <span className={`px-2 py-0.5 rounded text-2xs font-medium border whitespace-nowrap ${s.classes}`}>
      {s.label}
    </span>
  );
}
