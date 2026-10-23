import {
  LONG_TEXT_MAX,
  SHORT_TEXT_MAX,
  type LessonActivity,
  type LessonPlanContent,
  type MockScenario,
  type RetrievedChunk,
} from '@hub/shared';
import {
  LlmCallError,
  type GenerationContext,
  type LlmProvider,
  type LlmRequest,
} from './llmProvider';

const FABRICATED_STARTER_SOURCE = 'sow-imaginary-topic#lesson-9';
const FABRICATED_CHECK_SOURCE = 'assess-unknown#item-7';
const STARTER_SHARE = 0.15;
const CHECK_SHARE = 0.2;
const MAX_MOCK_ACTIVITIES = 2;

function field(chunk: RetrievedChunk | undefined, label: string): string | undefined {
  if (!chunk) return undefined;
  const match = new RegExp(`^${label}:\\s*(.+)$`, 'm').exec(chunk.text);
  return match?.[1]?.trim();
}

function clip(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function listField(
  chunk: RetrievedChunk | undefined,
  label: string,
  separator: RegExp,
  limit: number,
): string[] {
  const value = field(chunk, label);
  if (!value) return [];
  return value
    .split(separator)
    .map((item) => clip(item.replace(/\.$/, '').trim(), SHORT_TEXT_MAX))
    .filter((item) => item.length >= 3)
    .slice(0, limit);
}

function splitMinutes(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  return Array.from({ length: parts }, (_, index) =>
    index === parts - 1 ? total - base * (parts - 1) : base,
  );
}

function lessonTitle(chunk: RetrievedChunk): string {
  const [, title = chunk.heading] = chunk.heading.split(':');
  return clip(title.trim(), SHORT_TEXT_MAX);
}

export function draftPlanFromSources(context: GenerationContext): LessonPlanContent {
  const { outcome, durationMinutes, sources } = context;
  const outcomeSource =
    sources.find((source) => source.documentType === 'learning_outcomes') ?? sources[0];
  const lessonSources = sources
    .filter((source) => source.documentType === 'scheme_of_work')
    .slice(0, MAX_MOCK_ACTIVITIES);
  const assessmentSource = sources.find((source) => source.documentType === 'assessment');
  if (!outcomeSource) throw new Error('Mock drafting needs at least one retrieved source');
  const activitySources = lessonSources.length > 0 ? lessonSources : [outcomeSource];

  const starterMinutes = Math.max(1, Math.round(durationMinutes * STARTER_SHARE));
  const checkMinutes = Math.max(1, Math.round(durationMinutes * CHECK_SHARE));
  const activityMinutes = splitMinutes(
    durationMinutes - starterMinutes - checkMinutes,
    Math.max(1, activitySources.length),
  );

  const keyInquiryQuestion =
    field(outcomeSource, 'Key inquiry question') ??
    `What do we need to know to ${outcome.description.toLowerCase()}?`;

  const mainActivities: LessonActivity[] = activitySources.map((source, index) => ({
    title: lessonTitle(source),
    durationMinutes: activityMinutes[index] ?? 1,
    teacherActions: clip(
      field(source, 'Learning experiences') ??
        field(source, 'Suggested learning experiences') ??
        `Guide learners through the activity described in ${source.heading}.`,
      LONG_TEXT_MAX,
    ),
    learnerActions: clip(
      `Work in groups to ${(field(source, 'Lesson focus') ?? outcome.description).replace(/\.$/, '').toLowerCase()}, recording observations in exercise books.`,
      LONG_TEXT_MAX,
    ),
    sourceIds: [source.chunkId],
  }));

  return {
    title: clip(
      `${outcome.subStrand.replace(/^[\d.]+\s*/, '')}: ${lessonTitle(activitySources[0] ?? outcomeSource)}`,
      SHORT_TEXT_MAX,
    ),
    keyInquiryQuestion: clip(keyInquiryQuestion, SHORT_TEXT_MAX),
    objectives: [
      clip(
        `By the end of the lesson, learners should be able to ${outcome.description.charAt(0).toLowerCase()}${outcome.description.slice(1)}`,
        SHORT_TEXT_MAX,
      ),
    ],
    materials: listField(lessonSources[0], 'Resources', /,\s*/, 8)
      .concat(['Exercise books'])
      .slice(0, 12),
    coreCompetencies: listField(outcomeSource, 'Core competencies', /;\s*/, 4),
    starter: {
      title: 'Hook: key inquiry question',
      durationMinutes: starterMinutes,
      teacherActions: clip(
        `Pose the key inquiry question "${keyInquiryQuestion}" and invite learners to share what they already know from home and earlier lessons.`,
        LONG_TEXT_MAX,
      ),
      learnerActions:
        'Discuss the question in pairs, then a few pairs share one idea with the class.',
      sourceIds: [outcomeSource.chunkId],
    },
    mainActivities,
    checkForUnderstanding: {
      durationMinutes: checkMinutes,
      questions: [
        clip(
          field(assessmentSource, 'Question') ??
            `Explain in your own words how to ${outcome.description.toLowerCase()}.`,
          SHORT_TEXT_MAX,
        ),
      ],
      sourceIds: [(assessmentSource ?? outcomeSource).chunkId],
    },
  };
}

function withoutCitations(plan: LessonPlanContent): LessonPlanContent {
  return {
    ...plan,
    starter: { ...plan.starter, sourceIds: [] },
    mainActivities: plan.mainActivities.map((activity) => ({ ...activity, sourceIds: [] })),
    checkForUnderstanding: { ...plan.checkForUnderstanding, sourceIds: [] },
  };
}

function withFabricatedCitations(plan: LessonPlanContent): LessonPlanContent {
  return {
    ...plan,
    starter: { ...plan.starter, sourceIds: [...plan.starter.sourceIds, FABRICATED_STARTER_SOURCE] },
    checkForUnderstanding: {
      ...plan.checkForUnderstanding,
      sourceIds: [...plan.checkForUnderstanding.sourceIds, FABRICATED_CHECK_SOURCE],
    },
  };
}

function waitForAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    signal.addEventListener(
      'abort',
      () => reject(new LlmCallError('timeout', 'simulated slow response')),
      {
        once: true,
      },
    );
  });
}

