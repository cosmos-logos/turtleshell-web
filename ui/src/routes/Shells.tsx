import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink, ShieldCheck, ChevronDown } from 'lucide-react';
import { plutusClient, type QuotaResponse } from '@/lib/api/plutus-client';
import { getShellId } from '@/lib/api/olympus-grid-client';

const TIER_PRICES: Record<string, string> = {
  beachcomber: '$4.99',
  tide: '$14.99',
  reef: '$39.99',
  abyss: '$99.99',
};

const TIERS = [
  {
    id: 'beachcomber',
    name: 'Beachcomber',
    price: '$4.99',
    period: '/mo',
    shells: 500,
    description: 'For personal use and light exploration.',
    features: [
      '500 Sea Shells/month',
      'Refills monthly',
      'Buy more anytime',
      'Basic tool access',
    ],
    highlight: false,
  },
  {
    id: 'tide',
    name: 'Tide',
    price: '$14.99',
    period: '/mo',
    shells: 2000,
    description: 'For power users who live in the shell.',
    features: [
      '2,000 Sea Shells/month',
      'Refills monthly',
      'Full tool suite',
      'Priority response',
    ],
    highlight: false,
  },
  {
    id: 'reef',
    name: 'Reef',
    price: '$39.99',
    period: '/mo',
    shells: 10000,
    description: 'For professionals and small teams.',
    features: [
      '10,000 Sea Shells/month',
      'Refills monthly',
      'Workflow automation',
      'Advanced RAG',
    ],
    highlight: true,
  },
  {
    id: 'abyss',
    name: 'Abyss',
    price: '$99.99',
    period: '/mo',
    shells: null,
    description: 'Unlimited. For those who go deep.',
    features: [
      'Unlimited Sea Shells',
      'Everything in Reef',
      'Early access features',
      'Direct support',
    ],
    highlight: false,
  },
];

function formatNumber(n: number): string {
  return n.toLocaleString();
}

// ── Shell Rain Celebration ──────────────────────────────

