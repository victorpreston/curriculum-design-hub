CREATE TYPE "public"."document_type" AS ENUM('learning_outcomes', 'scheme_of_work', 'assessment', 'teacher_guide');--> statement-breakpoint
CREATE TYPE "public"."workflow_action" AS ENUM('submit', 'approve', 'return');--> statement-breakpoint
ALTER TABLE "corpus_documents" ALTER COLUMN "type" SET DATA TYPE "public"."document_type" USING "type"::"public"."document_type";--> statement-breakpoint
ALTER TABLE "review_events" ALTER COLUMN "action" SET DATA TYPE "public"."workflow_action" USING "action"::"public"."workflow_action";