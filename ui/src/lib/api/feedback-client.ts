/**
 * Feedback API client — routes through Ares → Hermes → Salesforce ApiRoute.
 *
 * All five entry points (submit / list / listAdmin / respondAdmin /
 * markReadAdmin) hit the new generic `Feedback__c` endpoints under
 * /v1/app/feedback/turtleshell/*. Legacy `TSFeedback__c` paths are no
 * longer called from this client.
 *
 * AppKey is `turtleshell` (canonical); web + iOS share one App with two
 * surfaces. ApplicationProfile rows are keyed by (Identity, App), so a
 * single human's web and iOS feedback both land in the same admin queue.
 */
import { ogRequest } from './olympus-grid-client';
import pkg from '../../../package.json';
import { captureSessionLogBase64 } from './session-log';

/** Single source of truth for the client build version. Stamped onto
 *  every feedback row's ClientVersion__c so admins know which build
 *  the submission came from. Synced automatically with package.json. */
const APP_VERSION: string = pkg.version;

// ── Types ──────────────────────────────────────────────────────────

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
 * Full Status__c picklist:
 * - `New | Read | Responded` cover the user-visible thread states.
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
  /** Parsed JSON from `Feedback__c.StructuredData__c`, raw string if
   *  unparseable, or null. For `Source='Survey'`, contains
   *  `{ surveyKey, answers }`. */
  structuredData: Record<string, unknown> | string | null;
  submittedAt: string | null;
  createdAt: string;
  includesSessionLog: boolean;
  clientVersion: string | null;
  deviceModel: string | null;

  // Submitter snapshot — populated only by the admin endpoint (the /me
  // endpoint never needs to tell the caller who THEY are).
  submittedByIdentity?: string | null;
  submittedByName?: string | null;
  submittedByUsername?: string | null;
  submittedByAvatarUrl?: string | null;

  // Reply chain — null until an admin replies
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

  // ── Admin (Feedback__c) ──────────────────────────────────────────
  // Backend enforces admin gating per
  // docs/handoff-olympus-grid-feedback-admin-reply-generic.md §5. The
  // probe-pattern in FeedbackAdminPanel relies on `isFeedbackAuthzFailure`
  // to silently hide the panel for non-admins.

  /** GET /v1/app/feedback/turtleshell/admin — list all feedback for
   *  the app + server-joined submitter & responder profile snapshots. */
  listAdmin: async (): Promise<FeedbackRecord[]> => {
    const result = (await ogRequest('GET', '/app/feedback/turtleshell/admin')) as {
      count: number;
      feedbacks: FeedbackRecord[];
    };
    return result?.feedbacks ?? [];
  },

  /** POST /v1/app/feedback/turtleshell/admin/{id}/respond — write reply,
   *  set Status='Responded', backend sends email to submitter. */
  respondAdmin: async (id: string, message: string): Promise<FeedbackRecord> => {
    const trimmed = message.trim();
    return (await ogRequest(
      'POST',
      `/app/feedback/turtleshell/admin/${encodeURIComponent(id)}/respond`,
      { message: trimmed },
    )) as FeedbackRecord;
  },

  /** POST /v1/app/feedback/turtleshell/admin/{id}/read — promote
   *  Status from New → Read. Idempotent; never downgrades Responded. */
  markReadAdmin: async (id: string): Promise<FeedbackRecord> => {
    return (await ogRequest(
      'POST',
      `/app/feedback/turtleshell/admin/${encodeURIComponent(id)}/read`,
      {},
    )) as FeedbackRecord;
  },
};
