# Curriculum Design Hub

Nova Pioneer's Curriculum Design Hub. A teacher picks a CBC grade from 5 to 8, learning outcome and lesson length, then gets an AI-drafted lesson plan built only from retrieved curriculum material, with every activity citing its sources. The teacher edits it (every save is a new version) and submits it. A Curriculum Lead approves it into a shared lesson bank or returns it with a comment.

**Loom walkthrough:**

## Contents

1. [Run it](#1-run-it)
2. [Demo accounts and click-through](#2-demo-accounts-and-click-through)
3. [How a request becomes a grounded lesson plan](#3-how-a-request-becomes-a-grounded-lesson-plan)
4. [What happens when generation fails](#4-what-happens-when-generation-fails)
5. [Access control and workflow](#5-access-control-and-workflow)
6. [Architecture and data model](#6-architecture-and-data-model)
7. [Corpus format and lesson plan schema](#7-corpus-format-and-lesson-plan-schema)
8. [Tests and evidence](#8-tests-and-evidence)
9. [Privacy](#9-privacy)
10. [Assumptions, trade-offs, what I cut, what's next](#10-assumptions-trade-offs-what-i-cut-whats-next)

## 1. Run it

Requirements: Node 20.11+, Docker Desktop (for Postgres + pgvector).

```bash
npm install
npm run setup      # creates .env, starts Postgres, runs migrations, ingests the corpus, seeds users and two example plans
npm run dev        # API on :4000, web app on http://localhost:5173
```

The first `setup` downloads a small embedding model (all-MiniLM-L6-v2, about 23 MB) into `.cache/models`. After that everything runs offline.

**Mock mode (default, no key, no cost).** `LLM_PROVIDER=mock` drafts plans deterministically from the retrieved sources and goes through exactly the same validation, retry and grounding code as the real model. On the "Draft a new lesson plan" form, a **Mock AI behaviour** menu lets you trigger each failure mode on purpose.

**Real LLM (Claude).** In `.env`:

```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-5-5     # or claude-sonnet-5-5 / claude-haiku-5-5 for lower cost
```

Restart `npm run dev`. The failure-simulation menu disappears and the server refuses `simulate` requests when a real provider is configured.

Built and tested against `claude-opus-5-5`. Server-side refusal fallback (`fallbacks: "default"`) is requested only for models that support it (Opus and Sonnet), so switching to Sonnet or Haiku is a configuration change, but those two have not been run live.

Other commands: `npm test`, `npm run check` (lint, format, typecheck, tests), `npm run eval:retrieval`, `npm run db:reset` (wipe and re-seed the database, useful before a demo), `npm run db:down`.

## 2. Demo accounts and click-through

Password for every account: `DemoPass!2026` (the sign-in page has one-click buttons that fill these in).

| Person         | Email            | Role            |
| -------------- | ---------------- | --------------- |
| Amina Odhiambo | `amina@hub.test` | Teacher         |
| Kevin Mutua    | `kevin@hub.test` | Teacher         |
| Grace Wambui   | `grace@hub.test` | Curriculum Lead |

The seed already contains one published plan (osmosis) and one plan waiting for review (series circuits), both by Kevin.

**As Amina (teacher)**

1. Choose **Grade 8**, outcome _IS8.2.1.b Compare plant and animal cells_, and 40 minutes, then **Draft lesson plan**.
2. On the plan page, note the green grounding banner, the "Cited / Not cited" sources on the right (expand one to read the exact curriculum text), and the generation cost line under History.
3. Change the title, untick every source on one activity and watch the grounding status react after you **Save version**. Tick it back and save again. History now shows versions 1–3, and you can open any old one read-only.
4. Make the activity minutes stop adding up to 40. Saving is blocked with a clear message (the server enforces the same rule).
5. **Submit for review.** The plan is now locked for editing.
6. Pick _IS8.2.2.b_ in the form. A banner says an approved plan already exists in the lesson bank (a reuse check before generating).

**As Grace (curriculum lead)**

1. The review queue shows Kevin's plan and Amina's, oldest first.
2. Open Amina's plan and **Return with comment**. Approve is also available; returning requires a comment.
3. Sign back in as Amina: the comment appears at the top. Edit, save, resubmit. As Grace, **Approve and publish**.
4. The **Lesson bank** now lists it for every teacher, filterable by outcome.

**Isolation check:** as Kevin, open Amina's draft URL. You get "Lesson plan not found", not an access-denied page (see §5).

**Failure modes (mock mode):** set Mock AI behaviour to _Always invalid JSON_, _Breaks the lesson plan schema_, _Too slow (timeout)_, _Provider outage_, _Cites no sources_, _Invents source ids_ or _Invalid first, valid on retry_ and draft again.

## 3. How a request becomes a grounded lesson plan

The RAG pipeline combines explicit curriculum mapping with semantic similarity search before the model is called. This keeps the lesson plan tied to the selected outcome and the correct grade-level evidence.

![RAG pipeline showing curriculum mapping, semantic search, source-aware prompting and grounding safeguards](docs/rag-pipeline.png)

```
Teacher: selected grade (5–8), selected learning outcome, 40 min
   │
   ▼
POST /api/plans/generate  ── auth + teacher role + rate limit (30/h) + Zod validation
   │
   ▼
1. Retrieve (curriculum mapping first, semantics second)
   ├─ up to 4 chunks explicitly tagged with the selected outcome and grade, best match first
   └─ fill to 6 with nearest same-grade neighbours by cosine similarity (pgvector, HNSW)
   │
   ▼
2. Prompt: rules + <source id="retrieved-curriculum#section">…</source> blocks
   (corpus text escaped and fenced as data, never instructions)
   │
   ▼
3. LLM call with a hard timeout (AbortSignal); Claude uses structured outputs
   (JSON schema generated from the shared Zod schema)
   │
   ▼
4. Server validation: extract JSON → Zod schema → activity minutes must total 40
   └─ invalid? one retry with the exact problems fed back; still invalid → 502, nothing saved
   │
   ▼
5. Grounding check (server only, never trusted from the client)
   ├─ drop any cited id that was not retrieved for this request
   ├─ grounded   = every main activity cites a retrieved source and every cited section
   │               has a source above the similarity threshold
   ├─ weak       = an invented id was removed, an activity is uncited, or a section cites
   │               only weakly matching sources
   └─ ungrounded = no valid citation at all → saved, shown in red, cannot be submitted
   │
   ▼
6. One transaction: generation log (tokens, cost, latency, attempts, retrieved ids + scores)
   + plan (draft) + version 1
```

Every edit re-runs step 5 against the retrieval set stored with the original generation. A teacher can remove citations or re-link retrieved sources, but cannot cite material the system never retrieved.

**What "grounded" does and doesn't guarantee.** It guarantees that every citation points at curriculum text actually retrieved for this outcome, and that each cited section's best source is a relevant match. It does **not** prove that every sentence in an activity is supported by the cited text. That judgement stays with the curriculum lead, who sees each activity next to its sources. An automated entailment check is the first item under "What's next".

![LLM grounding pipeline showing retrieval, validation, grounding checks and versioned lesson-plan storage](docs/llm-grounding.png)

The grounding pipeline validates the structured response, removes citations outside the retrieval set, and prevents an ungrounded plan from being submitted.

## 4. What happens when generation fails

| Situation                                 | What the teacher sees                                        | HTTP | Saved?                  | Logged                   |
| ----------------------------------------- | ------------------------------------------------------------ | ---- | ----------------------- | ------------------------ |
| Invalid JSON / schema / timings, then OK  | A normal draft; History shows "2 attempts"                   | 201  | Plan                    | success, attempts=2      |
| Still invalid after the retry             | "The AI returned an unusable lesson plan 2 times…" + details | 502  | Nothing                 | failure `invalid_output` |
| Model too slow (`LLM_TIMEOUT_MS`, 90 s)   | "The AI did not respond within 90 seconds…"                  | 504  | Nothing                 | failure `timeout`        |
| Provider down / key rejected / rate limit | "The AI service is unavailable right now (reason)…"          | 503  | Nothing                 | failure `unavailable`    |
| Safety refusal                            | "The AI declined to draft this plan…"                        | 422  | Nothing                 | failure `refused`        |
| Cites invented source ids                 | Draft with "Removed N citation(s)…" note                     | 201  | Plan, citations cleaned | success                  |
| Cites nothing                             | Draft with a red "Not grounded" banner; Submit disabled      | 201  | Plan, flagged           | success                  |
| Teacher over the hourly limit             | "You have reached the limit of 30 AI drafts per hour…"       | 429  | Nothing                 | none                     |

The SDK retries transient 429/5xx once. Our own retry is only for unusable output; a timeout is never retried. Provider error text is logged and stored in `generations.failure_detail`, but the teacher only ever sees a fixed, safe reason.

## 5. Access control and workflow

All checks happen on the server. The UI hides buttons for convenience only.

| Action                        | Owner teacher | Other teacher | Curriculum lead     | Anonymous |
| ----------------------------- | ------------- | ------------- | ------------------- | --------- |
| Generate a plan               | ✅            | ✅ (own)      | 403                 | 401       |
| Read a draft                  | ✅            | **404**       | **404**             | 401       |
| Read submitted / returned     | ✅            | 404           | ✅                  | 401       |
| Read published                | ✅            | ✅            | ✅                  | 401       |
| Edit (draft or returned only) | ✅            | 404 / 403     | 403                 | 401       |
| Submit                        | ✅            | 404           | 403                 | 401       |
| Approve / return              | 403           | 403           | ✅ (submitted only) | 401       |
| View teaching team summary    | 403           | 403           | ✅                  | 401       |

Other teachers' drafts return **404, not 403**, so the API never confirms that a plan exists. Roles are re-read from the database on every request rather than trusted from the token.

The Curriculum Lead's Teaching Team page shows teacher names, emails, aggregate plan counts, review workload and last activity. It does not expose private draft content.

![Lesson-plan workflow from teacher draft through grounding, curriculum-lead review, return and publication](docs/workflow.png)

The workflow keeps teacher editing and curriculum-lead approval separate, while preserving feedback and published plans in the shared lesson bank.

The workflow is one table in `packages/shared/src/workflow.ts`, enforced by one function (`applyWorkflowAction`) inside a transaction with a row lock:

| Action    | From                | To          | Who             | Extra rule       |
| --------- | ------------------- | ----------- | --------------- | ---------------- |
| `submit`  | `draft`, `returned` | `submitted` | owning teacher  | not `ungrounded` |
| `approve` | `submitted`         | `published` | curriculum lead |                  |
| `return`  | `submitted`         | `returned`  | curriculum lead | comment required |

Anything else returns `409 invalid_transition`. Edits use optimistic concurrency (`expectedVersion`): a save from a stale browser tab gets `409 version_conflict` instead of silently overwriting. Every transition is written to `review_events` with the actor and comment.

## 6. Architecture and data model

```
packages/shared   Zod lesson-plan schema, workflow table, API contracts   (used by both apps)
apps/api          Express 5 + Drizzle + Postgres/pgvector
  src/http          routes (HTTP only) + middleware (auth, roles, errors)
  src/plans         planService (rules, transitions, versions), access policy, repository
  src/generation    generationService (pipeline), prompt, parser, grounding, mock + Claude providers
  src/corpus        parser, ingestion, embeddings (local MiniLM / hash), retrieval, retrieval eval
  src/auth          password hashing, signed session cookie
  drizzle/          SQL migrations
apps/web          React 19 + Vite + React Router; sign-in, overview, planning, plan editor/review, lesson bank, teaching team and product guide screens
corpus/           17 Markdown curriculum documents covering Grades 5–8
```

Routes only parse input and call a service. Services hold every rule. Repositories hold every query. Domain errors are typed classes mapped to HTTP in one error middleware.

| Table                  | Purpose                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `users`                | name, email, bcrypt hash, role (`teacher` / `curriculum_lead`)                           |
| `corpus_documents`     | one row per Markdown file, with content hash and embedding model for idempotent ingest   |
| `corpus_chunks`        | one row per section: text, outcome tags, `vector(384)` with an HNSW cosine index         |
| `learning_outcomes`    | the outcomes teachers choose from, linked to their source chunk                          |
| `generations`          | every attempt, success or failure: provider, model, tokens, cost, latency, retrieved ids |
| `lesson_plans`         | owner, outcome, status, grounding status, current version                                |
| `lesson_plan_versions` | append-only JSON content + grounding report per version                                  |
| `review_events`        | audit trail of submit / approve / return with comments                                   |

## 7. Corpus format and lesson plan schema

**Corpus:** see [`corpus/README.md`](corpus/README.md). In short: 17 Markdown files of 4 types (learning outcomes, schemes of work, assessment items, a teacher guide), covering Grades 5–8. Files use YAML frontmatter, one chunk per `##` section, and explicit `Outcomes:` tags.

**Lesson plan schema** (`packages/shared/src/lessonPlan.ts`, enforced on the server and reused by the editor):

```ts
{
  title: string
  keyInquiryQuestion: string                 // CBC lessons start from one
  objectives: string[1..5]
  materials: string[1..12]
  coreCompetencies: string[0..4]             // CBC core competencies
  starter:          { title, durationMinutes, teacherActions, learnerActions, sourceIds[] }
  mainActivities: [ { title, durationMinutes, teacherActions, learnerActions, sourceIds[] } ]  // 1..5
  checkForUnderstanding: { durationMinutes, questions: string[1..6], sourceIds[] }
}
// plus a cross-field rule: starter + main activities + check = lesson duration
```

Citations live on each section, not only at plan level, so a reviewer can see exactly which activity came from which source.

## 8. Tests and evidence

`npm test` runs 91 tests against a real Postgres test database (reset and migrated at the start of every run):

- **Access control:** every protected route rejects anonymous users, forged cookies are rejected, login errors don't reveal whether an email exists, teacher isolation (404s), leads can't see drafts, leads can't generate or edit, teachers can't approve, return or see the queue, `/auth/me` returns the full user, and unexpected request fields are rejected.
- **Workflow:** the full draft → submitted → returned → submitted → published path with its audit trail; every invalid transition; required return comment; ungrounded submission blocked; versions kept; stale-version conflict; timing and schema validation on save; fabricated citations stripped on save.
- **LLM output and grounding:** fenced and prose-wrapped JSON, truncated JSON, schema violations with paths, timing mismatches, retry-then-success, give-up-and-save-nothing, timeout, provider outage, uncited → ungrounded, invented ids removed, simulation refused for real providers, rate limit, the structured-output schema has no keywords Claude rejects, corpus text escaped so a document cannot close its own `<source>` tag, invented ids downgrade a plan to weak, a weak section downgrades a plan even when another section is strong, and every Claude SDK error class (401, 403, 429, 400, 5xx, connection, timeout, abort) maps to a safe user-facing reason.
- **Corpus:** parsing, frontmatter validation, idempotent re-ingest, every outcome retrieves its own outcome and a mapped lesson.

`npm run eval:retrieval` checks retrieval with the real embedding model: **21/21** outcomes retrieve their own outcome and a lesson that teaches it. Because retrieval puts curriculum-mapped chunks first, that half of the check is guaranteed by design. The meaningful signal is the similarity of the mapped and semantic chunks (typically 0.5–0.85 for relevant material versus 0.2–0.4 for unrelated material). A larger corpus needs an eval set built from real teacher queries with no mapping available.

## 9. Privacy

- **Sent to the LLM provider:** the learning outcome text, the lesson duration and the retrieved curriculum excerpts. Nothing else. No teacher names, emails or ids, no edits, no review comments.
- **Stored:** users (bcrypt-hashed passwords), plans, versions, review comments, and per-generation metadata (tokens, cost, latency, retrieved chunk ids). Prompts and raw model responses are **not** stored; only validation problems are logged when output is rejected.
- **Embeddings are computed locally**, so curriculum text never leaves the server for retrieval.
- Session: signed JWT in an `httpOnly`, `SameSite=Strict` cookie (8 h), so the browser never sends it on cross-site requests. Secrets only come from `.env`, and `.env.example` contains placeholders only.

## 10. Assumptions, trade-offs, what I cut, what's next

**Assumptions**

- One subject (Integrated Science for Grades 5–8) and single-school tenancy. Lesson length is 40 or 80 minutes (single or double lesson); the API accepts 20–120.
- Teachers may only cite sources retrieved for that plan. This keeps grounding verifiable; a "search the corpus and add a source" picker is a natural next step.
- Ungrounded drafts are kept (the teacher's work isn't thrown away) but cannot be submitted.

**Trade-offs**

- **Separate Express API instead of Next.js route handlers.** Access rules live in one testable service layer, at the cost of running two dev servers.
- **Local MiniLM embeddings instead of a hosted embedding API.** Free, offline and private. Lower quality than large hosted models, but on this corpus relevant chunks score clearly above unrelated ones.
- **Curriculum mapping before semantic search.** Curriculum-team tags are more reliable than similarity for "which lesson teaches this outcome". Semantic search fills the remaining slots.
- **Plan content as JSONB versions.** Simple append-only history and easy schema evolution; querying inside plans is harder.
- **One retry for invalid output.** Repairs most formatting slips while keeping the worst-case wait and cost bounded.

**Known limitations**

- The hourly generation limit is count-then-insert, so two drafts started at the same instant can both pass. A per-user advisory lock would close this; it wasn't worth holding a database lock across a model call here.
- If the model hits `max_tokens`, the retry uses the same limit. Plans are a few thousand tokens against a 16k limit, so this hasn't been seen in practice.
- If the connection drops during a long generation, the teacher sees a network error even though the draft may have been saved. It appears in My plans on refresh. An idempotency key on generate would remove the risk of duplicate drafts on retry.
- The automated suite never calls the paid API. The real Claude path is covered by unit tests for its output schema and error mapping.

**Deliberately cut**

- Streaming generation: a 10–60 s spinner with clear status is acceptable for a draft, and streaming complicates validation of a structured object.
- Full offline mode: unsaved edits are kept in the browser (`localStorage`) and restored after a reload or dropped connection, but generation needs the server.
- Lead editing, diffing versions, restore-to-version, notifications, password reset, multi-subject corpora, response caching.
- A full containerised app in `docker compose`: only Postgres runs in Docker, and the app runs with `npm run dev`.

**What's next**

- **Scaling the corpus:** chunk long documents by size as well as by heading, add filters by subject, track corpus versions so a plan records which curriculum version it was built on, and run nightly re-ingestion with the existing hash-based skip.
- **Retrieval quality:** grow the evaluation set from real teacher queries, and add a reranker if precision drops as the corpus grows.
- **Cost control:** the per-teacher hourly limit and per-generation cost log already exist. Next would be prompt caching for the fixed system prompt, a cheaper model for first drafts with Opus on request, and a cost dashboard from the `generations` table.
- **Versioning:** a side-by-side diff for leads, restore-a-version, and recording the version a lead approved.
- **Grounding:** add an LLM-as-judge or entailment check that each activity is actually supported by its cited text, not just that the citation exists.
