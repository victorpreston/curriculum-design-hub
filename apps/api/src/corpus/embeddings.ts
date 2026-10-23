import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EMBEDDING_DIMENSIONS } from '../db/schema';

export interface EmbeddingProvider {
  readonly model: string;
  readonly weakSimilarityThreshold: number;
  embed(texts: string[]): Promise<number[][]>;
}

const LOCAL_MODEL = 'Xenova/all-MiniLM-L6-v2';
const LOCAL_WEAK_SIMILARITY = 0.35;
const HASH_WEAK_SIMILARITY = 0.15;
const modelCacheDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../.cache/models',
);

type FeatureExtractor = (
  texts: string[],
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{ tolist(): number[][] }>;

export function createLocalEmbeddingProvider(): EmbeddingProvider {
  let extractor: Promise<FeatureExtractor> | null = null;

  async function loadExtractor(): Promise<FeatureExtractor> {
    const transformers = await import('@huggingface/transformers');
    transformers.env.cacheDir = modelCacheDir;
    const pipe = await transformers.pipeline('feature-extraction', LOCAL_MODEL, { dtype: 'fp32' });
    return pipe as unknown as FeatureExtractor;
  }

  return {
    model: LOCAL_MODEL,
    weakSimilarityThreshold: LOCAL_WEAK_SIMILARITY,
    async embed(texts) {
      extractor ??= loadExtractor();
      const output = await (await extractor)(texts, { pooling: 'mean', normalize: true });
      return output.tolist();
    },
  };
}

const STOP_WORDS = new Set(
  'a an and are as at be by can do does for from how in into is it its of on or that the their them they this to use using was what when which why will with'.split(
    ' ',
  ),
);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    .map((token) => token.replace(/(ies|es|s)$/, ''));
}

function bucketOf(token: string): { index: number; sign: number } {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const unsigned = hash >>> 0;
  return { index: unsigned % EMBEDDING_DIMENSIONS, sign: unsigned & 0x80000000 ? -1 : 1 };
}

export function hashEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  for (const token of tokens(text)) {
    const { index, sign } = bucketOf(token);
    vector[index] = (vector[index] ?? 0) + sign;
  }
  const norm = Math.hypot(...vector);
  return norm === 0 ? vector : vector.map((value) => value / norm);
}

export function createHashEmbeddingProvider(): EmbeddingProvider {
  return {
    model: 'hashed-bag-of-words-384',
    weakSimilarityThreshold: HASH_WEAK_SIMILARITY,
    async embed(texts) {
      return texts.map(hashEmbedding);
    },
  };
}

export function createEmbeddingProvider(kind: 'local' | 'hash'): EmbeddingProvider {
  return kind === 'local' ? createLocalEmbeddingProvider() : createHashEmbeddingProvider();
}
