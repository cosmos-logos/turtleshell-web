// ui/src/routes/WhatsNew.tsx
//
// The "What's New" page — a friendly changelog + roadmap surface that tells
// the user what shipped and what's coming, in language a non-engineer can
// follow. Lives at /app/whats-new and wears a pulsing dot in the sidebar
// whenever there's a release note newer than the user's last visit.
//
// Copy comes from `data/whats-new.ts`. Every PR that changes user-visible
// behavior in turtleshell-web is expected to append to that file — see the
// contribution contract at the top of the data module.

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Compass, BookOpen, ShieldCheck, Heart } from 'lucide-react';
import { RELEASE_NOTES, ROADMAP } from '@/data/whats-new';
import { markWhatsNewSeen } from '@/lib/whats-new-state';

function formatFriendlyDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function WhatsNew() {
  // Mark the page as seen on mount so the sidebar's unread dot clears.
  // Run once on mount regardless of route revisits within the same mount.
  useEffect(() => {
    markWhatsNewSeen();
    // Emit a lightweight event so the sidebar can re-read the seen timestamp
    // without waiting for an unrelated re-render. Same pattern the shells
    // badge uses for `shells:updated`.
    try { window.dispatchEvent(new Event('whats-new:seen')); } catch {}
  }, []);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto py-10 px-4 space-y-10">

        {/* Header */}
        <header className="space-y-3">
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2.5">
            <Sparkles size={24} className="text-shell-400" />
            What's new
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Every change we ship, in plain language. If something here
            confuses you, that's on us — write to us via Leave Feedback
            and we'll fix the words.
          </p>
        </header>

        {/* Shipping Now */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={14} /> Shipping now
          </h2>
          <div className="space-y-4">
            {RELEASE_NOTES.map((note, i) => (
              <article
                key={`${note.date}-${i}`}
                className="p-5 rounded-xl bg-surface-1 border border-border-muted space-y-3"
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <h3 className="text-base font-semibold text-text-primary leading-snug">
                    {note.title}
                  </h3>
                  <time
                    dateTime={note.date}
                    className="text-2xs uppercase tracking-[0.18em] text-text-muted shrink-0"
                  >
                    {formatFriendlyDate(note.date)}
                  </time>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {note.body}
                </p>
                {note.bullets && note.bullets.length > 0 && (
                  <ul className="space-y-1.5 pt-1">
                    {note.bullets.map((b, j) => (
                      <li
                        key={j}
                        className="text-sm text-text-secondary leading-relaxed flex gap-2.5"
                      >
                        <span className="text-shell-400 shrink-0" aria-hidden>•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* Roadmap */}
        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Compass size={14} /> What we're working on
            </h2>
            <div className="px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
              Our roadmap is what we <em>hope</em> to build — it is not a
              promise. Features move, shift, or get replaced by better ones
              as we learn from you. Everything here is subject to change.
            </div>
          </div>
          <div className="space-y-3">
            {ROADMAP.map((item, i) => (
              <article
                key={i}
                className="p-5 rounded-xl bg-surface-1 border border-dashed border-border-muted space-y-2"
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <h3 className="text-base font-semibold text-text-primary leading-snug">
                    {item.title}
                  </h3>
                  {item.eta && (
                    <span className="text-2xs uppercase tracking-[0.18em] text-shell-400 shrink-0">
                      {item.eta}
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Learn more */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <BookOpen size={14} /> Learn more
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              to="/app/docs"
              className="p-4 rounded-xl bg-surface-1 border border-border-muted hover:border-shell-500/40 transition-colors space-y-2"
            >
              <BookOpen size={16} className="text-shell-400" />
              <div className="text-sm font-semibold text-text-primary">Documentation</div>
              <div className="text-2xs text-text-muted leading-relaxed">
                How TurtleShell works, from shells to agents to causes.
              </div>
            </Link>
            <Link
              to="/security"
              className="p-4 rounded-xl bg-surface-1 border border-border-muted hover:border-shell-500/40 transition-colors space-y-2"
            >
              <ShieldCheck size={16} className="text-shell-400" />
              <div className="text-sm font-semibold text-text-primary">Security</div>
              <div className="text-2xs text-text-muted leading-relaxed">
                What we do to keep your data yours. Plain language, not lawyer-speak.
              </div>
            </Link>
            <Link
              to="/causes"
              className="p-4 rounded-xl bg-surface-1 border border-border-muted hover:border-shell-500/40 transition-colors space-y-2"
            >
              <Heart size={16} className="text-shell-400" />
              <div className="text-sm font-semibold text-text-primary">Causes</div>
              <div className="text-2xs text-text-muted leading-relaxed">
                The seven causes your shells fund. Pick one at onboarding — it's permanent.
              </div>
            </Link>
          </div>
        </section>

        {/* Footer nudge */}
        <footer className="pt-4 border-t border-border-muted text-xs text-text-muted leading-relaxed text-center">
          Notice something we should fix, or something that should be here?
          Use <Link to="/app/feedback" className="text-shell-400 hover:text-shell-300 underline underline-offset-2">Leave Feedback</Link> —
          a real person reads every message.
        </footer>

      </div>
    </div>
  );
}
