import type { GroundingReport } from '@hub/shared';

const HEADLINE = {
  grounded:
    'Every activity cites relevant curriculum sources retrieved for this outcome. Check that each activity matches its source before submitting.',
  weak: 'Some parts of this plan are weakly supported by the curriculum. Check them before submitting.',
  ungrounded:
    'This plan does not cite any curriculum source. Treat it as unverified; it cannot be submitted until a source is linked.',
} as const;

export function GroundingBanner({ grounding }: { grounding: GroundingReport }) {
  return (
    <section
      className={`banner grounding-banner-${grounding.status}`}
      role={grounding.status === 'grounded' ? 'status' : 'alert'}
      aria-label="Curriculum grounding"
    >
      <strong>{HEADLINE[grounding.status]}</strong>
      <p className="muted">
        {grounding.validCitationCount} valid citation{grounding.validCitationCount === 1 ? '' : 's'}{' '}
        · best source match {grounding.bestSimilarity.toFixed(2)}
      </p>
      {grounding.notes.length > 0 && (
        <ul>
          {grounding.notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
