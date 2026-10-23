interface ModelPrice {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
}

const PRICES_USD: Record<string, ModelPrice> = {
  'claude-opus-5-5': { inputPerMillionTokens: 4, outputPerMillionTokens: 20 },
  'claude-sonnet-5-5': { inputPerMillionTokens: 2, outputPerMillionTokens: 10 },
  'claude-haiku-5-5': { inputPerMillionTokens: 0.1, outputPerMillionTokens: 0.5 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICES_USD[model];
  if (!price) return 0;
  const cost =
    (inputTokens * price.inputPerMillionTokens + outputTokens * price.outputPerMillionTokens) /
    1_000_000;
  return Number(cost.toFixed(6));
}
