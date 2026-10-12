import { generateObject } from "ai";
import { GeneratedItinerarySchema, type Day, type GenerationRequest } from "@/lib/domain/schema";
import { getGoogleModel } from "./providers/google";
import { buildItineraryPrompt } from "./prompt";
import { normalizeItinerary } from "./normalize";
import { logUsage, type UsageInfo } from "./usage-log";

export interface GenerateResult {
  days: Day[];
  usage: UsageInfo;
}

/**
 * The single AI boundary (Constitution Principle IV): enforce a timeout, call the provider
 * for structured output, validate it against the Zod schema, normalize it, and log usage.
 * On any failure this throws; callers map errors to user-facing responses.
 */
export async function generateItinerary(
  request: GenerationRequest,
  apiKey: string,
  modelId: string,
  timeoutMs: number,
): Promise<GenerateResult> {
  const model = getGoogleModel(apiKey, modelId);
  const { object, usage } = await generateObject({
    model,
    schema: GeneratedItinerarySchema,
    prompt: buildItineraryPrompt(request),
    abortSignal: AbortSignal.timeout(timeoutMs),
  });

  const days = normalizeItinerary(object, request);
  const tokens = usage as { inputTokens?: number; outputTokens?: number } | undefined;
  const info: UsageInfo = {
    inputTokens: tokens?.inputTokens,
    outputTokens: tokens?.outputTokens,
    model: modelId,
  };
  logUsage(info);
  return { days, usage: info };
}
