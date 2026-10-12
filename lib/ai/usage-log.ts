export interface UsageInfo {
  inputTokens?: number;
  outputTokens?: number;
  model: string;
}

/**
 * Log token/cost metadata for observability (Constitution Principle IV).
 * NEVER logs the API key or prompt content.
 */
export function logUsage(usage: UsageInfo): void {
  console.info(
    "[ai.usage]",
    JSON.stringify({
      model: usage.model,
      inputTokens: usage.inputTokens ?? null,
      outputTokens: usage.outputTokens ?? null,
      at: new Date().toISOString(),
    }),
  );
}
