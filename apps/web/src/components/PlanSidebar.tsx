import type { PlanDetailDto } from '@hub/shared';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  GitBranch,
  History,
} from 'lucide-react';
import { documentTypeLabel, formatDateTime } from '../lib/format';
import { GroundingBadge } from './Badges';

const ACTION_LABEL = {
  submit: 'Submitted',
  approve: 'Approved and published',
  return: 'Returned',
} as const;

export function SourcesPanel({
  plan,
  historical = false,
}: {
  plan: PlanDetailDto;
  historical?: boolean;
}) {
  return (
    <section aria-labelledby="sources-heading" className="plan-sources-panel">
      <h2 id="sources-heading">Curriculum sources</h2>
      <p className="plan-panel-description">
        {historical
          ? 'Original retrieval set. Open the lesson citations to inspect their sources.'
          : `${plan.sources.filter((source) => source.cited).length} of ${plan.sources.length} retrieved sources cited in the saved version.`}
      </p>
      <ul className="plain sources">
        {plan.sources.map((source) => (
          <li key={source.chunkId} id={`source-${source.chunkId}`}>
            <details>
              <summary>
                <span className="plan-source-icon">
                  <FileText size={15} aria-hidden="true" />
                </span>
                <span className="plan-source-copy">
                  <strong>{source.heading}</strong>
                  <span className="plan-source-meta">
                    {documentTypeLabel(source.documentType)} · Match {source.similarity.toFixed(2)}
                  </span>
                  {!historical && (
                    <span className={source.cited ? 'cited' : 'uncited'}>
                      {source.cited ? 'Cited' : 'Not cited'}
                    </span>
                  )}
                </span>
                <ChevronDown size={14} className="plan-source-chevron" aria-hidden="true" />
              </summary>
              <div className="plan-source-excerpt">
                <p>
                  <BookOpen size={13} aria-hidden="true" />
                  {source.documentTitle}
                </p>
                <pre className="source-text">{source.text}</pre>
              </div>
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
    <section aria-labelledby="history-heading" className="plan-history-panel">
      <h2 id="history-heading">Version history</h2>
      <p className="plan-panel-description">Every saved version stays available to inspect.</p>
      {plan.reviews.length > 0 && (
        <>
          <h3 className="plan-panel-subheading">
            <History size={14} aria-hidden="true" />
            Review activity
          </h3>
          <ol className="plain timeline plan-review-timeline">
            {plan.reviews.map((review) => (
              <li key={`${review.action}-${review.createdAt}`}>
                <strong>{ACTION_LABEL[review.action]}</strong>
                <span className="plan-history-author">{review.actorName}</span>
                <div className="muted small">{formatDateTime(review.createdAt)}</div>
                {review.comment && <blockquote>{review.comment}</blockquote>}
              </li>
            ))}
          </ol>
        </>
      )}
      <h3 className="plan-panel-subheading">
        <GitBranch size={14} aria-hidden="true" />
        Saved versions
      </h3>
      <ol className="plain timeline plan-version-list">
        {plan.versions.map((version) => (
          <li key={version.version}>
            <button
              type="button"
              className="plan-version-button"
              aria-pressed={
                viewingVersion === null
                  ? version.version === plan.currentVersion
                  : viewingVersion === version.version
              }
              onClick={() =>
                onViewVersion(version.version === plan.currentVersion ? null : version.version)
              }
            >
              <span className="plan-version-topline">
                <strong>Version {version.version}</strong>
                {version.version === plan.currentVersion && (
                  <span className="plan-current-version">Current</span>
                )}
                <ChevronRight size={14} aria-hidden="true" />
              </span>
              <span className="plan-history-author">{version.authorName}</span>
              <time dateTime={version.createdAt}>{formatDateTime(version.createdAt)}</time>
              {version.changeNote && (
                <span className="plan-version-note">{version.changeNote}</span>
              )}
              <GroundingBadge status={version.groundingStatus} compact />
            </button>
          </li>
        ))}
      </ol>
      {plan.generation && (
        <details className="plan-generation-details">
          <summary>
            <Clock3 size={14} aria-hidden="true" />
            Generation details
            <ChevronDown size={14} aria-hidden="true" />
          </summary>
          <p>
            Drafted by {plan.generation.provider}/{plan.generation.model} in{' '}
            {(plan.generation.latencyMs / 1000).toFixed(1)}s, {plan.generation.attempts} attempt
            {plan.generation.attempts === 1 ? '' : 's'},{' '}
            {plan.generation.inputTokens + plan.generation.outputTokens} tokens, est. $
            {plan.generation.estimatedCostUsd.toFixed(4)}
          </p>
        </details>
      )}
    </section>
  );
}
