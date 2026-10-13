import { generateText, Output } from "ai";
import { GeneratedItinerarySchema, type Day, type GenerationRequest } from "@/lib/domain/schema";
import { getGoogleModel } from "./providers/google";
import { buildItineraryPrompt } from "./prompt";
import { normalizeItinerary } from "./normalize";
import { logError, logUsage, type UsageInfo } from "./usage-log";

export interface GenerateResult {
  days: Day[];
  usage: UsageInfo;
}

/**
 * The single AI boundary (Constitution Principle IV): enforce a timeout, call the provider for
 * structured output (AI SDK v7 `generateText` + `Output.object`), validate it against the Zod schema,
 * normalize it, and log usage. On failure it logs provider detail (no key/prompt) and rethrows so the
 * caller maps the error to a user-facing response.
 */
export async function generateItinerary(
  request: GenerationRequest,
  apiKey: string,
  modelId: string,
  timeoutMs: number,
): Promise<GenerateResult> {
  const model = getGoogleModel(apiKey, modelId);
  try {
    const { output, usage } = await generateText({
      model,
      prompt: buildItineraryPrompt(request),
      output: Output.object({ schema: GeneratedItinerarySchema }),
      abortSignal: AbortSignal.timeout(timeoutMs),
    });

    if (!output) {
      const e = new Error("Model returned no structured output");
      e.name = "AI_NoObjectGeneratedError";
      throw e;
    }

    const days = normalizeItinerary(output, request);
    const tokens = usage as { inputTokens?: number; outputTokens?: number } | undefined;
    const info: UsageInfo = {
      inputTokens: tokens?.inputTokens,
      outputTokens: tokens?.outputTokens,
      model: modelId,
    };
    logUsage(info);
    return { days, usage: info };
  } catch (e) {
    logError(e, modelId);
    throw e;
  }
}
