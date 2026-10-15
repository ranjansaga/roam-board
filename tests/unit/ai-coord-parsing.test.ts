import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { foldCoords, normalizeItinerary } from "@/lib/ai/normalize";
import { logCoordEnrichment } from "@/lib/ai/usage-log";
import type { GenerationRequest } from "@/lib/domain/schema";

const req = (destination = "Bali"): GenerationRequest => ({
  destination,
  days: 1,
  interests: [],
  pace: "balanced",
  party: "",
  accessibilityNeeds: "",
});

const place = (
  name: string,
  extra: { lat?: number; lng?: number } = {},
) => ({ name, description: "", category: "food", dayPart: "morning", ...extra });

describe("foldCoords", () => {
  it("accepts a valid pair", () => {
    const r = foldCoords(-8.5188, 115.2606);
    expect(r.coords).toEqual({ lat: -8.5188, lng: 115.2606 });
    expect(r.invalid).toBe(false);
  });

  it("treats missing both as absent (not invalid)", () => {
    const r = foldCoords(undefined, undefined);
    expect(r.coords).toBeNull();
    expect(r.invalid).toBe(false);
  });

  it("treats exactly one missing as invalid", () => {
    expect(foldCoords(10, undefined).invalid).toBe(true);
    expect(foldCoords(undefined, 10).invalid).toBe(true);
  });

  it("rejects out-of-range lat", () => {
    const r = foldCoords(95, 0);
    expect(r.coords).toBeNull();
    expect(r.invalid).toBe(true);
  });

  it("rejects out-of-range lng", () => {
    const r = foldCoords(0, -181);
    expect(r.coords).toBeNull();
    expect(r.invalid).toBe(true);
  });

  it("rejects non-finite values", () => {
    expect(foldCoords(Number.NaN, 0).invalid).toBe(true);
    expect(foldCoords(0, Number.POSITIVE_INFINITY).invalid).toBe(true);
  });
});

describe("normalizeItinerary — coordinate enrichment", () => {
  it("populates valid coord pairs on the place", () => {
    const out = normalizeItinerary(
      { days: [{ places: [place("A", { lat: 1, lng: 2 }), place("B")] }] },
      req(),
    );
    expect(out.days[0].places[0].coordinates).toEqual({ lat: 1, lng: 2 });
    expect(out.days[0].places[1].coordinates).toBeNull();
  });

  it("counts totals, with-coords and invalid-coords across the whole trip", () => {
    const out = normalizeItinerary(
      {
        days: [
          { places: [place("A", { lat: 1, lng: 2 }), place("B")] },
          { places: [place("C", { lat: 95, lng: 0 }), place("D", { lat: 10 })] },
        ],
      },
      { ...req(), days: 2 },
    );
    expect(out.placesTotal).toBe(4);
    expect(out.placesWithCoords).toBe(1);
    expect(out.placesInvalidCoords).toBe(2);
  });

  it("never throws when the model returns bad coords for one place", () => {
    expect(() =>
      normalizeItinerary(
        { days: [{ places: [place("A", { lat: 999, lng: 999 }), place("B")] }] },
        req(),
      ),
    ).not.toThrow();
  });
});

describe("logCoordEnrichment", () => {
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  beforeEach(() => infoSpy.mockClear());
  afterEach(() => infoSpy.mockClear());

  it("emits two labeled lines with counts and the destination only", () => {
    logCoordEnrichment({
      destination: "Bali",
      placesTotal: 10,
      placesWithCoords: 9,
      placesInvalidCoords: 0,
    });
    const calls = infoSpy.mock.calls.map((c) => c.join(" "));
    expect(calls.some((c) => c.startsWith("[ai.coord_enrichment] "))).toBe(true);
    expect(calls.some((c) => c.startsWith("[ai.coord_enrichment.sample] "))).toBe(true);
    const sample = calls.find((c) => c.includes("[ai.coord_enrichment.sample]"))!;
    expect(sample).toContain("Bali");
    expect(sample).toContain("0.9");
    // Must not leak coordinate values or place names.
    expect(sample).not.toContain("lat");
    expect(sample).not.toContain("lng");
  });

  it("reports successRate 0 when placesTotal is 0", () => {
    logCoordEnrichment({
      destination: "Nowhere",
      placesTotal: 0,
      placesWithCoords: 0,
      placesInvalidCoords: 0,
    });
    const calls = infoSpy.mock.calls.map((c) => c.join(" "));
    const sample = calls.find((c) => c.includes("[ai.coord_enrichment.sample]"))!;
    expect(sample).toContain('"successRate":0');
  });
});
