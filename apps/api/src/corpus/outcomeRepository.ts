import { and, asc, eq, sql } from 'drizzle-orm';
import type { LearningOutcomeDto, SupportedGrade } from '@hub/shared';
import type { Executor } from '../db/client';
import { learningOutcomes, lessonPlans } from '../db/schema';

export interface LearningOutcome {
  code: string;
  description: string;
  grade: number;
  strand: string;
  subStrand: string;
}

export async function findLearningOutcome(
  db: Executor,
  code: string,
): Promise<LearningOutcome | null> {
  const [outcome] = await db
    .select({
      code: learningOutcomes.code,
      description: learningOutcomes.description,
      grade: learningOutcomes.grade,
      strand: learningOutcomes.strand,
      subStrand: learningOutcomes.subStrand,
    })
    .from(learningOutcomes)
    .where(eq(learningOutcomes.code, code));
  return outcome ?? null;
}

export async function listLearningOutcomes(db: Executor): Promise<LearningOutcomeDto[]> {
  const rows = await db
    .select({
      code: learningOutcomes.code,
      description: learningOutcomes.description,
      grade: learningOutcomes.grade,
      strand: learningOutcomes.strand,
      subStrand: learningOutcomes.subStrand,
      publishedPlanCount: sql<number>`count(${lessonPlans.id})::int`,
    })
    .from(learningOutcomes)
    .leftJoin(
      lessonPlans,
      and(
        eq(lessonPlans.learningOutcomeCode, learningOutcomes.code),
        eq(lessonPlans.status, 'published'),
      ),
    )
    .groupBy(learningOutcomes.code)
    .orderBy(asc(learningOutcomes.code));
  return rows.map((row) => ({ ...row, grade: row.grade as SupportedGrade }));
}

export async function listOutcomesWithSourceChunk(db: Executor) {
  return db.select().from(learningOutcomes).orderBy(asc(learningOutcomes.code));
}
