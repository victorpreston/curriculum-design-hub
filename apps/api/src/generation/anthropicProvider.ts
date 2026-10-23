import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { LessonPlanContentSchema } from '@hub/shared';
import { LlmCallError, type LlmProvider, type LlmRequest } from './llmProvider';

const MAX_OUTPUT_TOKENS = 16_000;
const SDK_RETRIES = 1;
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

const UNSUPPORTED_SCHEMA_KEYWORDS = new Set([
  '$schema',
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'maxItems',
  'pattern',
]);

type JsonSchemaNode = { [key: string]: unknown };

function toStructuredOutputSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toStructuredOutputSchema);
  if (node === null || typeof node !== 'object') return node;

  const result: JsonSchemaNode = {};
  for (const [key, value] of Object.entries(node)) {
    if (UNSUPPORTED_SCHEMA_KEYWORDS.has(key)) continue;
    if (key === 'minItems' && typeof value === 'number' && value > 1) continue;
    result[key] = toStructuredOutputSchema(value);
  }
  if (result.type === 'object') result.additionalProperties = false;
  return result;
}

export const LESSON_PLAN_OUTPUT_SCHEMA = toStructuredOutputSchema(
  z.toJSONSchema(LessonPlanContentSchema),
) as JsonSchemaNode;

const MODELS_WITH_SERVER_SIDE_FALLBACK = new Set([
  'claude-fable-5-1',
  'claude-opus-5-5',
  'claude-opus-5',
  'claude-sonnet-5-5',
]);

export function supportsServerSideFallback(model: string): boolean {
  return MODELS_WITH_SERVER_SIDE_FALLBACK.has(model);
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function classifyError(error: unknown, signal: AbortSignal): LlmCallError {
  if (error instanceof LlmCallError) return error;
  const detail = errorDetail(error);
  if (signal.aborted || error instanceof Anthropic.APIConnectionTimeoutError) {
    return new LlmCallError('timeout', 'no response before the deadline', detail);
  }
  if (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError
  ) {
    return new LlmCallError('unavailable', 'the AI provider rejected our credentials', detail);
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new LlmCallError('unavailable', 'the AI provider is rate limiting requests', detail);
  }
  if (error instanceof Anthropic.BadRequestError) {
    return new LlmCallError('unavailable', 'the AI provider rejected the request', detail);
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new LlmCallError('unavailable', 'the AI provider could not be reached', detail);
  }
  if (error instanceof Anthropic.APIError) {
    return new LlmCallError('unavailable', 'the AI provider returned an error', detail);
  }
  return new LlmCallError('unavailable', 'an unexpected error occurred', detail);
}

export interface AnthropicProviderOptions {
  apiKey: string;
  model: string;
  effort: 'low' | 'medium' | 'high';
}

export function createAnthropicProvider({
  apiKey,
  model,
  effort,
}: AnthropicProviderOptions): LlmProvider {
  const client = new Anthropic({ apiKey, maxRetries: SDK_RETRIES });
  const fallbackOptions = supportsServerSideFallback(model)
    ? { betas: [FALLBACK_BETA], fallbacks: 'default' as const }
    : {};

  return {
    name: 'anthropic',
    model,
    async complete(request: LlmRequest) {
      try {
        const response = await client.beta.messages.create(
          {
            model,
            max_tokens: MAX_OUTPUT_TOKENS,
            system: request.system,
            messages: request.messages,
            output_config: {
              effort,
              format: { type: 'json_schema', schema: LESSON_PLAN_OUTPUT_SCHEMA },
            },
            ...fallbackOptions,
          },
          { signal: request.signal },
        );

        if (response.stop_reason === 'refusal') {
          throw new LlmCallError(
            'refused',
            'declined by the provider safety policy',
            response.stop_details?.category ?? 'refusal',
          );
        }

        return {
          text: response.content
            .flatMap((block) => (block.type === 'text' ? [block.text] : []))
            .join(''),
          model: response.model,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        };
      } catch (error) {
        throw classifyError(error, request.signal);
      }
    },
  };
}
