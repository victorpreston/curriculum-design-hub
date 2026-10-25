# AI-assisted development log

## Pair-programming approach

I used **Claude Code with Claude Opus 5.5, High effort**, as a pair programmer for implementation, design exploration, tests, and review. I directed the work around one product goal: help a teacher produce a useful curriculum-aligned draft, retain control of edits, and pass it through review into a reusable lesson bank.

I broke the work into bounded changes with explicit acceptance criteria: which role can act, what data changes, what happens on failure, and how the behaviour will be checked. I questioned suggestions at those boundaries and used the results to decide the next change.

## Architecture and code structure

I chose separate React and Express applications within one monorepo. The interface handles interaction; the API owns authentication, retrieval, generation, validation, and publishing decisions. Routes parse requests, services coordinate rules and transactions, and repositories hold database queries. Shared TypeScript contracts and Zod schemas connect the two applications.

A single Next.js application would reduce startup processes. I accepted the additional process and proxy configuration to keep the API independently testable and business rules reusable outside a particular screen. I kept the backend as one application rather than introducing separately deployed services.

## Database and editing integrity

I chose PostgreSQL with pgvector so curriculum retrieval and application records share one datastore. Ownership, workflow state, and audit events remain relational; lesson-version content uses JSONB to preserve each structured lesson as a complete document. This avoids a second database while keeping operational queries straightforward.

Overwriting a lesson would lose the context of teacher revisions. Saves therefore append a version and update the current-version pointer transactionally. An expected-version check, row lock, and unique plan/version constraint protect against competing saves. A stale browser receives a conflict instead of silently replacing newer work.

One concrete correction concerned the teaching-team query: its aggregate timestamp was typed as a JavaScript Date, but the driver returned a string. Calling `.toISOString()` crashed the endpoint. I normalised the runtime value before serialisation rather than relying on the TypeScript annotation.

## Retrieval and generation decisions

A plausible retrieval result concealed a real defect: the parser recognised `Outcomes:` only at the start of a line, while curriculum entries used `Week 3 · Outcomes: ...`. Semantic similarity still returned related material, masking the missing mappings. I checked the metadata, corrected the parser, and added an inline-tag regression fixture. Including the chunking version in the content hash ensures parser changes also reprocess unchanged documents.

I prioritised explicitly mapped curriculum chunks before semantic neighbours, with grade filtering in both queries. The original retrieved IDs and scores are recorded, and grounding is recomputed on every edit. Teachers can re-link retrieved material; neither the browser nor model can declare an arbitrary citation trustworthy.

The model's response must satisfy the shared schema and the requested lesson duration. Invalid output receives one repair attempt with specific validation feedback. Repeated failure is recorded without creating a lesson. The deterministic mock exercises this same pipeline, making failures reproducible during development and demonstration.

## Product and interface decisions

I used the teacher's laptop workflow to guide the interface: persistent left navigation, a compact header, clear status labels, and one workspace search. I removed repeated table searches and replaced decorative radial charts with straightforward statistics derived from actual plan records.

The lesson editor needed to support focused work and evidence inspection. Expandable stages reduce the initial visual load; timing feedback exposes invalid totals; preview preserves unsaved input; citation links open the corresponding excerpt. Local draft recovery supports interruptions without treating an unsaved edit as a committed version.

For leads, team summaries provide planning oversight while private drafts remain protected. Review decisions and teacher comments are explicit, and publication is a separate action. Source references support the reviewer’s judgment; approval remains a human responsibility.

## Verification

I used automated checks for role isolation, workflow transitions, version conflicts, invalid model output, and citation handling. A clean-copy check passed 94 tests, lint, formatting, and workspace type checks. Browser verification exercised drafting, editing, return, revision, approval, and publication against an isolated database. Retrieval checks covered all 21 outcomes.

These checks supplied the evidence for accepting changes. The AI log records the decisions and corrections; the README explains setup and the application workflow.