function ShellRain({ tierName, shells, onDismiss }: { tierName: string; shells: number | null; onDismiss: () => void }) {
  const shellElements = useMemo(() =>
    Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      duration: 1.5 + Math.random() * 1.5,
      delay: Math.random() * 1,
      size: 16 + Math.random() * 20,
    })),
  []);

  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer"
      onClick={onDismiss}
    >
      <style>{`
        @keyframes shellFall {
          0%   { transform: translateY(-100px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        @keyframes celebratePop {
          0%   { transform: scale(0.3); opacity: 0; }
          50%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {shellElements.map((s) => (
        <div
          key={s.id}
          className="fixed pointer-events-none select-none"
          style={{
            left: `${s.left}%`,
            top: 0,
            fontSize: `${s.size}px`,
            animation: `shellFall ${s.duration}s ${s.delay}s ease-in forwards`,
            opacity: 0,
            animationFillMode: 'forwards',
          }}
        >
          🐚
        </div>
      ))}

      <div
        className="text-center z-10"
        style={{ animation: 'celebratePop 0.5s ease-out forwards' }}
      >
        <div className="text-6xl mb-4">🐚</div>
        <h2 className="text-3xl font-bold text-text-primary mb-2">
          Welcome to {tierName}!
        </h2>
        <p className="text-lg text-text-secondary">
          {shells ? `${formatNumber(shells)} Sea Shells loaded and ready.` : 'Unlimited Sea Shells loaded and ready.'}
        </p>
        <p className="text-xs text-text-muted mt-4">Click anywhere to continue</p>
      </div>
    </div>
  );
}

// ── Quota Bar ───────────────────────────────────────────

function QuotaBar({ quota }: { quota: QuotaResponse }) {
  const isFree = quota.tier === 'free';
  const isUnlimited = quota.shells_remaining === null;
  const shellsRemaining = quota.shells_remaining;
  const shellsLimit = quota.shells_limit;
  // Burn-down bar: percentage of shells remaining out of the limit
  const pct = isUnlimited || !shellsLimit
    ? 0
    : Math.min(Math.max(0, 100 - (shellsRemaining! / shellsLimit) * 100), 100);

  return (
    <div className="bg-surface-2 rounded-xl p-6 mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-text-primary capitalize">
            {quota.tier} Tier
          </span>
          {quota.blocked && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full">
              Empty
            </span>
          )}
        </div>
        {!isUnlimited && shellsRemaining !== null && (
          <span className="text-sm text-text-secondary">
            {formatNumber(shellsRemaining)} remaining 🐚
          </span>
        )}
        {isUnlimited && (
          <span className="text-sm text-text-secondary">Unlimited 🐚</span>
        )}
      </div>

      <div className="w-full h-2.5 bg-surface-3 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: isUnlimited ? '100%' : `${Math.max(100 - pct, 0)}%`,
            backgroundColor: isUnlimited
              ? 'var(--color-shell-400, #4ade80)'
              : `hsl(${Math.round((100 - pct) * 1.2)}, 80%, 50%)`,
          }}
        />
      </div>

      {isFree && !quota.blocked && (
        <p className="text-sm text-text-muted mt-3">
          You are on the Free tier. Upgrade to get more Sea Shells.
        </p>
      )}
      {quota.blocked && (
        <div className="mt-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-red-300 font-semibold">
              🐚 Your Sea Shells are empty.
            </p>
            <p className="text-xs text-red-400/80 mt-0.5">
              Pick a plan below to keep the conversation going.
            </p>
          </div>
          <a
            href="#pick-a-plan"
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-shell-400 text-black hover:bg-shell-300 transition-colors no-underline whitespace-nowrap"
          >
            Pick a plan
          </a>
        </div>
      )}
    </div>
  );
}

// ── Current Plan Management (paid users) ────────────────

const TIER_ORDER = ['beachcomber', 'tide', 'reef', 'abyss'];

function CurrentPlan({ quota, onPlanChanged }: { quota: QuotaResponse; onPlanChanged: () => void }) {
  const [portalLoading, setPortalLoading] = useState(false);
  const [changingTo, setChangingTo] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const shellsLimit = quota.shells_limit;
  const price = TIER_PRICES[quota.tier] ?? '';
  const isUnlimited = shellsLimit === null;
  const currentIdx = TIER_ORDER.indexOf(quota.tier);

  const openPortal = async () => {
    setPortalLoading(true);
    setActionError(null);
    try {
      const { portal_url } = await plutusClient.createPortalSession(
        getShellId(),
        `${window.location.origin}/app/shells?t=${Date.now()}`,
      );
      window.location.href = portal_url;
    } catch {
      setActionError('Could not open billing portal. Please try again.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleChangePlan = async (tierId: string) => {
    setChangingTo(tierId);
    setActionError(null);
    try {
      await plutusClient.changePlan(getShellId(), tierId);
      // Poll until webhook updates Plutus (keeps spinner active)
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const data = await plutusClient.getQuota(getShellId());
        if (data.tier === tierId) break;
      }
      onPlanChanged();
    } catch {
      setActionError('Could not change plan. Please try again.');
    } finally {
      setChangingTo(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface-2 rounded-xl border border-border-muted p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-text-primary capitalize">
              Current Plan: {quota.tier}
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              {isUnlimited
                ? 'Unlimited Sea Shells/month'
                : `${formatNumber(shellsLimit as number)} Sea Shells/month`}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-text-primary">{price}</span>
            <span className="text-sm text-text-muted">/mo</span>
          </div>
        </div>

        {quota.cancel_at_period_end ? (
          <div className="mb-6 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-sm font-medium text-amber-400">
              Subscription cancelled — active until{' '}
              {new Date(quota.cancel_at || quota.current_period_end || quota.period_ends).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="text-xs text-text-muted mt-1">
              Your Sea Shells remain available until this date. After that, your account returns to the Free tier.
            </p>
          </div>
        ) : (quota.current_period_end || quota.period_ends) ? (
          <div className="mb-6">
            <p className="text-sm text-text-muted">
              Renews: {new Date(quota.current_period_end || quota.period_ends).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {isUnlimited
                ? 'Unlimited Sea Shells — no refill needed'
                : `Refills to ${formatNumber(shellsLimit as number)} Sea Shells on renewal`}
            </p>
          </div>
        ) : null}

        {!quota.cancel_at_period_end && (
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            {portalLoading ? 'Opening...' : <><span>Cancel Subscription</span><ExternalLink size={12} className="inline ml-1.5 -mt-0.5" /></>}
          </button>
        )}

        {actionError && (
          <p className="text-red-400 text-sm mt-3">{actionError}</p>
        )}
      </div>

      {/* Tier cards for switching plans */}
      <div>
        <h3 id="pick-a-plan" className="text-lg font-semibold text-text-primary mb-4">Switch Plan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map((tier) => {
            const isCurrent = quota.tier === tier.id;
            const isCancelled = isCurrent && !!quota.cancel_at_period_end;
            const tierIdx = TIER_ORDER.indexOf(tier.id);
            const isUpgrade = tierIdx > currentIdx;
            const isDowngrade = tierIdx < currentIdx;

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col rounded-xl border p-5 transition-colors ${
                  isCancelled
                    ? 'border-red-500 bg-surface-2 ring-1 ring-red-500/30'
                    : isCurrent
                      ? 'border-shell-400 bg-surface-2 ring-1 ring-shell-400/30'
                      : 'border-border-muted bg-surface-1 hover:border-border-subtle'
                }`}
              >
                {isCurrent && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider ${
                    isCancelled ? 'bg-red-500 text-white' : 'bg-shell-400 text-black'
                  }`}>
                    {isCancelled ? 'Cancelled' : 'Current'}
                  </div>
                )}

                <h3 className="text-lg font-semibold text-text-primary mb-1">
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-text-primary">
                    {tier.price}
                  </span>
                  <span className="text-sm text-text-muted">{tier.period}</span>
                </div>
                <p className="text-sm text-text-secondary mb-4">
                  {tier.description}
                </p>

                <ul className="space-y-2 mb-6 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-shell-400 mt-0.5 flex-shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleChangePlan(tier.id)}
                  disabled={(isCurrent && !isCancelled) || changingTo !== null}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    isCurrent && !isCancelled
                      ? 'bg-surface-3 text-text-muted cursor-default'
                      : quota.cancel_at_period_end
                        ? 'bg-shell-400 text-black hover:bg-shell-300'
                        : isUpgrade
                          ? 'bg-shell-400 text-black hover:bg-shell-300'
                          : 'bg-surface-3 text-text-primary hover:bg-surface-2 border border-border-muted'
                  }`}
                >
                  {changingTo === tier.id
                    ? 'Switching...'
                    : isCurrent && !quota.cancel_at_period_end
                      ? 'Current Plan'
                      : quota.cancel_at_period_end
                        ? 'Restart'
                        : isUpgrade
                          ? 'Upgrade'
                          : isDowngrade
                            ? 'Downgrade'
                            : 'Switch'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Pricing Cards (free tier users) ─────────────────────

function PricingCards({ quota, loading, onSubscribe }: {
  quota: QuotaResponse | null;
  loading: string | null;
  onSubscribe: (tierId: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {TIERS.map((tier) => {
        const isCurrent = quota?.tier === tier.id;
        return (
          <div
            key={tier.id}
            className={`relative flex flex-col rounded-xl border p-5 transition-colors ${
              tier.highlight
                ? 'border-shell-400 bg-surface-2 shadow-lg shadow-shell-500/10'
                : 'border-border-muted bg-surface-1 hover:border-border-subtle'
            }`}
          >
            {tier.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-shell-400 text-black text-xs font-bold rounded-full uppercase tracking-wider">
                Popular
              </div>
            )}

            <h3 className="text-lg font-semibold text-text-primary mb-1">
              {tier.name}
            </h3>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-3xl font-bold text-text-primary">
                {tier.price}
              </span>
              <span className="text-sm text-text-muted">{tier.period}</span>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              {tier.description}
            </p>

            <ul className="space-y-2 mb-6 flex-1">
              {tier.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-text-secondary"
                >
                  <span className="text-shell-400 mt-0.5 flex-shrink-0">
                    ✓
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => onSubscribe(tier.id)}
              disabled={loading !== null || isCurrent}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isCurrent
                  ? 'bg-surface-3 text-text-muted cursor-default'
                  : tier.highlight
                    ? 'bg-shell-400 text-black hover:bg-shell-300'
                    : 'bg-surface-3 text-text-primary hover:bg-surface-2 border border-border-muted'
              }`}
            >
              {loading === tier.id
                ? 'Redirecting...'
                : isCurrent
                  ? 'Current Plan'
                  : 'Subscribe'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── FAQ Section ──────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'What are Sea Shells?',
    a: 'Sea Shells are the currency of TurtleShell.ai. Every action Athena takes on your behalf \u2014 answering a question, running a tool, searching your documents, connecting to an external service \u2014 consumes a small number of Sea Shells. Your balance is shown at the bottom of the sidebar at all times.',
  },
  {
    q: 'How many Sea Shells do I get?',
    a: 'table',
  },
  {
    q: 'Do my Sea Shells expire?',
    a: 'Your free 500 shells never expire \u2014 they\u2019re yours until you use them. Paid plan shells reset at the start of each billing cycle. Unused shells from the previous month do not roll over.',
  },
  {
    q: 'What happens when I upgrade or downgrade?',
    a: 'You can change your plan at any time through the Stripe billing portal. Upgrades take effect immediately. Downgrades take effect at the start of your next billing cycle \u2014 you keep your current allocation until then.',
  },
  {
    q: 'What happens if I cancel?',
    a: 'Your subscription stays active until the end of your current billing period \u2014 you keep every shell you paid for. When the period ends, your account returns to the Free tier (500 shells, one-time). There are no cancellation fees.',
  },
  {
    q: 'Do add-ons and connectors cost Sea Shells?',
    a: 'Some integrations \u2014 like Salesforce, HubSpot, or custom data connectors \u2014 may carry a monthly Sea Shell cost in addition to your plan. This covers the compute and API calls required to keep those connections running. The cost of every connector is shown clearly before you enable it. You\u2019ll always know exactly what you\u2019re paying for.\n\nComing soon: a full shell cost catalog for every action and connector.',
  },
  {
    q: 'How do I buy more shells mid-month?',
    a: 'Top-up packs are coming soon. When available, you\u2019ll be able to buy additional shells at any time without changing your plan. Check back here for updates.',
  },
];

function ShellsFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div id="shells-faq" className="mt-12 pt-8 border-t border-border-muted">
      <h2 className="text-xl font-bold text-text-primary mb-6">About Sea Shells</h2>

      <div className="space-y-1">
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = openIdx === i;
          return (
            <div key={i} className="rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-text-primary hover:bg-surface-2 transition-colors"
              >
                <span>{item.q}</span>
                <ChevronDown
                  size={16}
                  className={`text-text-muted flex-shrink-0 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-sm text-text-secondary leading-relaxed">
                  {item.a === 'table' ? (
                    <>
                      <p className="mb-3">
                        New accounts start with 500 Sea Shells, on us — no credit card required. When your free shells run out, you can subscribe to a plan that refills your balance every month automatically.
                      </p>
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-border-muted text-text-muted">
                            <th className="py-2 pr-4 font-medium">Plan</th>
                            <th className="py-2 pr-4 font-medium">Sea Shells/month</th>
                            <th className="py-2 font-medium">Price</th>
                          </tr>
                        </thead>
                        <tbody className="text-text-secondary">
                          <tr className="border-b border-border-muted/50"><td className="py-2 pr-4">Free</td><td className="py-2 pr-4">500 (one-time)</td><td className="py-2">Free</td></tr>
                          <tr className="border-b border-border-muted/50"><td className="py-2 pr-4">Beachcomber</td><td className="py-2 pr-4">500</td><td className="py-2">$4.99/mo</td></tr>
                          <tr className="border-b border-border-muted/50"><td className="py-2 pr-4">Tide</td><td className="py-2 pr-4">2,000</td><td className="py-2">$14.99/mo</td></tr>
                          <tr className="border-b border-border-muted/50"><td className="py-2 pr-4">Reef</td><td className="py-2 pr-4">10,000</td><td className="py-2">$39.99/mo</td></tr>
                          <tr><td className="py-2 pr-4">Abyss</td><td className="py-2 pr-4">Unlimited</td><td className="py-2">$99.99/mo</td></tr>
                        </tbody>
                      </table>
                    </>
                  ) : (
                    item.a.split('\n\n').map((p, j) => (
                      <p key={j} className={j > 0 ? 'mt-3 italic text-text-muted' : ''}>
                        {p}
                      </p>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Security callout */}
      <div className="mt-8 rounded-xl border border-shell-500/30 bg-shell-500/5 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="text-shell-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-text-primary mb-2">
              Your payment information is secure
            </p>
            <p className="text-sm text-text-secondary leading-relaxed mb-3">
              We never see your payment details. TurtleShell.ai uses Stripe — a PCI-certified payment processor trusted by millions of businesses — to handle all billing. Your card number, CVV, and bank details go directly to Stripe. We only receive confirmation that a payment succeeded.
            </p>
            <ul className="space-y-1 text-sm text-text-secondary">
              <li className="flex items-center gap-2"><span className="text-shell-400">✓</span> Cancel anytime — no fees, no questions asked</li>
              <li className="flex items-center gap-2"><span className="text-shell-400">✓</span> Your data is preserved if you cancel</li>
              <li className="flex items-center gap-2"><span className="text-shell-400">✓</span> Receipts emailed automatically by Stripe</li>
              <li className="flex items-center gap-2"><span className="text-shell-400">✓</span> Update your payment method anytime in the billing portal</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── localStorage tier cache ─────────────────────────────
// Persists the known tier across page reloads / banner dismissals
// until Plutus quota catches up via webhook.

const TIER_CACHE_KEY = 'turtleshell-cached-tier';

function getCachedTier(): string | null {
  return localStorage.getItem(TIER_CACHE_KEY);
}

function setCachedTier(tier: string) {
  localStorage.setItem(TIER_CACHE_KEY, tier);
}

function clearCachedTier() {
  localStorage.removeItem(TIER_CACHE_KEY);
}

// ── Main Page ───────────────────────────────────────────

export function Shells() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // The tier the user actually has — Plutus is source of truth when available,
  // falls back to localStorage cache if Plutus still reports free after checkout.
  const cachedTier = getCachedTier();
  const plutusTier = quota?.tier ?? 'free';
  const effectiveTier = (plutusTier !== 'free' ? plutusTier : cachedTier) ?? 'free';

  // If Plutus has caught up, clear the cache — no longer needed
  useEffect(() => {
    if (plutusTier !== 'free' && cachedTier) {
      clearCachedTier();
    }
  }, [plutusTier, cachedTier]);

  const fetchQuota = useCallback(async () => {
    try {
      const data = await plutusClient.getQuota(getShellId());
      setQuota(data);
      window.dispatchEvent(new Event('shells:updated'));
    } catch {
      // Plutus unreachable — show page without quota bar
    }
  }, []);

  // Check for success redirect
  useEffect(() => {
    const success = searchParams.get('success');
    if (success) {
      setCachedTier(success);
      setShowBanner(true);
      setShowCelebration(true);
      setSearchParams({}, { replace: true });
      fetchQuota();
      // Webhook may not have processed yet — retry after delays
      const t1 = setTimeout(fetchQuota, 3000);
      const t2 = setTimeout(fetchQuota, 8000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [searchParams, setSearchParams, fetchQuota]);

  // Fetch quota on mount
  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  // Refetch after returning from Stripe portal (detected via ?t= param)
  useEffect(() => {
    const t = searchParams.get('t');
    if (t) {
      setSearchParams({}, { replace: true });
      clearCachedTier();
      fetchQuota();
    }
  }, [searchParams, setSearchParams, fetchQuota]);

  const handleSubscribe = async (tierId: string) => {
    setLoading(tierId);
    setError(null);
    try {
      const { checkout_url } = await plutusClient.createCheckout(
        getShellId(),
        tierId,
        `${window.location.origin}/app/shells?success=${tierId}`,
        `${window.location.origin}/app/shells`,
      );
      window.location.href = checkout_url;
    } catch {
      setError('Could not initiate checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const isFree = effectiveTier === 'free';
  const effectiveTierData = TIERS.find((t) => t.id === effectiveTier);

  // Build a quota-like object that respects the effective tier for display
  const cachedTierShells = effectiveTierData?.shells ?? null;
  const displayQuota: QuotaResponse | null = quota
    ? effectiveTier !== quota.tier
      ? { ...quota, tier: effectiveTier, usage_pct: 0, quota_status: 'ok', blocked: false, shells_remaining: cachedTierShells, shells_limit: cachedTierShells }
      : quota
    : effectiveTier !== 'free'
      ? { shell_id: getShellId(), tier: effectiveTier, usage_pct: 0, quota_status: 'ok', blocked: false, period_ends: '', shells_remaining: cachedTierShells, shells_limit: cachedTierShells }
      : null;

  return (
    <div className="flex-1 overflow-y-auto scroll-smooth p-6 max-w-5xl mx-auto w-full">
      {/* Shell rain celebration overlay */}
      {showCelebration && (
        <ShellRain
          tierName={effectiveTierData?.name ?? effectiveTier}
          shells={effectiveTierData?.shells ?? null}
          onDismiss={() => setShowCelebration(false)}
        />
      )}

      <h1 className="text-2xl font-bold text-text-primary mb-2">Sea Shells</h1>
      <p className="text-text-secondary mb-2">
        Your Sea Shell balance, plan, and billing — all in one place.
      </p>
      <a href="#shells-faq" className="text-sm text-shell-400 hover:text-shell-300 underline">
        What are Sea Shells? ↓
      </a>
      <div className="mb-6" />

      {/* Success banner (persists after celebration until dismissed) */}
      {showBanner && !showCelebration && (
        <div className="bg-shell-500/10 border border-shell-500/30 rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
          <p className="text-sm font-medium text-shell-300">
            🎉 You're now on {effectiveTierData?.name ?? effectiveTier} —{' '}
            {effectiveTierData?.shells
              ? `${formatNumber(effectiveTierData.shells)} Sea Shells loaded and ready.`
              : 'Unlimited Sea Shells loaded and ready.'}
          </p>
          <button
            onClick={() => setShowBanner(false)}
            className="text-text-muted hover:text-text-primary text-sm ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Quota status bar */}
      {displayQuota && <QuotaBar quota={displayQuota} />}

      {/* Paid users: plan management. Free users: pricing cards */}
      {isFree ? (
        <div id="pick-a-plan">
          <PricingCards quota={quota} loading={loading} onSubscribe={handleSubscribe} />
        </div>
      ) : (
        displayQuota && <CurrentPlan quota={displayQuota} onPlanChanged={fetchQuota} />
      )}

      <ShellsFaq />
    </div>
  );
}
