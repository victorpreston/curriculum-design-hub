import { describe, expect, it } from 'vitest';
import {
  LessonPlanContentSchema,
  citedSourceIds,
  scheduledMinutes,
  timingProblem,
  type LessonPlanContent,
} from './lessonPlan';

function validPlan(): LessonPlanContent {
  return {
    title: 'Elements and compounds around us',
    keyInquiryQuestion: 'How can we tell an element from a compound?',
    objectives: ['Classify common substances as elements or compounds'],
    materials: ['Sample cards', 'Periodic table chart'],
    coreCompetencies: ['Critical thinking and problem solving'],
    starter: {
      title: 'What is it made of?',
      durationMinutes: 5,
      teacherActions: 'Show water, a copper wire and table salt and ask what each is made of.',
      learnerActions: 'Discuss in pairs and share one idea with the class.',
      sourceIds: ['sow-elements-compounds#lesson-1'],
    },
    mainActivities: [
      {
        title: 'Card sort',
        durationMinutes: 25,
        teacherActions: 'Hand out substance cards and circulate while groups sort them.',
        learnerActions: 'Sort cards into elements and compounds and justify each choice.',
        sourceIds: ['sow-elements-compounds#lesson-1', 'lo-mixtures#is8-1-1-a'],
      },
    ],
    checkForUnderstanding: {
      durationMinutes: 10,
      questions: ['Why is water a compound and not an element?'],
      sourceIds: ['assess-mixtures#item-1'],
    },
  };
}

describe('lesson plan schema', () => {
  it('accepts a complete plan', () => {
    expect(LessonPlanContentSchema.safeParse(validPlan()).success).toBe(true);
  });

  it('rejects a plan without main activities', () => {
    const plan = { ...validPlan(), mainActivities: [] };
    expect(LessonPlanContentSchema.safeParse(plan).success).toBe(false);
  });

  it('rejects malformed source ids', () => {
    const plan = validPlan();
    plan.starter.sourceIds = ['not a chunk id'];
    expect(LessonPlanContentSchema.safeParse(plan).success).toBe(false);
  });

  it('rejects zero-minute activities', () => {
    const plan = validPlan();
    plan.starter.durationMinutes = 0;
    expect(LessonPlanContentSchema.safeParse(plan).success).toBe(false);
  });

  it('rejects unexpected types from a model', () => {
    const plan = { ...validPlan(), objectives: 'Classify substances' };
    expect(LessonPlanContentSchema.safeParse(plan).success).toBe(false);
  });
});

describe('lesson timings', () => {
  it('sums starter, main activities and check for understanding', () => {
    expect(scheduledMinutes(validPlan())).toBe(40);
  });

  it('reports no problem when timings match the lesson', () => {
    expect(timingProblem(validPlan(), 40)).toBeNull();
  });

  it('describes a mismatch', () => {
    expect(timingProblem(validPlan(), 80)).toContain('40 minutes but the lesson is 80');
  });
});

describe('cited source ids', () => {
  it('collects unique ids from every section', () => {
    expect(citedSourceIds(validPlan())).toEqual([
      'sow-elements-compounds#lesson-1',
      'lo-mixtures#is8-1-1-a',
      'assess-mixtures#item-1',
    ]);
  });
});
