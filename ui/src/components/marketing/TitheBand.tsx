import { Link } from 'react-router-dom';
import { CAUSES } from '@/lib/causes';

/**
 * The Tithe section — full-bleed dark-surface band. All seven causes
 * (identical to the onboarding picker) cycle through an infinite
 * marquee spinner so the visitor can see every pillar without
 * scrolling. Pauses on hover so the card under the cursor can be
 * read. Hero stats read "7% · 7 pillars · ∞" — the three-number
 * signature of the whole thesis.
 */
export function TitheBand() {
  // Render the cause list twice so the CSS marquee can loop seamlessly:
  // when the strip translates by -50% the second copy is exactly where
  // the first copy started. See `.cause-marquee` keyframe in globals.css.
  const doubled = [...CAUSES, ...CAUSES];

  return (
    <section id="tithe" className="relative bg-surface-1 border-y border-border-muted">
      <div className="max-w-[1200px] mx-auto px-6 md:px-16 py-24">
        <div className="text-center max-w-[640px] mx-auto mb-10">
          <div className="text-2xs uppercase tracking-[0.3em] text-shell-400 mb-3">
            The Tithe
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold leading-tight tracking-tight mb-4">
            7% of Everything.
            <br />
            Before Pricing. Before Profit.
          </h2>
        </div>

        <div className="flex justify-center mb-10">
          <div className="text-center">
            <div className="font-mono font-bold text-6xl leading-none text-shell-400 mb-3">
              7%
            </div>
            <div className="text-sm text-text-muted font-light max-w-[560px]">
              of every transaction, every turn, every shell — tithes automatically to global good.
            </div>
          </div>
        </div>

        <p className="max-w-[700px] mx-auto text-center text-base text-text-muted font-light leading-loose mb-12">
          Before you see the pricing page, you choose your cause. This is not a feature. This is{' '}
          <strong className="text-shell-400 font-medium">the thesis</strong>. The tithe is
          non-negotiable — it is the economic identity of TurtleShell.ai. The more the platform grows,
          the faster the multiplier reaches scale.{' '}
          <strong className="text-shell-400 font-medium">
            This is how we build heaven on Earth.
          </strong>
        </p>

        {/* Infinite spinner — 7 causes cycling continuously. Fade masks
            on both edges so cards enter/exit softly rather than popping. */}
        <div
          className="relative cause-marquee-wrap overflow-hidden mb-12"
          style={{
            maskImage:
              'linear-gradient(90deg, transparent 0, black 8%, black 92%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(90deg, transparent 0, black 8%, black 92%, transparent 100%)',
          }}
        >
          <div className="flex gap-5 cause-marquee py-2">
            {doubled.map((cause, i) => (
              <TitheCard
                key={`${cause.slug}-${i}`}
                emoji={cause.emoji}
                title={cause.name}
                body={cause.landingDesc}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-10 md:gap-16 flex-wrap">
          <Stat big="7%" label="Permanent Tithe" />
          <Stat big="7" label="Pillars" />
          <Stat big="∞" label="Multiplier at Scale" />
        </div>

        <div className="flex justify-center mt-12">
          <Link
            to="/causes"
            className="inline-block px-7 py-3 border border-amber-500/30 text-amber-400 text-xs font-semibold tracking-[0.1em] uppercase hover:bg-amber-500/10 transition-colors rounded no-underline"
          >
            Read the Full Story — The Causes →
          </Link>
        </div>
      </div>
    </section>
  );
}

function TitheCard({
  emoji,
  title,
  body,
}: {
  emoji: string;
  title: string;
  body: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border-muted bg-surface-0/80 p-8 text-center transition-all hover:-translate-y-1 hover:border-shell-500/40 shrink-0 w-[300px]">
      <div className="w-14 h-14 mx-auto mb-5 rounded-full border border-border-muted flex items-center justify-center text-2xl bg-surface-1">
        {emoji}
      </div>
      <h3 className="text-sm uppercase tracking-[0.1em] text-text-primary mb-2 font-semibold">
        {title}
      </h3>
      <p className="text-sm text-text-muted font-light">{body}</p>
    </div>
  );
}

function Stat({ big, label }: { big: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-mono font-bold text-4xl leading-none text-amber-400">{big}</div>
      <div className="text-2xs uppercase tracking-[0.15em] text-text-muted mt-2">{label}</div>
    </div>
  );
}
