import { useEnvironmentStore } from '@/lib/store/environment-store';

export interface QuotaResponse {
  shell_id: string;
  quota_status: 'ok' | 'warning' | 'throttled' | 'blocked';
  tier: string;
  period_ends: string;
  usage_pct: number;
  blocked: boolean;
  cancel_at_period_end?: boolean;
  cancel_at?: string;
  current_period_end?: string;
  shells_remaining: number | null;
  shells_limit: number | null;
  payment_provider?: 'stripe' | 'apple' | null;
}

function getBaseUrl(): string {
  return useEnvironmentStore.getState().getPlutusUrl();
}


/**
 * In-flight request map keyed by shellId. AppShell, Sidebar, Chat, and a
 * few other components all kick off `getQuota` at boot more-or-less
 * simultaneously, which produced 3 overlapping HTTP calls per page load
 * in the prod session log (2026-05-26 05:53:06-07). Coalescing them
 * here means subscribers share one Promise — first caller does the
 * fetch, late callers ride along.
 */
const quotaInFlight = new Map<string, Promise<QuotaResponse>>();

export const plutusClient = {
  getQuota: (shellId: string): Promise<QuotaResponse> => {
    const existing = quotaInFlight.get(shellId);
    if (existing) return existing;
    const promise = (async () => {
      const res = await fetch(`${getBaseUrl()}/quota/${shellId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Quota fetch failed');
      return (await res.json()) as QuotaResponse;
    })();
    quotaInFlight.set(shellId, promise);
    // Clear the entry once the request settles so the NEXT distinct
    // poll cycle gets fresh data (not a stale cached value).
    promise.finally(() => {
      if (quotaInFlight.get(shellId) === promise) quotaInFlight.delete(shellId);
    });
    return promise;
  },

  createCheckout: async (
    shellId: string,
    tier: string,
    successUrl: string,
    cancelUrl: string,
    email?: string,
  ): Promise<{ checkout_url: string }> => {
    const res = await fetch(`${getBaseUrl()}/stripe/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        shell_id: shellId,
        tier,
        success_url: successUrl,
        cancel_url: cancelUrl,
        // Pre-fill the Stripe checkout email field so the logged-in
        // TurtleShell user doesn't have to retype their address — matches
        // the customer record created by the waitlist/sign-in flow and
        // keeps Stripe customers 1:1 with TurtleshellProfile__c identities.
        ...(email ? { email } : {}),
      }),
    });
    if (!res.ok) throw new Error('Checkout creation failed');
    return res.json();
  },

  changePlan: async (
    shellId: string,
    tier: string,
  ): Promise<{ ok: boolean; tier: string }> => {
    const res = await fetch(`${getBaseUrl()}/stripe/change-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ shell_id: shellId, tier }),
    });
    if (!res.ok) throw new Error('Plan change failed');
    return res.json();
  },

  getSubscriptionStatus: async (shellId: string): Promise<{
    has_subscription: boolean;
    status: string | null;
    tier: string | null;
    cancelling: boolean;
    cancel_at: string | null;
    cancel_at_period_end: boolean;
    current_period_end: string | null;
    subscription_id: string | null;
  }> => {
    // Stripe-authoritative truth. Falls back to quota-derived state if this
    // endpoint isn't deployed yet (pre-v1.7.4.29 Plutus).
    const res = await fetch(`${getBaseUrl()}/stripe/subscription-status/${shellId}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Subscription status fetch failed');
    return res.json();
  },

  submitChurnFeedback: async (payload: {
    shell_id: string;
    tier: string;
    cancel_at: string | null | undefined;
    submitted_at: string;
    why: string;
    better: string;
    trust: string;
  }): Promise<{ ok: boolean }> => {
    const res = await fetch(`${getBaseUrl()}/feedback/churn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Churn feedback submit failed');
    return res.json();
  },

  createPortalSession: async (
    shellId: string,
    returnUrl: string,
  ): Promise<{ portal_url: string }> => {
    const res = await fetch(`${getBaseUrl()}/stripe/portal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ shell_id: shellId, return_url: returnUrl }),
    });
    if (!res.ok) throw new Error('Portal session creation failed');
    return res.json();
  },
};
