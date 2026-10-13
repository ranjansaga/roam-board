import { describe, it, expect } from "vitest";
import { exportTripToJson, importTripFromJson } from "@/lib/export/trip-file";
import { emptyTrip } from "@/lib/domain/trip";

describe("import validation (FR-021)", () => {
  it("rejects malformed JSON", () => {
    const r = importTripFromJson("not json {");
    expect(r.ok).toBe(false);
  });

  it("rejects a newer schema version with a clear message", () => {
    const env = JSON.parse(exportTripToJson(emptyTrip("X", 1)));
    env.schemaVersion = 999;
    const r = importTripFromJson(JSON.stringify(env));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/newer version/i);
  });

  it("rejects structurally invalid trip data", () => {
    const r = importTripFromJson(
      JSON.stringify({ schemaVersion: 1, exportedAt: "now", trip: { nope: true } }),
    );
    expect(r.ok).toBe(false);
  });

  it("accepts a valid backup", () => {
    const r = importTripFromJson(exportTripToJson(emptyTrip("Porto", 2)));
    expect(r.ok).toBe(true);
  });
});
