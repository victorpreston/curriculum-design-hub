import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpenCheck,
  ChevronDown,
  ClipboardCheck,
  FilePenLine,
  SearchCheck,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import { SUPPORTED_GRADES } from '@hub/shared';
import { GroundingBadge } from '../components/Badges';
import { useSignedInUser } from '../lib/auth';

const STEPS = [
  {
    title: 'Set your teaching context',
    icon: SlidersHorizontal,
    summary: 'Choose a grade, learning outcome, and lesson duration.',
    detail:
      'Start in My plans. Choose a supported Grade 5–8 outcome and the time available. The app keeps the outcome and retrieved evidence within your selected grade.',
  },
  {
    title: 'Find curriculum evidence',
    icon: SearchCheck,
    summary: 'Relevant curriculum excerpts give the draft its starting point.',
    detail:
      'Retrieval-Augmented Generation (RAG) means finding evidence before drafting. The app prioritises excerpts linked to your chosen outcome, then adds related excerpts from the same grade. You can inspect these sources alongside the saved lesson.',
  },
  {
    title: 'Draft, check, and refine',
    icon: FilePenLine,
    summary: 'Review activities, timings, materials, and source links.',
    detail:
      'The app checks the lesson structure and activity timings before saving. It removes citations to sources it did not retrieve and flags missing or weak evidence. Teachers can edit drafts, save new versions, and inspect earlier versions.',
  },
  {
    title: 'Review and publish',
    icon: ClipboardCheck,
    summary: 'Submit to a curriculum lead before sharing with the team.',
    detail:
      'A curriculum lead reviews the lesson and its evidence, then approves it into the shared lesson bank or returns it with a comment. Submitted plans stay read-only during review. Returned plans can be revised and submitted again.',
  },
];

const GROUNDING = [
  {
    status: 'grounded' as const,
    text: 'Main activities cite retrieved evidence, and cited sections meet the source-match threshold.',
  },
  {
    status: 'weak' as const,
    text: 'Some activities lack citations, source matches are weak, or an invalid citation was removed. Inspect the warnings before relying on the plan.',
  },
  {
    status: 'ungrounded' as const,
    text: 'No valid retrieved source is cited. The plan can be saved, but submission is blocked until evidence is added.',
  },
];

export function HowItWorksPage() {
  const user = useSignedInUser();
  const isLead = user.role === 'curriculum_lead';

  return (
    <section className="guide-page stack" aria-labelledby="guide-heading">
      <div className="page-heading">
        <div>
          <h1 id="guide-heading">How it works</h1>
          <p className="muted">From curriculum evidence to a lesson your team can trust.</p>
        </div>
        <Link className="button primary" to={isLead ? '/review' : '/plans'}>
          {isLead ? 'Open review queue' : 'Draft a lesson plan'}
        </Link>
      </div>

      <div className="guide-intro">
        <span className="guide-intro-icon" aria-hidden="true">
          <BookOpenCheck size={24} strokeWidth={1.6} />
        </span>
        <div>
          <h2>Less time starting from scratch. More time shaping the lesson.</h2>
          <p>
            Find relevant curriculum evidence, build a structured draft, and keep a teacher and
            curriculum lead in the loop before publication.
          </p>
        </div>
      </div>

      <div className="guide-layout">
        <section className="guide-panel" aria-labelledby="guide-workflow-heading">
          <header className="guide-panel-heading">
            <h2 id="guide-workflow-heading">The planning workflow</h2>
            <span>4 steps</span>
          </header>
          <ol className="guide-workflow">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title}>
                  <details className="guide-workflow-step" open={index === 0}>
                    <summary>
                      <span className="guide-step-marker">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="guide-step-copy">
                        <strong>{step.title}</strong>
                        <span>{step.summary}</span>
                      </span>
                      <ChevronDown className="guide-step-chevron" size={16} aria-hidden="true" />
                    </summary>
                    <div className="guide-step-detail">
                      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                      <p>{step.detail}</p>
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
          <div className="guide-workflow-footer">
            <ShieldCheck size={16} aria-hidden="true" />
            <p>
              Evidence links support your judgement. Always check that the lesson fits your
              learners.
            </p>
          </div>
        </section>

        <aside className="guide-side">
          <section className="guide-panel" aria-labelledby="guide-grounding-heading">
            <header className="guide-panel-heading">
              <h2 id="guide-grounding-heading">Reading the evidence badges</h2>
            </header>
            <div className="guide-grounding-list">
              {GROUNDING.map((item) => (
                <div className="guide-grounding-item" key={item.status}>
                  <GroundingBadge status={item.status} />
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="guide-panel" aria-labelledby="guide-curriculum-heading">
            <header className="guide-panel-heading">
              <h2 id="guide-curriculum-heading">Supported curriculum</h2>
            </header>
            <div className="guide-curriculum">
              <p>Selected Integrated Science outcomes for Grades 5–8.</p>
              <div className="guide-grade-list">
                {SUPPORTED_GRADES.map((grade) => (
                  <span key={grade}>Grade {grade}</span>
                ))}
              </div>
              <p>Each draft retrieves evidence from the selected grade.</p>
            </div>
          </section>
        </aside>
      </div>

      <section className="guide-panel" aria-labelledby="guide-access-heading">
        <header className="guide-panel-heading">
          <h2 id="guide-access-heading">Who can do what?</h2>
          <span>Two workspace roles</span>
        </header>
        <div className="guide-access-grid">
          <article className="guide-role">
            <span className="guide-role-icon" aria-hidden="true">
              <UserRound size={19} />
            </span>
            <div>
              <h3>Teacher</h3>
              <p>
                Create and edit your own drafts, inspect evidence, and submit lessons for review.
                Read published plans in the shared bank.
              </p>
            </div>
          </article>
          <article className="guide-role">
            <span className="guide-role-icon" aria-hidden="true">
              <ShieldCheck size={19} />
            </span>
            <div>
              <h3>Curriculum lead</h3>
              <p>
                Review submitted lessons, publish or return them with comments, and view teacher
                activity summaries. Private draft content stays protected.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="guide-panel" aria-labelledby="guide-questions-heading">
        <header className="guide-panel-heading">
          <h2 id="guide-questions-heading">A few useful answers</h2>
        </header>
        <div className="guide-faq">
          <details>
            <summary>
              Can another teacher see my drafts?
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <p>
              No. Teachers see their own drafts. Curriculum leads can read lessons once they are
              submitted for review. Published lessons are available to everyone in the lesson bank.
            </p>
          </details>
          <details>
            <summary>
              Can I change a lesson after submitting it?
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <p>
              A submitted lesson is read-only while a curriculum lead reviews it. If it is returned
              with comments, you can revise it and submit again.
            </p>
          </details>
          <details>
            <summary>
              Where can I inspect the sources?
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <p>
              Open a lesson and find Curriculum sources. Expand a source to read the excerpt and see
              whether the lesson cites it. Grounding warnings explain which evidence needs
              attention.
            </p>
          </details>
        </div>
      </section>
      <Link className="guide-bank-link" to="/bank">
        Explore the shared lesson bank <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </section>
  );
}
