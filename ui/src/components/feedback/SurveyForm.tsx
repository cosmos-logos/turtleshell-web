import type {
  SurveyAnswers,
  SurveyDefinition,
  SurveyQuestion,
} from '@/lib/surveys/types';

interface Props {
  survey: SurveyDefinition;
  answers: SurveyAnswers;
  onAnswersChange: (next: SurveyAnswers) => void;
  disabled?: boolean;
}

export function SurveyForm({ survey, answers, onAnswersChange, disabled }: Props) {
  function setAnswer(key: string, value: string | string[]) {
    onAnswersChange({ ...answers, [key]: value });
  }
  return (
    <div className="space-y-5">
      {survey.questions.map((q) => (
        <QuestionField
          key={q.key}
          question={q}
          answer={answers[q.key]}
          onChange={(v) => setAnswer(q.key, v)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function QuestionField({
  question,
  answer,
  onChange,
  disabled,
}: {
  question: SurveyQuestion;
  answer: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
  disabled?: boolean;
}) {
  if (question.type === 'single-choice') {
    return <SingleChoice q={question} answer={answer} onChange={onChange} disabled={disabled} />;
  }
  if (question.type === 'multi-choice') {
    return <MultiChoice q={question} answer={answer} onChange={onChange} disabled={disabled} />;
  }
  if (question.type === 'short-text' || question.type === 'long-text') {
    return <TextInput q={question} answer={answer} onChange={onChange} disabled={disabled} />;
  }
  return null;
}

function SingleChoice({
  q, answer, onChange, disabled,
}: {
  q: SurveyQuestion;
  answer: string | string[] | undefined;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const value = typeof answer === 'string' ? answer : '';
  const layout = q.layout ?? 'stacked';
  const containerClass =
    layout === 'inline' ? 'flex gap-2 flex-wrap' : 'flex flex-col sm:flex-row gap-2';
  const buttonClass =
    layout === 'inline' ? 'px-4 py-2 rounded-lg' : 'flex-1 px-4 py-3 rounded-lg text-left';
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">{q.prompt}</div>
      {q.helpText && <div className="text-2xs text-text-muted">{q.helpText}</div>}
      <div className={containerClass}>
        {q.options?.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              disabled={disabled}
              className={`${buttonClass} text-sm font-medium border transition-colors ${
                selected
                  ? 'bg-shell-500/10 border-shell-500 text-text-primary'
                  : 'bg-surface-2 border-border-muted text-text-secondary hover:border-shell-500/40'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MultiChoice({
  q, answer, onChange, disabled,
}: {
  q: SurveyQuestion;
  answer: string | string[] | undefined;
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const values = Array.isArray(answer) ? answer : [];
  const layout = q.layout ?? 'inline';
  function toggle(v: string) {
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  }
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">{q.prompt}</div>
      {q.helpText && <div className="text-2xs text-text-muted">{q.helpText}</div>}
      <div className={layout === 'inline' ? 'flex gap-2 flex-wrap' : 'flex flex-col gap-2'}>
        {q.options?.map((opt) => {
          const selected = values.includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              disabled={disabled}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                selected
                  ? 'bg-shell-500/10 border-shell-500 text-text-primary'
                  : 'bg-surface-2 border-border-muted text-text-secondary hover:border-shell-500/40'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TextInput({
  q, answer, onChange, disabled,
}: {
  q: SurveyQuestion;
  answer: string | string[] | undefined;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const value = typeof answer === 'string' ? answer : '';
  const rows = q.type === 'long-text' ? 4 : 1;
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">{q.prompt}</div>
      {q.helpText && <div className="text-2xs text-text-muted">{q.helpText}</div>}
      {q.type === 'long-text' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={rows}
          className="w-full px-3 py-2 bg-surface-2 border border-border-muted rounded-lg text-sm transition-colors focus:outline-none focus:border-shell-500 resize-y"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 bg-surface-2 border border-border-muted rounded-lg text-sm transition-colors focus:outline-none focus:border-shell-500"
        />
      )}
    </div>
  );
}
