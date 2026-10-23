import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import { z } from 'zod';
import { DOCUMENT_TYPES } from '@hub/shared';

export const CHUNKING_VERSION = 2;

const FrontmatterSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  type: z.enum(DOCUMENT_TYPES),
  title: z.string().min(3),
  subject: z.string().min(3),
  grade: z.number().int(),
  strand: z.string().min(3),
});

export type DocumentMeta = z.infer<typeof FrontmatterSchema>;

export interface CorpusSection {
  id: string;
  position: number;
  heading: string;
  text: string;
  outcomeCodes: string[];
}

export interface ParsedDocument {
  meta: DocumentMeta;
  contentHash: string;
  sections: CorpusSection[];
}

export interface ParsedOutcome {
  code: string;
  description: string;
  grade: number;
  strand: string;
  subStrand: string;
  chunkId: string;
}

const OUTCOME_HEADING = /^\[([A-Z0-9.]+[a-z]?)\]\s+(.+)$/;
const OUTCOMES_LINE = /\bOutcomes:\s*(.+)$/m;
const SUB_STRAND_LINE = /^Sub-strand:\s*(.+)$/m;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function sectionKey(heading: string): string {
  const outcome = OUTCOME_HEADING.exec(heading);
  if (outcome?.[1]) return slugify(outcome[1]);
  const [label = heading] = heading.split(':');
  return slugify(label);
}

function outcomeCodesOf(heading: string, body: string): string[] {
  const outcome = OUTCOME_HEADING.exec(heading);
  if (outcome?.[1]) return [outcome[1]];
  const listed = OUTCOMES_LINE.exec(body)?.[1];
  if (!listed) return [];
  return listed
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean);
}

export function parseCorpusDocument(source: string, fileName: string): ParsedDocument {
  const { data, content } = matter(source);
  const frontmatter = FrontmatterSchema.safeParse(data);
  if (!frontmatter.success) {
    throw new Error(`${fileName}: invalid frontmatter: ${frontmatter.error.message}`);
  }
  const meta = frontmatter.data;

  const rawSections = content.split(/^## /m).slice(1);
  if (rawSections.length === 0) throw new Error(`${fileName}: no "## " sections found`);

  const seenIds = new Set<string>();
  const sections = rawSections.map((raw, position) => {
    const [headingLine = '', ...bodyLines] = raw.split('\n');
    const heading = headingLine.trim();
    const body = bodyLines.join('\n').trim();
    const id = `${meta.id}#${sectionKey(heading)}`;
    if (seenIds.has(id)) throw new Error(`${fileName}: duplicate section id ${id}`);
    seenIds.add(id);
    return {
      id,
      position,
      heading,
      text: `${heading}\n${body}`,
      outcomeCodes: outcomeCodesOf(heading, body),
    };
  });

  return {
    meta,
    contentHash: createHash('sha256')
      .update(`chunking-v${CHUNKING_VERSION}:${source}`)
      .digest('hex'),
    sections,
  };
}

export function extractOutcomes(document: ParsedDocument): ParsedOutcome[] {
  if (document.meta.type !== 'learning_outcomes') return [];
  return document.sections.map((section) => {
    const heading = OUTCOME_HEADING.exec(section.heading);
    const subStrand = SUB_STRAND_LINE.exec(section.text)?.[1]?.trim();
    if (!heading?.[1] || !heading[2] || !subStrand) {
      throw new Error(
        `${section.id}: outcome sections need "[CODE] description" and a Sub-strand line`,
      );
    }
    return {
      code: heading[1],
      description: heading[2].trim(),
      grade: document.meta.grade,
      strand: document.meta.strand,
      subStrand,
      chunkId: section.id,
    };
  });
}
