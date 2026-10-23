const STEPS = [
  {
    number: '01',
    title: 'Choose the teaching context',
    text: 'Start with a supported grade from 5 to 8, the learning outcome, and the lesson length. This keeps the draft tied to a real class need.',
  },
  {
    number: '02',
    title: 'Retrieve curriculum evidence',
    text: 'The system finds the selected outcome and nearby curriculum sections, while keeping retrieval inside the selected grade.',
  },
  {
    number: '03',
    title: 'Draft, validate, and ground',
    text: 'AI returns structured lesson-plan JSON. The server checks the schema, timing, and source IDs before the plan is saved.',
  },
  {
    number: '04',
    title: 'Review before sharing',
    text: 'Teachers edit and submit. Curriculum Leads approve aligned plans into the shared bank or return them with a useful comment.',
  },
];

export function HowItWorksPage() {
  return (
    <section className="guide-page stack" aria-labelledby="guide-heading">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Product guide</span>
          <h1 id="guide-heading">A faster path to trustworthy lessons</h1>
          <p className="muted">
            Curriculum Hub solves the gap between the time teachers have and the evidence a good
            lesson needs.
          </p>
        </div>
      </div>
      <div className="guide-callout card">
        <div className="guide-callout-mark">⌁</div>
        <div>
          <h2>AI drafts. Teachers shape. Curriculum Leads protect quality.</h2>
          <p>
            Retrieval-Augmented Generation keeps each draft close to the curriculum corpus. The
            workflow ensures that speed does not remove professional judgement.
          </p>
        </div>
      </div>
      <div className="guide-grid">
        {STEPS.map((step) => (
          <article className="guide-step card" key={step.number}>
            <span className="guide-step-number">{step.number}</span>
            <h2>{step.title}</h2>
            <p className="muted">{step.text}</p>
          </article>
        ))}
      </div>
      <div className="guide-detail-grid">
        <section className="card">
          <h2>What grounding means</h2>
          <p className="muted">
            A grounded plan cites curriculum chunks retrieved for the selected outcome and grade.
            Fabricated citations are removed, uncited sections are flagged, and ungrounded plans
            cannot be submitted for approval.
          </p>
        </section>
        <section className="card">
          <h2>Supported curriculum</h2>
          <p className="muted">
            The demo corpus covers Grade 5, Grade 6, Grade 7, and Grade 8 Integrated Science. The
            grade filter is enforced during retrieval so evidence stays in the right learner
            context.
        </p>
        </section>
      </div>
    </section>
  );
}
