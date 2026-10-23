import type { LessonActivity, LessonPlanContent, SourceDto } from '@hub/shared';

function SourceRefs({ ids, sources }: { ids: string[]; sources: SourceDto[] }) {
  if (ids.length === 0) return <p className="source-refs missing">No curriculum source cited</p>;
  return (
    <p className="source-refs">
      Sources:{' '}
      {ids.map((id) => {
        const source = sources.find((candidate) => candidate.chunkId === id);
        return (
          <a key={id} href={`#source-${id}`} className="source-chip">
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
}: {
  activity: LessonActivity;
  label: string;
  sources: SourceDto[];
}) {
  return (
    <article className="activity">
      <h3>
        {label}: {activity.title} <span className="minutes">{activity.durationMinutes} min</span>
      </h3>
      <h4>Teacher</h4>
      <p>{activity.teacherActions}</p>
      <h4>Learners</h4>
      <p>{activity.learnerActions}</p>
      <SourceRefs ids={activity.sourceIds} sources={sources} />
    </article>
  );
}

export function PlanView({
  content,
  sources,
}: {
  content: LessonPlanContent;
  sources: SourceDto[];
}) {
  return (
    <div className="plan-view">
      <p className="inquiry">
        <strong>Key inquiry question:</strong> {content.keyInquiryQuestion}
      </p>
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
      <ActivityView activity={content.starter} label="Starter" sources={sources} />
      {content.mainActivities.map((activity, index) => (
        <ActivityView
          key={index}
          activity={activity}
          label={`Activity ${index + 1}`}
          sources={sources}
        />
      ))}
      <article className="activity">
        <h3>
          Check for understanding{' '}
          <span className="minutes">{content.checkForUnderstanding.durationMinutes} min</span>
        </h3>
        <ol>
          {content.checkForUnderstanding.questions.map((question, index) => (
            <li key={index}>{question}</li>
          ))}
        </ol>
        <SourceRefs ids={content.checkForUnderstanding.sourceIds} sources={sources} />
      </article>
    </div>
  );
}
