/**
 * Feedback API client — routes through Ares → Hermes → Salesforce ApiRoute.
 *
 * Phase 1 (2026-05-23):
 *   - submit + user list hit the new generic `Feedback__c` endpoints
 *     under /v1/app/feedback/turtleshell/* (AppKey = "turtleshell";
 *     web/iOS share one App with two surfaces).
 *   - admin list/respond/markRead stay on the legacy
 *     /v1/turtleshell/feedback-admin* endpoints (TSFeedback__c) until
 *     the olympus-grid backend ships the matching admin endpoints on
 *     Feedback__c. Tracked in
 *     docs/handoff-olympus-grid-feedback-admin-reply-generic.md.
 */
import { ogRequest } from './olympus-grid-client';
import pkg from '../../../package.json';
import { captureSessionLogBase64 } from './session-log';

/** Single source of truth for the client build version. Stamped onto
 *  every feedback row's ClientVersion__c so admins know which build
 *  the submission came from. Synced automatically with package.json. */
const APP_VERSION: string = pkg.version;

// ── New (Feedback__c) types ────────────────────────────────────────

export type FeedbackSource =
  | 'Feedback'
  | 'Survey'
  | 'Bug'
  | 'FeatureRequest'
  | 'AutoSubmit'
  | 'CrashReport'
  | 'SessionLog';

export type FeedbackSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

/**
 * Full Status__c picklist as the backend will expose it post-§6:
 * - `New | Read | Responded` cover the user-visible thread states
 *   (mirrors the legacy Unread/Read/Responded UX).
 * - `Triaged | InProgress | Resolved | WontFix` cover admin triage.
 * The renderer handles all 7; unknown values fall through to 'New'.
 */
export type FeedbackStatus =
  | 'New'
  | 'Read'
  | 'Triaged'
  | 'InProgress'
  | 'Responded'
  | 'Resolved'
  | 'WontFix';

export interface FeedbackRecord {
  id: string;
  name: string;
  source: FeedbackSource;
  status: FeedbackStatus;
  severity: FeedbackSeverity | null;
  body: string | null;
  /** Parsed JSON from Feedback__c.StructuredData__c, or raw string if
   *  unparseable, or null. Populated by the backend after §6 ships;
   *  may be null on rows created during the in-flight window. */
  structuredData: Record<string, unknown> | string | null;
  submittedAt: string | null;
  createdAt: string;
  includesSessionLog: boolean;
  clientVersion: string | null;
  deviceModel: string | null;
  // Reply chain — null until admin replies and until backend §6 lands
  adminResponse: string | null;
  respondedAt: string | null;
  respondedByIdentity: string | null;
  respondedByName: string | null;
  respondedByUsername: string | null;
  respondedByAvatarUrl: string | null;
}

export interface SubmitFeedbackPayload {
  /** Freeform user comment. Lands in Feedback__c.Body__c. */
  body: string;
  /** Defaults to 'Feedback'. The route form sends 'Survey' so the
   *  thread renderer can surface structuredData as answer pills. */
  source?: FeedbackSource;
  severity?: FeedbackSeverity;
  /** Generic structured payload — e.g. `{ surveyKey, answers }` for
   *  surveys. Server stores verbatim in StructuredData__c. */
  structuredData?: Record<string, unknown>;
  /** Defaults to true. Set false to skip session-log capture (e.g.
   *  privacy-sensitive flows where the user explicitly opts out). */
  includeSessionLog?: boolean;
}

export interface SubmitFeedbackResult {
  feedbackId: string;
  feedbackName: string;
  includesSessionLog: boolean;
  attachmentSizeBytes: number;
}

// ── Legacy (TSFeedback__c) admin types — temporary, see file header ──

export type FeedbackPlatform = 'Web' | 'iOS' | 'Both' | 'Other';
export type FeedbackOnboardingSuccess = 'Yes' | 'Partially' | 'No';
export type LegacyFeedbackStatus = 'Unread' | 'Read' | 'Responded';

export interface LegacyFeedbackRecord {
  id: string;
  name: string;
  surveyKey: string;
  platform: FeedbackPlatform | null;
  onboardingSuccess: FeedbackOnboardingSuccess | null;
  comments: string | null;
  status: LegacyFeedbackStatus;
  adminResponse: string | null;
  respondedAt: string | null;
  submittedFromClient: string | null;
  createdDate: string;
  respondedByIdentity?: string | null;
  respondedByName?: string | null;
  respondedByUsername?: string | null;
  respondedByAvatarUrl?: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────

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

/** Stamped on every submit so admins know which client + device origin. */
function deriveDeviceLabel(): string {
  const ua = navigator.userAgent;
  const platform = navigator.platform || '';
  return `${platform} · ${ua}`.slice(0, 64);
}

// ── Client ─────────────────────────────────────────────────────────

export const feedbackClient = {
  /** POST /v1/app/feedback/turtleshell/submit */
  submit: async (payload: SubmitFeedbackPayload): Promise<SubmitFeedbackResult> => {
    const includeLog = payload.includeSessionLog ?? true;
    const sessionLog = includeLog ? await captureSessionLogBase64() : null;
    const body = {
      body: payload.body,
      source: payload.source ?? 'Feedback',
      severity: payload.severity,
      structuredData: payload.structuredData,
      clientVersion: APP_VERSION,
      deviceModel: deriveDeviceLabel(),
      submittedAt: new Date().toISOString(),
      sessionLog,
    };
    return (await ogRequest(
      'POST',
      '/app/feedback/turtleshell/submit',
      body,
    )) as SubmitFeedbackResult;
  },

  /** GET /v1/app/feedback/turtleshell/me — user's own thread. */
  list: async (): Promise<FeedbackRecord[]> => {
    const result = (await ogRequest('GET', '/app/feedback/turtleshell/me')) as {
      count: number;
      feedbacks: FeedbackRecord[];
    };
    return result?.feedbacks ?? [];
  },

  // ── Admin (legacy TSFeedback__c — temporary) ─────────────────────
  // Wired to the new /v1/app/feedback/turtleshell/admin* endpoints
  // once handoff-olympus-grid-feedback-admin-reply-generic.md ships.

  listAdmin: async (): Promise<LegacyFeedbackRecord[]> => {
    const result = (await ogRequest('GET', '/turtleshell/feedback-admin')) as {
      count: number;
      feedback: LegacyFeedbackRecord[];
    };
    return result?.feedback ?? [];
  },

  respondAdmin: async (id: string, message: string): Promise<LegacyFeedbackRecord> => {
    const trimmed = message.trim();
    return (await ogRequest(
      'POST',
      `/turtleshell/feedback-admin/${encodeURIComponent(id)}/respond`,
      { message: trimmed },
    )) as LegacyFeedbackRecord;
  },

  markReadAdmin: async (id: string): Promise<LegacyFeedbackRecord> => {
    return (await ogRequest(
      'POST',
      `/turtleshell/feedback-admin/${encodeURIComponent(id)}/read`,
      {},
    )) as LegacyFeedbackRecord;
  },
};
