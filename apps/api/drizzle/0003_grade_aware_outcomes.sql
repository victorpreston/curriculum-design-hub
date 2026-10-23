ALTER TABLE "learning_outcomes" ADD COLUMN "grade" integer NOT NULL DEFAULT 8;
--> statement-breakpoint
CREATE INDEX "learning_outcomes_grade_idx" ON "learning_outcomes" USING btree ("grade");
