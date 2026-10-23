import { useId, useState } from 'react';
import {
  MAX_MAIN_ACTIVITIES,
  scheduledMinutes,
  type LessonActivity,
  type LessonPlanContent,
  type SourceDto,
} from '@hub/shared';
import { documentTypeLabel } from '../lib/format';

function ListField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (items: string[]) => void;
}) {
  const [text, setText] = useState(value.join('\n'));
  const hintId = useId();
  return (
    <label>
      {label}
      <span id={hintId} className="muted small">
        One per line
      </span>
      <textarea
        rows={Math.max(3, value.length + 1)}
        value={text}
        aria-describedby={hintId}
        onChange={(event) => {
          setText(event.target.value);
          onChange(
            event.target.value
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean),
          );
        }}
      />
    </label>
  );
}

function SourcePicker({
  selected,
  sources,
  onChange,
}: {
  selected: string[];
  sources: SourceDto[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(
      selected.includes(id) ? selected.filter((existing) => existing !== id) : [...selected, id],
    );
  }
  return (
    <fieldset className="source-picker">
      <legend>Curriculum sources</legend>
      {sources.map((source) => (
        <label key={source.chunkId} className="inline">
          <input
            type="checkbox"
            checked={selected.includes(source.chunkId)}
            onChange={() => toggle(source.chunkId)}
          />
          {source.heading}{' '}
          <span className="muted small">({documentTypeLabel(source.documentType)})</span>
        </label>
      ))}
    </fieldset>
  );
}

function ActivityFields({
  legend,
  activity,
  sources,
  onChange,
  onRemove,
}: {
  legend: string;
  activity: LessonActivity;
  sources: SourceDto[];
  onChange: (activity: LessonActivity) => void;
  onRemove?: () => void;
}) {
  const update = (changes: Partial<LessonActivity>) => onChange({ ...activity, ...changes });
  return (
    <fieldset className="activity-fields">
      <legend>{legend}</legend>
      <div className="row">
        <label className="grow">
          Title
          <input value={activity.title} onChange={(e) => update({ title: e.target.value })} />
        </label>
        <label className="minutes-input">
          Minutes
          <input
            type="number"
            min={1}
            value={activity.durationMinutes}
            onChange={(e) => update({ durationMinutes: Number(e.target.value) })}
          />
        </label>
      </div>
      <label>
        Teacher actions
        <textarea
          rows={4}
          value={activity.teacherActions}
          onChange={(e) => update({ teacherActions: e.target.value })}
        />
      </label>
      <label>
        Learner actions
        <textarea
          rows={3}
          value={activity.learnerActions}
          onChange={(e) => update({ learnerActions: e.target.value })}
        />
      </label>
      <SourcePicker
        selected={activity.sourceIds}
        sources={sources}
        onChange={(sourceIds) => update({ sourceIds })}
      />
      {onRemove && (
        <button type="button" className="danger-link" onClick={onRemove}>
          Remove this activity
        </button>
      )}
    </fieldset>
  );
}

const NEW_ACTIVITY: LessonActivity = {
  title: 'New activity',
  durationMinutes: 5,
  teacherActions: 'Describe what the teacher does.',
  learnerActions: 'Describe what learners do.',
  sourceIds: [],
};

export function PlanEditor({
  content,
  sources,
  lessonMinutes,
  onChange,
}: {
  content: LessonPlanContent;
  sources: SourceDto[];
  lessonMinutes: number;
  onChange: (content: LessonPlanContent) => void;
}) {
  const update = (changes: Partial<LessonPlanContent>) => onChange({ ...content, ...changes });
  const scheduled = scheduledMinutes(content);

  function updateActivity(index: number, activity: LessonActivity) {
    update({
      mainActivities: content.mainActivities.map((existing, i) =>
        i === index ? activity : existing,
      ),
    });
  }

  return (
    <div className="editor stack">
      <label>
        Title
        <input value={content.title} onChange={(e) => update({ title: e.target.value })} />
      </label>
      <label>
        Key inquiry question
        <input
          value={content.keyInquiryQuestion}
          onChange={(e) => update({ keyInquiryQuestion: e.target.value })}
        />
      </label>
      <div className="lists">
        <ListField
          label="Objectives"
          value={content.objectives}
          onChange={(objectives) => update({ objectives })}
        />
        <ListField
          label="Materials"
          value={content.materials}
          onChange={(materials) => update({ materials })}
        />
        <ListField
          label="Core competencies"
          value={content.coreCompetencies}
          onChange={(coreCompetencies) => update({ coreCompetencies })}
        />
      </div>

      <p className={`timing ${scheduled === lessonMinutes ? 'ok' : 'off'}`} aria-live="polite">
        Scheduled {scheduled} of {lessonMinutes} minutes
        {scheduled !== lessonMinutes &&
          ` (adjust activity minutes by ${lessonMinutes - scheduled})`}
      </p>

      <ActivityFields
        legend="Starter"
        activity={content.starter}
        sources={sources}
        onChange={(starter) => update({ starter })}
      />
      {content.mainActivities.map((activity, index) => (
        <ActivityFields
          key={index}
          legend={`Activity ${index + 1}`}
          activity={activity}
          sources={sources}
          onChange={(changed) => updateActivity(index, changed)}
          onRemove={
            content.mainActivities.length > 1
              ? () =>
                  update({ mainActivities: content.mainActivities.filter((_, i) => i !== index) })
              : undefined
          }
        />
      ))}
      {content.mainActivities.length < MAX_MAIN_ACTIVITIES && (
        <button
          type="button"
          onClick={() => update({ mainActivities: [...content.mainActivities, NEW_ACTIVITY] })}
        >
          Add activity
        </button>
      )}

      <fieldset className="activity-fields">
        <legend>Check for understanding</legend>
        <label className="minutes-input">
          Minutes
          <input
            type="number"
            min={1}
            value={content.checkForUnderstanding.durationMinutes}
            onChange={(e) =>
              update({
                checkForUnderstanding: {
                  ...content.checkForUnderstanding,
                  durationMinutes: Number(e.target.value),
                },
              })
            }
          />
        </label>
        <ListField
          label="Questions"
          value={content.checkForUnderstanding.questions}
          onChange={(questions) =>
            update({ checkForUnderstanding: { ...content.checkForUnderstanding, questions } })
          }
        />
        <SourcePicker
          selected={content.checkForUnderstanding.sourceIds}
          sources={sources}
          onChange={(sourceIds) =>
            update({ checkForUnderstanding: { ...content.checkForUnderstanding, sourceIds } })
          }
        />
      </fieldset>
    </div>
  );
}
