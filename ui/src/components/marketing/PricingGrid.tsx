import { Link } from 'react-router-dom';
import { TIERS, type Tier } from '@/lib/tiers';

/**
 * Six-tier pricing grid used on both the public landing page and the
 * authenticated Shells upgrade surface (future). Layout:
 *   - Top row:    Free · Beachcomber · Tide
 *   - Middle row: Reef (featured, "Most Popular") · Abyss · (empty or wraps)
 *   - Bottom:     Enterprise (full-width, gold accent)
 *
 * All CTAs route to the existing waitlist flow at /login with a
 * ?source=pricing_<slug> attribution query so Plutus can measure
 * which tier-card converted.
 */
export function PricingGrid() {
  const fiveTiers = TIERS.filter((t) => t.span !== 'full');
  const enterprise = TIERS.find((t) => t.span === 'full');

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {fiveTiers.slice(0, 3).map((t) => (
          <PriceCard key={t.slug} tier={t} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {fiveTiers.slice(3).map((t) => (
          <PriceCard key={t.slug} tier={t} />
        ))}
        {/* Reserve the third slot on the middle row so Reef + Abyss
            align with the column above. */}
        <div className="hidden md:block" aria-hidden />
      </div>
      {enterprise && <EnterpriseCard tier={enterprise} />}

      <p className="text-center text-2xs text-text-muted font-light mt-6">
        * Additional usage fees apply per call · {' '}
        <strong className="text-shell-400 font-medium">Every plan tithes 7%</strong>{' '}
        to your chosen cause · Shell balances never expire
      </p>
    </div>
  );
}

function PriceCard({ tier }: { tier: Tier }) {
  const featured = tier.badge === 'popular';
  const free = tier.isFree;

  return (
    <div
      className={`relative flex flex-col rounded-xl border p-6 transition-all hover:-translate-y-1 ${
        featured
          ? 'border-shell-500 bg-shell-500/[0.06]'
          : 'border-border-muted bg-surface-1/70 hover:border-shell-500/40'
      }`}
    >
      {featured && (
        <div className="absolute -top-px left-1/2 -translate-x-1/2 text-[0.6rem] font-bold tracking-[0.2em] px-3 py-1 bg-shell-500 text-surface-0">
          MOST POPULAR
        </div>
      )}

      <div className="text-2xs uppercase tracking-[0.3em] text-shell-400 mb-1.5">
        {tier.name}
      </div>

      <div className="flex items-baseline gap-1 mb-5">
        {tier.priceUsd != null ? (
          <>
            <span className="text-lg text-text-muted">$</span>
            <span className="font-mono font-bold text-4xl leading-none text-text-primary">
              {tier.priceUsd.toFixed(2).replace(/\.00$/, '')}
            </span>
            <span className="text-xs text-text-muted font-light">/mo</span>
          </>
        ) : (
          <span className={`font-mono font-bold text-4xl leading-none ${free ? 'text-shell-400' : 'text-text-primary'}`}>
            {tier.priceLabel}
          </span>
        )}
      </div>

      <p className="text-xs text-text-muted italic mb-5 font-light">{tier.tagline}</p>

      <ul className="list-none space-y-0 flex-1 mb-6">
        {tier.features.map((f) => {
          const highlight = tier.highlightFeatures?.includes(f);
          return (
            <li
              key={f}
              className={`flex items-start gap-2 py-1.5 text-xs border-b border-border-muted/40 last:border-b-0 font-light leading-snug ${
                highlight ? 'text-text-primary font-normal' : 'text-text-muted'
              }`}
            >
              <span
                className={`flex-shrink-0 mt-1 text-[0.7rem] ${
                  highlight ? 'text-amber-400' : 'text-shell-400'
                }`}
              >
                {highlight ? '◆' : '—'}
              </span>
              <span>{f}</span>
            </li>
          );
        })}
      </ul>

      <Link
        to={`/login?source=pricing_${tier.slug}`}
        className={`block text-center py-3 rounded text-xs font-semibold tracking-[0.1em] uppercase transition-colors mt-auto ${
          featured
            ? 'bg-shell-500 text-surface-0 hover:opacity-85 border border-shell-500'
            : 'border border-border text-shell-400 hover:bg-shell-500 hover:text-surface-0'
        }`}
      >
        {tier.ctaLabel}
      </Link>
    </div>
  );
}

function EnterpriseCard({ tier }: { tier: Tier }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.03] p-8 flex flex-col md:flex-row gap-8 md:items-center hover:border-amber-500/60 transition-colors">
      <div className="flex-shrink-0">
        <div className="text-2xs uppercase tracking-[0.3em] text-amber-400 mb-2">
          {tier.name}
        </div>
        <div className="font-mono font-bold text-3xl text-amber-400 leading-none mb-3">
          {tier.priceLabel}
        </div>
        <p className="text-xs italic font-light mb-5" style={{ color: 'rgba(251,191,36,0.6)' }}>
          {tier.tagline}
        </p>
        <Link
          to={`/login?source=pricing_${tier.slug}`}
          className="inline-block border border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-surface-0 rounded px-8 py-3 text-xs font-semibold tracking-[0.1em] uppercase transition-colors"
        >
          {tier.ctaLabel}
        </Link>
      </div>
      <ul className="flex-1 list-none md:columns-2 md:gap-8">
        {tier.features.map((f) => {
          const highlight = tier.highlightFeatures?.includes(f);
          return (
            <li
              key={f}
              className={`flex items-start gap-2 py-1.5 text-xs font-light leading-snug break-inside-avoid ${
                highlight ? 'text-text-primary font-normal' : 'text-text-muted'
              }`}
            >
              <span
                className={`flex-shrink-0 mt-1 text-[0.7rem] ${
                  highlight ? 'text-amber-400' : 'text-shell-400'
                }`}
              >
                {highlight ? '◆' : '—'}
              </span>
              <span>{f}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
