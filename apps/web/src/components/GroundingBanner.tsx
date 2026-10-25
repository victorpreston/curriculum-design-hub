import type { GroundingReport } from '@hub/shared';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

const HEADLINE = {
  grounded: 'Check that each activity matches its cited curriculum source before submitting.',
  weak: 'Some parts of this plan are weakly supported by the curriculum. Check them before submitting.',
  ungrounded:
    'This plan does not cite any curriculum source. Treat it as unverified; it cannot be submitted until a source is linked.',
} as const;

export function GroundingBanner({ grounding }: { grounding: GroundingReport }) {
  return (
    <section
      className={`banner plan-grounding grounding-banner-${grounding.status}`}
      role={grounding.status === 'grounded' ? 'status' : 'alert'}
      aria-label="Curriculum grounding"
    >
      {grounding.status === 'grounded' ? (
        <ShieldCheck size={19} aria-hidden="true" />
      ) : (
        <ShieldAlert size={19} aria-hidden="true" />
      )}
      <div>
        <strong>
          {grounding.status === 'grounded'
            ? 'Curriculum evidence linked'
            : grounding.status === 'weak'
              ? 'Review curriculum evidence'
              : 'Curriculum evidence needed'}
        </strong>
        <p>{HEADLINE[grounding.status]}</p>
        <p className="muted">
          {grounding.validCitationCount} valid citation
          {grounding.validCitationCount === 1 ? '' : 's'} · best source match{' '}
          {grounding.bestSimilarity.toFixed(2)}
        </p>
        {grounding.notes.length > 0 && (
          <details className="plan-grounding-notes">
            <summary>See evidence checks</summary>
            <ul>
              {grounding.notes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}
