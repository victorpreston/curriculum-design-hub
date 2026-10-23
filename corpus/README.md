# Curriculum corpus format

Synthetic Grade 5–8 Integrated Science material modelled on the Kenyan CBC structure (strand → sub-strand → specific learning outcome). It is not real KICD or Nova Pioneer content.

## Files

One Markdown file per document. Each file has YAML frontmatter and is split into chunks at every `## ` heading.

```markdown
---
id: sow-acids-bases # lowercase slug, unique across the corpus
type: scheme_of_work # learning_outcomes | scheme_of_work | assessment | teacher_guide
title: 'Scheme of Work: 1.2 Acids, Bases and Indicators'
subject: Integrated Science
grade: 8 # supported values in this demo: 5, 6, 7, 8
strand: '1.0 Mixtures, Elements and Compounds'
---

## Lesson 2: Testing household substances

Week 3 · Outcomes: IS8.1.2.b
Lesson focus: ...
Learning experiences: ...
```

## Rules the ingester enforces

| Rule                                                                                            | Why                                                                     |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Frontmatter is validated with Zod; a bad file stops ingestion with the file name                | Bad curriculum data should fail loudly, not quietly weaken retrieval    |
| Chunk id = `<document id>#<slug of the heading before ":">`, e.g. `sow-acids-bases#lesson-2`    | Stable, human-readable ids that the LLM must cite and teachers can read |
| Learning outcome sections use `## [CODE] description` plus a `Sub-strand:` line                 | These become the outcomes a teacher picks from                          |
| Any other section may list `Outcomes: CODE, CODE`                                               | Explicit curriculum mapping, used first at retrieval time               |
| Content hash (plus chunking version) per document; unchanged documents are skipped on re-ingest | Ingestion is idempotent and cheap to re-run                             |

## Contents

| Type                | Documents | Chunks |
| ------------------- | --------- | ------ |
| `learning_outcomes` | 6         | 21     |
| `scheme_of_work`    | 7         | 25     |
| `assessment`        | 3         | 11     |
| `teacher_guide`     | 1         | 4      |
| **Total**           | **17**    | **61** |
