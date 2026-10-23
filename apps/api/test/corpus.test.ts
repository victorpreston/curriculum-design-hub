import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createHashEmbeddingProvider } from '../src/corpus/embeddings';
import { evaluateRetrieval } from '../src/corpus/evaluateRetrieval';
import { extractOutcomes, parseCorpusDocument } from '../src/corpus/parseCorpus';
import { corpusDir, ingestCorpus } from '../src/corpus/ingestCorpus';
import { createTestContext } from './helpers';

const context = createTestContext();

const SAMPLE = `---
id: sow-sample
type: scheme_of_work
title: Sample scheme
subject: Integrated Science
grade: 8
strand: "1.0 Sample"
---

## Lesson 1: First lesson

Week 1 · Outcomes: IS8.1.1.a, IS8.1.1.b
Body text.

## Lesson 2: Second lesson

No outcomes listed.
`;

async function outcomeCodesInCorpus(): Promise<string[]> {
  const files = (await readdir(corpusDir)).filter((name) => name.startsWith('lo-'));
  const documents = await Promise.all(
    files.map(async (name) =>
      parseCorpusDocument(await readFile(path.join(corpusDir, name), 'utf8'), name),
    ),
  );
  return documents
    .flatMap(extractOutcomes)
    .map((outcome) => outcome.code)
    .sort();
}

describe('corpus parsing', () => {
  it('splits a document into one chunk per section with stable ids and outcome tags', () => {
    const document = parseCorpusDocument(SAMPLE, 'sample.md');
    expect(document.sections.map((section) => section.id)).toEqual([
      'sow-sample#lesson-1',
      'sow-sample#lesson-2',
    ]);
    expect(document.sections[0]?.outcomeCodes).toEqual(['IS8.1.1.a', 'IS8.1.1.b']);
    expect(document.sections[1]?.outcomeCodes).toEqual([]);
  });

  it('rejects documents with invalid frontmatter', () => {
    expect(() =>
      parseCorpusDocument(SAMPLE.replace('type: scheme_of_work', 'type: poem'), 'bad.md'),
    ).toThrow(/invalid frontmatter/);
  });

  it('extracts learning outcomes from outcome documents', () => {
    const source = SAMPLE.replace('type: scheme_of_work', 'type: learning_outcomes')
      .replace(
        '## Lesson 1: First lesson',
        '## [IS8.1.1.a] Classify substances\n\nSub-strand: 1.1 Elements and Compounds',
      )
      .replace('## Lesson 2: Second lesson\n\nNo outcomes listed.\n', '');
    const outcomes = extractOutcomes(parseCorpusDocument(source, 'lo.md'));
    expect(outcomes).toEqual([
      {
        code: 'IS8.1.1.a',
        description: 'Classify substances',
        grade: 8,
        strand: '1.0 Sample',
        subStrand: '1.1 Elements and Compounds',
        chunkId: 'sow-sample#is8-1-1-a',
      },
    ]);
  });
});

describe('corpus ingestion and retrieval', () => {
  it('skips unchanged documents when ingested again', async () => {
    const summary = await ingestCorpus(context.db, createHashEmbeddingProvider(), corpusDir);
    expect(summary.documents).toBeGreaterThanOrEqual(8);
    expect(summary.documents).toBeLessThanOrEqual(20);
    expect(summary.reembedded).toBe(0);
  });

  it('retrieves each outcome together with a lesson that teaches it', async () => {
    const checks = await evaluateRetrieval(context.db, createHashEmbeddingProvider());
    expect(checks.map((check) => check.code).sort()).toEqual(await outcomeCodesInCorpus());
    for (const check of checks) {
      expect(check, check.code).toMatchObject({ foundOutcomeChunk: true, foundTaggedLesson: true });
    }
  });
});
