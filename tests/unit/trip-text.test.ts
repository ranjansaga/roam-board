import { describe, it, expect } from "vitest";
import { tripToText } from "@/lib/export/trip-text";
import { emptyTrip } from "@/lib/domain/trip";
import { addPlace } from "@/lib/domain/board-ops";

describe("tripToText (FR-030)", () => {
  it("renders a human-readable itinerary, not JSON", () => {
    let trip = emptyTrip("Bali", 2);
    trip = addPlace(trip, trip.days[0].id, {
      name: "Time Out Market",
      description: "Food hall",
      category: "food",
      dayPart: "afternoon",
    });

    const text = tripToText(trip);
    expect(text).toContain("Bali");
    expect(text).toContain("Day 1");
    expect(text).toContain("Time Out Market");
    expect(text).toContain("food");
    expect(text).not.toContain("{");
  });
});
