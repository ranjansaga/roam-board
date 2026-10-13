import { describe, it, expect } from "vitest";
import { exportTripToJson, importTripFromJson } from "@/lib/export/trip-file";
import { emptyTrip } from "@/lib/domain/trip";
import { addPlace } from "@/lib/domain/board-ops";

describe("export → import round-trip", () => {
  it("reproduces days, cards, order, and fields faithfully", () => {
    let trip = emptyTrip("Lisbon", 2);
    trip = addPlace(trip, trip.days[0].id, {
      name: "Time Out Market",
      description: "Food hall",
      category: "food",
      dayPart: "afternoon",
    });

    const result = importTripFromJson(exportTripToJson(trip));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const back = result.trip;
    expect(back.title).toBe("Lisbon");
    expect(back.days).toHaveLength(2);
    expect(back.days[0].places[0].name).toBe("Time Out Market");
    expect(back.days[0].places[0].category).toBe("food");
    expect(back.days[0].places[0].dayPart).toBe("afternoon");
    expect(back.days[0].places[0].order).toBe(0);
    // The imported trip is the importer's own copy → fresh ids.
    expect(back.id).not.toBe(trip.id);
    expect(back.days[0].places[0].id).not.toBe(trip.days[0].places[0].id);
  });
});
