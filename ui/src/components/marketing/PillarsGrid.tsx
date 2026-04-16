import { CAUSES } from '@/lib/causes';

/**
 * Seven Pillars of Global Prosperity. The same seven entries users
 * pick from in onboarding (lib/causes.ts) — tithe cards and pillars
 * are the same concept, framed differently:
 *   - In the tithe spinner: "where your 7% flows"
 *   - In the pillars grid: "what the whole platform monetizes toward"
 * Keeping them identical (7 == 7) reinforces the 7 / 7 / ∞ thesis.
 *
 * Layout: 7-col on desktop, wraps to 4-col / 2-col on smaller screens.
 */
export function PillarsGrid() {
  return (
    <section id="pillars" className="max-w-[1200px] mx-auto px-6 md:px-16 py-24">
      <div className="text-center max-w-[680px] mx-auto mb-12">
        <div className="text-2xs uppercase tracking-[0.3em] text-shell-400 mb-3">
          The Seven Pillars
        </div>
        <h2 className="text-3xl sm:text-5xl font-semibold leading-tight tracking-tight mb-4">
          Global Prosperity Through
          <br />
          Sovereign Intelligence.
        </h2>
        <p className="text-base text-text-muted font-light">
          As the platform scales, Athena helps monetize toward global prosperity. The more users,
          the faster the algorithm comes online. Seven causes. Seven pillars. One infinite
          multiplier.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
        {CAUSES.map((c) => (
          <div
            key={c.slug}
            className="rounded-lg border border-border-muted bg-surface-1/70 px-4 py-6 text-center hover:border-shell-500/40 transition-colors"
          >
            <div className="font-mono font-bold text-2xl leading-none text-shell-400/30 mb-2">
              {c.roman}
            </div>
            <div className="text-2xl mb-2 leading-none">{c.emoji}</div>
            <div className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-text-primary leading-tight">
              {c.name}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
