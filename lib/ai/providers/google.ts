import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Build a Gemini model bound to the traveler's BYOK key for a single request.
 * The provider is instantiated per-request; the key is never stored or logged.
 * This is the only place a concrete provider is named — swapping providers means
 * adding a sibling module, not touching callers (ADR-0002).
 */
export function getGoogleModel(apiKey: string, modelId: string) {
  const google = createGoogleGenerativeAI({ apiKey });
  return google(modelId);
}
