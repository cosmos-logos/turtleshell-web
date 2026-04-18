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
}

export interface SubmitFeedbackPayload {
  surveyKey?: string;
  platform?: FeedbackPlatform;
  onboardingSuccess?: FeedbackOnboardingSuccess;
  comments?: string;
  client?: string;
  rawPayload?: unknown;
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
};
