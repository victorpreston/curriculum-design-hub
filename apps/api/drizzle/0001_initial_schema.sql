CREATE TYPE "public"."grounding_status" AS ENUM('grounded', 'weak', 'ungrounded');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('draft', 'submitted', 'returned', 'published');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('teacher', 'curriculum_lead');--> statement-breakpoint
CREATE TABLE "corpus_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"position" integer NOT NULL,
	"heading" text NOT NULL,
	"text" text NOT NULL,
	"outcome_codes" text[] NOT NULL,
	"embedding" vector(384) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corpus_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"subject" text NOT NULL,
	"grade" integer NOT NULL,
	"strand" text NOT NULL,
	"content_hash" text NOT NULL,
	"embedding_model" text NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"learning_outcome_code" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"succeeded" boolean NOT NULL,
	"failure_code" text,
	"failure_detail" text,
	"attempts" integer NOT NULL,
	"latency_ms" integer NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"estimated_cost_usd" double precision NOT NULL,
	"retrieved_sources" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_outcomes" (
	"code" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"strand" text NOT NULL,
	"sub_strand" text NOT NULL,
	"chunk_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_plan_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"grounding" jsonb NOT NULL,
	"author_id" uuid NOT NULL,
	"change_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"learning_outcome_code" text NOT NULL,
	"generation_id" uuid NOT NULL,
	"duration_minutes" integer NOT NULL,
	"title" text NOT NULL,
	"status" "plan_status" DEFAULT 'draft' NOT NULL,
	"grounding_status" "grounding_status" NOT NULL,
	"current_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "review_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"from_status" "plan_status" NOT NULL,
	"to_status" "plan_status" NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "corpus_chunks" ADD CONSTRAINT "corpus_chunks_document_id_corpus_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."corpus_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_learning_outcome_code_learning_outcomes_code_fk" FOREIGN KEY ("learning_outcome_code") REFERENCES "public"."learning_outcomes"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_outcomes" ADD CONSTRAINT "learning_outcomes_chunk_id_corpus_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."corpus_chunks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_plan_versions" ADD CONSTRAINT "lesson_plan_versions_plan_id_lesson_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."lesson_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_plan_versions" ADD CONSTRAINT "lesson_plan_versions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_learning_outcome_code_learning_outcomes_code_fk" FOREIGN KEY ("learning_outcome_code") REFERENCES "public"."learning_outcomes"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_plan_id_lesson_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."lesson_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "corpus_chunks_embedding_idx" ON "corpus_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_plan_versions_plan_version_idx" ON "lesson_plan_versions" USING btree ("plan_id","version");--> statement-breakpoint
CREATE INDEX "lesson_plans_owner_idx" ON "lesson_plans" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "lesson_plans_status_idx" ON "lesson_plans" USING btree ("status");