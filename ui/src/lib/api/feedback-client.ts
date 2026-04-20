/**
 * Feedback API client — routes through Ares → Hermes → Salesforce ApiRouter.
 *
 * Hits `/v1/turtleshell/feedback` on the same Apex handler used by the iris
 * admin portal (which calls it via same-origin Visualforce Remoting instead).
 * One API, two transports — this file is the external-HTTP transport.
 */
import { ogRequest } from './olympus-grid-client';

export type FeedbackPlatform = 'Web' | 'iOS' | 'Both' | 'Other';
export type FeedbackOnboardingSuccess = 'Yes' | 'Partially' | 'No';
export type FeedbackStatus = 'Unread' | 'Read' | 'Responded';

export interface FeedbackRecord {
  id: string;
  name: string;
  surveyKey: string;
  platform: FeedbackPlatform | null;
  onboardingSuccess: FeedbackOnboardingSuccess | null;
  comments: string | null;
  status: FeedbackStatus;
  adminResponse: string | null;
  respondedAt: string | null;
  submittedFromClient: string | null;
  createdDate: string;
  /** Responder Identity id + profile (name / username / avatar). Populated
   *  once the admin replies — we surface these on the user's thread so the
   *  reply feels personal (Homer's face + name, not "Admin replied"). All
   *  optional because older pre-identity records won't have them. */
  respondedByIdentity?: string | null;
  respondedByName?: string | null;
  respondedByUsername?: string | null;
  respondedByAvatarUrl?: string | null;
}

export interface SubmitFeedbackPayload {
  surveyKey?: string;
  platform?: FeedbackPlatform;
  onboardingSuccess?: FeedbackOnboardingSuccess;
  comments?: string;
  client?: string;
  rawPayload?: unknown;
}

/**
 * Heuristic: did this error come from the server saying "you aren't a
 * SuperAdmin" (as opposed to a real network failure)? The admin probe
 * uses this to decide whether to silently hide the panel or surface
 * an error to the user. Matches the Apex handler's `CustomExc` messages.
 */
export function isFeedbackAuthzFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const lower = msg.toLowerCase();
  return (
    lower.includes('authentication required') ||
    lower.includes('invalid or expired token') ||
    lower.includes('token missing') ||
    lower.includes('identity not found') ||
    lower.includes('not authorized') ||
    lower.includes('is not active')
  );
}

export const feedbackClient = {
  submit: async (payload: SubmitFeedbackPayload): Promise<FeedbackRecord & { created: true }> => {
    const body = {
      surveyKey: payload.surveyKey ?? 'onboarding-v1',
      platform: payload.platform,
      onboardingSuccess: payload.onboardingSuccess,
      comments: payload.comments,
      client: payload.client ?? 'turtleshell-web',
      rawPayload: payload.rawPayload,
    };
    const result = (await ogRequest('POST', '/turtleshell/feedback', body)) as FeedbackRecord & {
      created: true;
    };
    return result;
  },

  list: async (): Promise<FeedbackRecord[]> => {
    const result = (await ogRequest('GET', '/turtleshell/feedback')) as {
      count: number;
      feedback: FeedbackRecord[];
    };
    return result?.feedback ?? [];
  },

  // ── Admin API (requires SuperAdmin on caller's Identity) ─────────
  // Probe-pattern: try listAdmin, catch — if `isFeedbackAuthzFailure`
  // returns true, the current user isn't a SuperAdmin and the UI hides
  // the admin panel silently. Otherwise surface as a real error. Always
  // fetch the full list (no `?unread=true`); client filters locally —
  // Ares→Hermes query-string forwarding to `apiCtx.params` is not
  // something we want to depend on for admin UX.
  listAdmin: async (): Promise<FeedbackRecord[]> => {
    const result = (await ogRequest('GET', '/turtleshell/feedback-admin')) as {
      count: number;
      feedback: FeedbackRecord[];
    };
    return result?.feedback ?? [];
  },

  respondAdmin: async (id: string, message: string): Promise<FeedbackRecord> => {
    const trimmed = message.trim();
    const result = (await ogRequest(
      'POST',
      `/turtleshell/feedback-admin/${encodeURIComponent(id)}/respond`,
      { message: trimmed },
    )) as FeedbackRecord;
    return result;
  },

  markReadAdmin: async (id: string): Promise<FeedbackRecord> => {
    const result = (await ogRequest(
      'POST',
      `/turtleshell/feedback-admin/${encodeURIComponent(id)}/read`,
      {},
    )) as FeedbackRecord;
    return result;
  },
};
