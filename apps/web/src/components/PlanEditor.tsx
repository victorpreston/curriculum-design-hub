import { useId, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  Clock3,
  ClipboardCheck,
  ListChecks,
  Plus,
  Trash2,
} from 'lucide-react';
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
    <details className="plan-source-picker">
      <summary>
        <BookOpen size={14} aria-hidden="true" />
        <span>Curriculum sources</span>
        <span className="plan-source-count">{selected.length} linked</span>
        <ChevronDown size={14} aria-hidden="true" />
      </summary>
      <fieldset className="source-picker">
        <legend className="visually-hidden">Curriculum sources</legend>
        {sources.map((source) => (
          <label key={source.chunkId} className="inline">
            <input
              type="checkbox"
              checked={selected.includes(source.chunkId)}
              onChange={() => toggle(source.chunkId)}
            />
            <span>
              <strong>{source.heading}</strong>
              <span className="plan-source-meta">{documentTypeLabel(source.documentType)}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </details>
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
    <details className="plan-editor-activity">
      <summary>
        <span className="plan-phase-icon">
          <ListChecks size={16} aria-hidden="true" />
        </span>
        <span className="plan-phase-copy">
          <strong>{legend}</strong>
          <span>{activity.title}</span>
        </span>
        <span className="minutes">{activity.durationMinutes} min</span>
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      <fieldset className="activity-fields">
        <legend className="visually-hidden">{legend}</legend>
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
        <div className="plan-action-columns">
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
              rows={4}
              value={activity.learnerActions}
              onChange={(e) => update({ learnerActions: e.target.value })}
            />
          </label>
        </div>
        <SourcePicker
          selected={activity.sourceIds}
          sources={sources}
          onChange={(sourceIds) => update({ sourceIds })}
        />
        {onRemove && (
          <button type="button" className="danger-link" onClick={onRemove}>
            <Trash2 size={13} aria-hidden="true" />
            Remove activity
          </button>
        )}
      </fieldset>
    </details>
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
      <section className="card plan-overview" aria-labelledby="lesson-overview-heading">
        <div className="plan-section-heading">
          <span className="plan-phase-icon">
            <BookOpen size={16} aria-hidden="true" />
          </span>
          <div>
            <h2 id="lesson-overview-heading">Lesson overview</h2>
            <p>The focus, goals, and resources for this lesson.</p>
          </div>
        </div>
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
      </section>

      <div className="plan-sequence-heading">
        <h2>Lesson sequence</h2>
        <p className={`timing ${scheduled === lessonMinutes ? 'ok' : 'off'}`} aria-live="polite">
          <Clock3 size={13} aria-hidden="true" />
          {scheduled} / {lessonMinutes} min
          {scheduled !== lessonMinutes &&
            ` (adjust activity minutes by ${lessonMinutes - scheduled})`}
        </p>
      </div>

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
          <Plus size={14} aria-hidden="true" />
          Add activity
        </button>
      )}

      <details className="plan-editor-activity">
        <summary>
          <span className="plan-phase-icon">
            <ClipboardCheck size={16} aria-hidden="true" />
          </span>
          <span className="plan-phase-copy">
            <strong>Check for understanding</strong>
            <span>
              {content.checkForUnderstanding.questions.length} assessment question
              {content.checkForUnderstanding.questions.length === 1 ? '' : 's'}
            </span>
          </span>
          <span className="minutes">{content.checkForUnderstanding.durationMinutes} min</span>
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <fieldset className="activity-fields">
          <legend className="visually-hidden">Check for understanding</legend>
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
      </details>
    </div>
  );
}
