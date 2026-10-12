import { describe, it, expect } from "vitest";
import { normalizeItinerary } from "@/lib/ai/normalize";
import type { GenerationRequest } from "@/lib/domain/schema";

function req(days: number): GenerationRequest {
  return { destination: "Lisbon", days, interests: [], pace: "balanced", party: "", accessibilityNeeds: "" };
}

function place(name: string, category = "food", dayPart = "morning") {
  return { name, description: "", category, dayPart };
}

describe("normalizeItinerary", () => {
  it("pads to the requested number of days", () => {
    const out = normalizeItinerary({ days: [{ places: [] }] }, req(4));
    expect(out).toHaveLength(4);
    expect(out.map((d) => d.index)).toEqual([0, 1, 2, 3]);
  });

  it("trims extra days", () => {
    const out = normalizeItinerary({ days: [{ places: [] }, { places: [] }, { places: [] }] }, req(2));
    expect(out).toHaveLength(2);
  });

  it("coerces an unknown category to 'other'", () => {
    const out = normalizeItinerary({ days: [{ places: [place("Beach", "beach")] }] }, req(1));
    expect(out[0].places[0].category).toBe("other");
  });

  it("coerces an unknown dayPart to 'morning'", () => {
    const out = normalizeItinerary({ days: [{ places: [place("X", "food", "midnight")] }] }, req(1));
    expect(out[0].places[0].dayPart).toBe("morning");
  });

  it("caps at 6 items per day (trims overflow)", () => {
    const places = Array.from({ length: 9 }, (_, i) => place(`p${i}`));
    const out = normalizeItinerary({ days: [{ places }] }, req(1));
    expect(out[0].places).toHaveLength(6);
  });

  it("assigns order and nulls the roadmap fields", () => {
    const out = normalizeItinerary({ days: [{ places: [place("A"), place("B")] }] }, req(1));
    expect(out[0].places.map((p) => p.order)).toEqual([0, 1]);
    const p = out[0].places[0];
    expect(p.cost).toBeNull();
    expect(p.coordinates).toBeNull();
    expect(p.accessibility).toBeNull();
    expect(p.id).toBeTruthy();
  });
});
