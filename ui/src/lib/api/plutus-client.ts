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
}

function getBaseUrl(): string {
  return useEnvironmentStore.getState().getPlutusUrl();
}


export const plutusClient = {
  getQuota: async (shellId: string): Promise<QuotaResponse> => {
    const res = await fetch(`${getBaseUrl()}/quota/${shellId}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Quota fetch failed');
    return res.json();
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