const MOCK_MODEL = 'mock-deterministic-v1';

type ContentScenario = Exclude<MockScenario, 'timeout' | 'provider_error'>;

function unhandledScenario(scenario: never): never {
  throw new Error(`Unhandled mock scenario: ${String(scenario)}`);
}

function responseFor(scenario: ContentScenario, attempt: number, plan: LessonPlanContent): string {
  switch (scenario) {
    case 'ok':
      return JSON.stringify(plan);
    case 'invalid_then_ok':
      return attempt === 1
        ? '```json\n{"title": "Elements and compounds", "objectives": ['
        : JSON.stringify(plan);
    case 'invalid_json':
      return 'Sure! Here is a lesson plan you will love: {"title": "Lesson", "starter": ';
    case 'schema_violation':
      return JSON.stringify({ ...plan, mainActivities: [], objectives: 'Learn about the topic' });
    case 'uncited':
      return JSON.stringify(withoutCitations(plan));
    case 'fabricated_citation':
      return JSON.stringify(withFabricatedCitations(plan));
    default:
      return unhandledScenario(scenario);
  }
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function createMockProvider(defaultScenario: MockScenario): LlmProvider {
  return {
    name: 'mock',
    model: MOCK_MODEL,
    async complete(request: LlmRequest) {
      const scenario = request.scenario ?? defaultScenario;
      if (scenario === 'timeout') return waitForAbort(request.signal);
      if (scenario === 'provider_error')
        throw new LlmCallError('unavailable', 'simulated provider outage');

      const text = responseFor(scenario, request.attempt, draftPlanFromSources(request.context));
      const promptText =
        request.system + request.messages.map((message) => message.content).join('');
      return {
        text,
        model: MOCK_MODEL,
        inputTokens: estimateTokens(promptText),
        outputTokens: estimateTokens(text),
      };
    },
  };
}
