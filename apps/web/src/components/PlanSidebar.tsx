import type { PlanDetailDto } from '@hub/shared';
import { documentTypeLabel, formatDateTime } from '../lib/format';
import { GroundingBadge } from './Badges';

const ACTION_LABEL = {
  submit: 'Submitted',
  approve: 'Approved and published',
  return: 'Returned',
} as const;

export function SourcesPanel({ plan }: { plan: PlanDetailDto }) {
  return (
    <section aria-labelledby="sources-heading" className="card">
      <h2 id="sources-heading">Curriculum sources</h2>
      <p className="muted small">
        Retrieved for {plan.learningOutcome.code}. Cited sources are marked.
      </p>
      <ul className="plain sources">
        {plan.sources.map((source) => (
          <li key={source.chunkId} id={`source-${source.chunkId}`}>
            <details>
              <summary>
                <span className={source.cited ? 'cited' : 'uncited'}>
                  {source.cited ? 'Cited' : 'Not cited'}
                </span>{' '}
                {source.heading}
                <span className="muted small">
                  {' '}
                  · {documentTypeLabel(source.documentType)} · match {source.similarity.toFixed(2)}
                </span>
              </summary>
              <p className="muted small">{source.documentTitle}</p>
              <pre className="source-text">{source.text}</pre>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HistoryPanel({
  plan,
  viewingVersion,
  onViewVersion,
}: {
  plan: PlanDetailDto;
  viewingVersion: number | null;
  onViewVersion: (version: number | null) => void;
}) {
  return (
    <section aria-labelledby="history-heading" className="card">
      <h2 id="history-heading">History</h2>
      {plan.reviews.length > 0 && (
        <>
          <h3>Review</h3>
          <ol className="plain timeline">
            {plan.reviews.map((review) => (
              <li key={`${review.action}-${review.createdAt}`}>
                <strong>{ACTION_LABEL[review.action]}</strong> by {review.actorName}
                <div className="muted small">{formatDateTime(review.createdAt)}</div>
                {review.comment && <blockquote>{review.comment}</blockquote>}
              </li>
            ))}
          </ol>
        </>
      )}
      <h3>Versions</h3>
      <ol className="plain timeline">
        {plan.versions.map((version) => (
          <li key={version.version}>
            <button
              type="button"
              className="link-button"
              aria-pressed={viewingVersion === version.version}
              onClick={() =>
                onViewVersion(version.version === plan.currentVersion ? null : version.version)
              }
            >
              Version {version.version}
              {version.version === plan.currentVersion ? ' (current)' : ''}
            </button>{' '}
            <GroundingBadge status={version.groundingStatus} />
            <div className="muted small">
              {version.authorName} · {formatDateTime(version.createdAt)}
              {version.changeNote ? ` · ${version.changeNote}` : ''}
            </div>
          </li>
        ))}
      </ol>
      {plan.generation && (
        <p className="muted small">
          Drafted by {plan.generation.provider}/{plan.generation.model} in{' '}
          {(plan.generation.latencyMs / 1000).toFixed(1)}s, {plan.generation.attempts} attempt
          {plan.generation.attempts === 1 ? '' : 's'},{' '}
          {plan.generation.inputTokens + plan.generation.outputTokens} tokens, est. $
          {plan.generation.estimatedCostUsd.toFixed(4)}
        </p>
      )}
    </section>
  );
}
