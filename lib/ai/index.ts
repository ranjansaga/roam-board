import { generateText, Output } from "ai";
import {
  GeneratedItinerarySchema,
  type Day,
  type GenerationRequest,
  type Trip,
} from "@/lib/domain/schema";
import { mergePreserveManualCoords } from "@/lib/domain/coord-merge";
import { getGoogleModel } from "./providers/google";
import { buildItineraryPrompt } from "./prompt";
import { normalizeItinerary } from "./normalize";
import { logCoordEnrichment, logError, logUsage, type UsageInfo } from "./usage-log";

export interface GenerateResult {
  days: Day[];
  usage: UsageInfo;
}

export interface GenerateOptions {
  /**
   * When present, the fresh trip is passed through
   * {@link mergePreserveManualCoords} so any place whose name survives
   * regeneration keeps its manually-set coordinates (Feature 002 FR-006a).
   * No in-app regenerate flow calls this yet; the hook is here for the
   * future regenerate feature.
   */
  prevTrip?: Trip;
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
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const model = getGoogleModel(apiKey, modelId);
  try {
    const { output, usage } = await generateText({
      model,
      prompt: buildItineraryPrompt(request),
      output: Output.object({ schema: GeneratedItinerarySchema }),
      // Keep Gemini's "thinking" to the minimum valid level: an itinerary needs little reasoning,
      // and the default level adds latency. "low" is accepted by 3.x Flash ("minimal" is rejected;
      // "thinkingBudget: 0" is rejected too).
      providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } },
      abortSignal: AbortSignal.timeout(timeoutMs),
    });

    if (!output) {
      const e = new Error("Model returned no structured output");
      e.name = "AI_NoObjectGeneratedError";
      throw e;
    }

    const normalized = normalizeItinerary(output, request);
    let days = normalized.days;
    if (options.prevTrip) {
      // Build an ephemeral Trip-shaped snapshot of `days` so we can reuse the
      // name-based merge helper. Only the days list matters to the merge.
      const merged = mergePreserveManualCoords(options.prevTrip, {
        ...options.prevTrip,
        days,
      });
      days = merged.days;
    }
    logCoordEnrichment({
      destination: request.destination,
      placesTotal: normalized.placesTotal,
      placesWithCoords: normalized.placesWithCoords,
      placesInvalidCoords: normalized.placesInvalidCoords,
    });
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
