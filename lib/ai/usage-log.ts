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

/**
 * Log a generation failure with enough provider detail to diagnose it (status, URL, response body)
 * — WITHOUT the API key or prompt content (Constitution Principle IV observability).
 */
export function logError(e: unknown, model: string): void {
  const err = e as {
    name?: string;
    message?: string;
    statusCode?: number;
    url?: string;
    responseBody?: string;
  };
  console.error(
    "[ai.error]",
    JSON.stringify({
      model,
      name: err?.name ?? null,
      message: err?.message ?? String(e),
      statusCode: err?.statusCode ?? null,
      url: err?.url ?? null,
      responseBody: typeof err?.responseBody === "string" ? err.responseBody.slice(0, 800) : null,
      at: new Date().toISOString(),
    }),
  );
}
