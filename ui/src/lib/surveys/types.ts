/**
 * Generic survey schema. App code defines a SurveyDefinition; SurveyForm
 * renders it; the answers JSON ships in Feedback__c.StructuredData__c so
 * the backend stays app-agnostic (Body__c remains the freeform user
 * comment — survey structure lives in StructuredData__c).
 */

export type SurveyQuestionType =
  | 'single-choice'
  | 'multi-choice'
  | 'short-text'
  | 'long-text';

export type SurveyQuestionLayout = 'stacked' | 'inline';

export interface SurveyOption {
  value: string;
  label: string;
}

export interface SurveyQuestion {
  /** Stable key used as the answer-map key in StructuredData__c.answers. */
  key: string;
  prompt: string;
  helpText?: string;
  type: SurveyQuestionType;
  /** Required for single-choice and multi-choice; ignored for text types. */
  options?: SurveyOption[];
  /** Visual hint for choice questions: 'stacked' = full-width column,
   *  'inline' = compact wrap. Defaults to 'stacked'. */
  layout?: SurveyQuestionLayout;
  required?: boolean;
}

export interface SurveyDefinition {
  /** Stable key written into StructuredData__c.surveyKey on submit. */
  key: string;
  title?: string;
  description?: string;
  questions: SurveyQuestion[];
}

/** Raw answer map. Single-choice / text → string; multi-choice → string[]. */
export type SurveyAnswers = Record<string, string | string[]>;
