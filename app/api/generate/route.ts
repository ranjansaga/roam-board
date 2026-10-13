import { NextResponse } from "next/server";
import { z } from "zod";
import { GenerationRequestSchema } from "@/lib/domain/schema";
import { generateItinerary } from "@/lib/ai";
import { mapGenerationError } from "@/lib/ai/http-errors";

export const runtime = "nodejs";
// Allow a slow generation to finish in production too (Vercel caps function duration; default 10s).
export const maxDuration = 60;

const BodySchema = z.object({
  request: GenerationRequestSchema,
  apiKey: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
});

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("invalid_request", "Malformed request body.", 400);
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return fail("invalid_request", "Please check your trip details and try again.", 400);
  }

  const { request, apiKey, model } = parsed.data;
  if (!apiKey) {
    return fail("missing_key", "Add your Gemini API key in Settings to generate a plan.", 401);
  }

  const modelId = model ?? process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const timeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 60000);

  // NOTE (Principle V): request size is already bounded (days 1-7, capped field lengths) and each
  // request makes at most one provider call. Collapsing duplicate *in-flight* requests is a
  // documented seam to add alongside the server-held-key + rate-limit + cache work (see ADR-0002).
  try {
    const result = await generateItinerary(request, apiKey, modelId, timeoutMs);
    return NextResponse.json({ itinerary: { days: result.days }, usage: result.usage });
  } catch (e) {
    const mapped = mapGenerationError(e);
    return fail(mapped.code, mapped.message, mapped.status);
  }
}
