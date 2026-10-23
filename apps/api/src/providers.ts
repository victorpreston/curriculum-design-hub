import type { Config } from './config';
import { createEmbeddingProvider } from './corpus/embeddings';
import { createAnthropicProvider } from './generation/anthropicProvider';
import type { LlmProvider } from './generation/llmProvider';
import { createMockProvider } from './generation/mockProvider';

export function createLlmProvider(config: Config): LlmProvider {
  if (config.LLM_PROVIDER === 'anthropic' && config.ANTHROPIC_API_KEY) {
    return createAnthropicProvider({
      apiKey: config.ANTHROPIC_API_KEY,
      model: config.ANTHROPIC_MODEL,
      effort: config.ANTHROPIC_EFFORT,
    });
  }
  return createMockProvider(config.MOCK_LLM_SCENARIO);
}

export function createProviders(config: Config) {
  return {
    llm: createLlmProvider(config),
    embedder: createEmbeddingProvider(config.EMBEDDING_PROVIDER),
  };
}
