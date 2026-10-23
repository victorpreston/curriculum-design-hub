import type { MockScenario, RetrievedChunk } from '@hub/shared';
import type { LearningOutcome } from '../corpus/outcomeRepository';

export interface GenerationContext {
  outcome: LearningOutcome;
  durationMinutes: number;
  sources: RetrievedChunk[];
}

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  context: GenerationContext;
  attempt: number;
  scenario?: MockScenario;
  signal: AbortSignal;
}

export interface LlmCompletion {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  complete(request: LlmRequest): Promise<LlmCompletion>;
}

export type LlmFailureKind = 'timeout' | 'unavailable' | 'refused';

export class LlmCallError extends Error {
  constructor(
    readonly kind: LlmFailureKind,
    readonly reason: string,
    readonly detail: string = reason,
  ) {
    super(`${kind}: ${detail}`);
    this.name = 'LlmCallError';
  }
}
