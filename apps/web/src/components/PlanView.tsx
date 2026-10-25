import type { LessonActivity, LessonPlanContent, SourceDto } from '@hub/shared';
import { BookOpen, ClipboardCheck, HelpCircle, ListChecks } from 'lucide-react';

function SourceRefs({
  ids,
  sources,
  onSourceSelect,
}: {
  ids: string[];
  sources: SourceDto[];
  onSourceSelect?: (id: string) => void;
}) {
  if (ids.length === 0) return <p className="source-refs missing">No curriculum source cited</p>;
  return (
    <p className="source-refs">
      <span className="plan-citation-label">
        <BookOpen size={13} aria-hidden="true" />
        Sources
      </span>{' '}
      {ids.map((id) => {
        const source = sources.find((candidate) => candidate.chunkId === id);
        return (
          <a
            key={id}
            href={`#source-${id}`}
            className="source-chip"
            onClick={
              onSourceSelect
                ? (event) => {
                    event.preventDefault();
                    onSourceSelect(id);
                  }
                : undefined
            }
          >
            {source ? source.heading : id}
          </a>
        );
      })}
    </p>
  );
}

function ActivityView({
  activity,
  label,
  sources,
  onSourceSelect,
}: {
  activity: LessonActivity;
  label: string;
  sources: SourceDto[];
  onSourceSelect?: (id: string) => void;
}) {
  return (
    <article className="activity">
      <header className="plan-activity-heading">
        <span className="plan-phase-icon">
          <ListChecks size={16} aria-hidden="true" />
        </span>
        <div>
          <span className="plan-phase-label">{label}</span>
          <h3>{activity.title}</h3>
        </div>
        <span className="minutes">{activity.durationMinutes} min</span>
      </header>
      <div className="plan-action-columns">
        <section>
          <h4>Teacher actions</h4>
          <p>{activity.teacherActions}</p>
        </section>
        <section>
          <h4>Learner actions</h4>
          <p>{activity.learnerActions}</p>
        </section>
      </div>
      <SourceRefs ids={activity.sourceIds} sources={sources} onSourceSelect={onSourceSelect} />
    </article>
  );
}

export function PlanView({
  content,
  sources,
  onSourceSelect,
}: {
  content: LessonPlanContent;
  sources: SourceDto[];
  onSourceSelect?: (id: string) => void;
}) {
  return (
    <div className="plan-view">
      <section className="card plan-read-overview" aria-label="Lesson overview">
        <div className="plan-inquiry">
          <HelpCircle size={19} aria-hidden="true" />
          <div>
            <h2>Key inquiry question</h2>
            <p>{content.keyInquiryQuestion}</p>
          </div>
        </div>
        <div className="lists">
          <section>
            <h3>Objectives</h3>
            <ul>
              {content.objectives.map((objective, index) => (
                <li key={index}>{objective}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3>Materials</h3>
            <ul>
              {content.materials.map((material, index) => (
                <li key={index}>{material}</li>
              ))}
            </ul>
          </section>
          {content.coreCompetencies.length > 0 && (
            <section>
              <h3>Core competencies</h3>
              <ul>
                {content.coreCompetencies.map((competency, index) => (
                  <li key={index}>{competency}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </section>
      <h2 className="plan-sequence-title">Lesson sequence</h2>
      <ActivityView
        activity={content.starter}
        label="Starter"
        sources={sources}
        onSourceSelect={onSourceSelect}
      />
      {content.mainActivities.map((activity, index) => (
        <ActivityView
          key={index}
          activity={activity}
          label={`Activity ${index + 1}`}
          sources={sources}
          onSourceSelect={onSourceSelect}
        />
      ))}
      <article className="activity">
        <header className="plan-activity-heading">
          <span className="plan-phase-icon">
            <ClipboardCheck size={16} aria-hidden="true" />
          </span>
          <h3>Check for understanding</h3>
          <span className="minutes">{content.checkForUnderstanding.durationMinutes} min</span>
        </header>
        <ol>
          {content.checkForUnderstanding.questions.map((question, index) => (
            <li key={index}>{question}</li>
          ))}
        </ol>
        <SourceRefs
          ids={content.checkForUnderstanding.sourceIds}
          sources={sources}
          onSourceSelect={onSourceSelect}
        />
      </article>
    </div>
  );
}
