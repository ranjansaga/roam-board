import { describe, it, expect } from "vitest";
import { mapGenerationError } from "@/lib/ai/http-errors";

function named(name: string): Error {
  const e = new Error(name);
  e.name = name;
  return e;
}

describe("mapGenerationError", () => {
  it("maps a timeout/abort to 408", () => {
    expect(mapGenerationError(named("TimeoutError")).status).toBe(408);
    expect(mapGenerationError(named("AbortError")).status).toBe(408);
  });

  it("maps unusable model output to 422", () => {
    const mapped = mapGenerationError(named("AI_NoObjectGeneratedError"));
    expect(mapped.status).toBe(422);
    expect(mapped.code).toBe("unusable_output");
  });

  it("maps a rejected provider key to 401", () => {
    expect(mapGenerationError(Object.assign(new Error("x"), { statusCode: 403 })).status).toBe(401);
  });

  it("maps provider rate limiting to 429", () => {
    expect(mapGenerationError(Object.assign(new Error("x"), { statusCode: 429 })).status).toBe(429);
  });

  it("falls back to 502 for unknown failures", () => {
    const mapped = mapGenerationError(new Error("boom"));
    expect(mapped.status).toBe(502);
    expect(mapped.code).toBe("provider_error");
  });
});
