import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';
import {
  DOCUMENT_TYPES,
  GROUNDING_STATUSES,
  PLAN_STATUSES,
  ROLES,
  WORKFLOW_ACTIONS,
  type GroundingReport,
  type LessonPlanContent,
  type SourceScore,
} from '@hub/shared';

export const EMBEDDING_DIMENSIONS = 384;

export const roleEnum = pgEnum('role', ROLES);
export const planStatusEnum = pgEnum('plan_status', PLAN_STATUSES);
export const groundingStatusEnum = pgEnum('grounding_status', GROUNDING_STATUSES);
export const documentTypeEnum = pgEnum('document_type', DOCUMENT_TYPES);
export const workflowActionEnum = pgEnum('workflow_action', WORKFLOW_ACTIONS);

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull(),
  createdAt: createdAt(),
});

export const corpusDocuments = pgTable('corpus_documents', {
  id: text('id').primaryKey(),
  type: documentTypeEnum('type').notNull(),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  grade: integer('grade').notNull(),
  strand: text('strand').notNull(),
  contentHash: text('content_hash').notNull(),
  embeddingModel: text('embedding_model').notNull(),
  ingestedAt: timestamp('ingested_at', { withTimezone: true }).notNull().defaultNow(),
});

export const corpusChunks = pgTable(
  'corpus_chunks',
  {
    id: text('id').primaryKey(),
    documentId: text('document_id')
      .notNull()
      .references(() => corpusDocuments.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    heading: text('heading').notNull(),
    text: text('text').notNull(),
    outcomeCodes: text('outcome_codes').array().notNull(),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
  },
  (table) => [
    index('corpus_chunks_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  ],
);

export const learningOutcomes = pgTable('learning_outcomes', {
  code: text('code').primaryKey(),
  description: text('description').notNull(),
  grade: integer('grade').notNull(),
  strand: text('strand').notNull(),
  subStrand: text('sub_strand').notNull(),
  chunkId: text('chunk_id')
    .notNull()
    .references(() => corpusChunks.id),
});

export const generations = pgTable('generations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  learningOutcomeCode: text('learning_outcome_code')
    .notNull()
    .references(() => learningOutcomes.code),
  durationMinutes: integer('duration_minutes').notNull(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  succeeded: boolean('succeeded').notNull(),
  failureCode: text('failure_code'),
  failureDetail: text('failure_detail'),
  attempts: integer('attempts').notNull(),
  latencyMs: integer('latency_ms').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  estimatedCostUsd: doublePrecision('estimated_cost_usd').notNull(),
  retrievedSources: jsonb('retrieved_sources').$type<SourceScore[]>().notNull(),
  createdAt: createdAt(),
});

export const lessonPlans = pgTable(
  'lesson_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    learningOutcomeCode: text('learning_outcome_code')
      .notNull()
      .references(() => learningOutcomes.code),
    generationId: uuid('generation_id')
      .notNull()
      .references(() => generations.id),
    durationMinutes: integer('duration_minutes').notNull(),
    title: text('title').notNull(),
    status: planStatusEnum('status').notNull().default('draft'),
    groundingStatus: groundingStatusEnum('grounding_status').notNull(),
    currentVersion: integer('current_version').notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    index('lesson_plans_owner_idx').on(table.ownerId),
    index('lesson_plans_status_idx').on(table.status),
  ],
);

export const lessonPlanVersions = pgTable(
  'lesson_plan_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => lessonPlans.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    content: jsonb('content').$type<LessonPlanContent>().notNull(),
    grounding: jsonb('grounding').$type<GroundingReport>().notNull(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    changeNote: text('change_note'),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex('lesson_plan_versions_plan_version_idx').on(table.planId, table.version)],
);

export const reviewEvents = pgTable('review_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id')
    .notNull()
    .references(() => lessonPlans.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => users.id),
  action: workflowActionEnum('action').notNull(),
  fromStatus: planStatusEnum('from_status').notNull(),
  toStatus: planStatusEnum('to_status').notNull(),
  comment: text('comment'),
  createdAt: createdAt(),
});
