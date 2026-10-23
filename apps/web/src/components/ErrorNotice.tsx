import { z } from 'zod';
import { ApiError } from '../lib/api';

const ErrorDetailsSchema = z.union([
  z.object({ problems: z.array(z.string()) }).transform((details) => details.problems),
  z
    .array(z.object({ path: z.string(), message: z.string() }))
    .transform((issues) => issues.map((issue) => `${issue.path}: ${issue.message}`)),
]);

function problemsOf(error: Error): string[] {
  if (!(error instanceof ApiError)) return [];
  const parsed = ErrorDetailsSchema.safeParse(error.details);
  return parsed.success ? parsed.data : [];
}

export function ErrorNotice({ error, onRetry }: { error: Error | null; onRetry?: () => void }) {
  if (!error) return null;
  const problems = problemsOf(error);
  return (
    <div className="banner banner-error" role="alert">
      <strong>{error.message}</strong>
      {problems.length > 0 && (
        <details>
          <summary>What went wrong</summary>
          <ul>
            {problems.map((problem, index) => (
              <li key={index}>{problem}</li>
            ))}
          </ul>
        </details>
      )}
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
