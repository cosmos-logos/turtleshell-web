import type { SurveyDefinition } from './types';

/**
 * The TurtleShell onboarding survey — preserved verbatim from the legacy
 * Feedback.tsx 3-button form (onboardingSuccess + platform + comments).
 * Comments live in Feedback__c.Body__c; the two structured answers ride
 * StructuredData__c as `{ surveyKey, answers }`.
 */
export const onboardingSurveyV1: SurveyDefinition = {
  key: 'onboarding-v1',
  questions: [
    {
      key: 'onboardingSuccess',
      prompt: 'How did onboarding go?',
      type: 'single-choice',
      layout: 'stacked',
      required: true,
      options: [
        { value: 'Yes', label: 'Smooth — no problems' },
        { value: 'Partially', label: 'Partially — some friction' },
        { value: 'No', label: 'I got stuck' },
      ],
    },
    {
      key: 'platform',
      prompt: 'Which platform?',
      type: 'single-choice',
      layout: 'inline',
      required: true,
      options: [
        { value: 'Web', label: 'Web' },
        { value: 'iOS', label: 'iOS' },
        { value: 'Both', label: 'Both' },
        { value: 'Other', label: 'Other' },
      ],
    },
  ],
};

/**
 * The survey that should be shown on /app/feedback right now. Hardcoded
 * for Phase 1; a later phase will fetch the active survey from the
 * backend so admins can rotate questions without a client redeploy.
 */
export function getActiveSurvey(): SurveyDefinition {
  return onboardingSurveyV1;
}
