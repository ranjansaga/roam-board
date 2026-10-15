import { describe, it, expect } from "vitest";
import { mergePreserveManualCoords } from "@/lib/domain/coord-merge";
import { emptyTrip } from "@/lib/domain/trip";
import { addPlace, setCoordinates } from "@/lib/domain/board-ops";
import type { Trip } from "@/lib/domain/schema";

function tripWithPlaces(places: { name: string; day: number; coords?: { lat: number; lng: number } }[]): Trip {
  const dayCount = Math.max(1, ...places.map((p) => p.day + 1));
  let t = emptyTrip("Fixture", dayCount);
  for (const p of places) {
    const dayId = t.days[p.day].id;
    t = addPlace(t, dayId, { name: p.name, description: "", category: "other", dayPart: "morning" });
    if (p.coords) {
      const placeId = t.days[p.day].places.find((pl) => pl.name === p.name)!.id;
      t = setCoordinates(t, placeId, p.coords);
    }
  }
  return t;
}

describe("mergePreserveManualCoords", () => {
  it("preserves a manually-set coordinate when the place name survives", () => {
    const prev = tripWithPlaces([{ name: "Monkey Forest", day: 0, coords: { lat: -8.5188, lng: 115.2606 } }]);
    const next = tripWithPlaces([{ name: "Monkey Forest", day: 0 }]);
    const merged = mergePreserveManualCoords(prev, next);
    expect(merged.days[0].places[0].coordinates).toEqual({ lat: -8.5188, lng: 115.2606 });
  });

  it("matches names case-insensitively and tolerates whitespace", () => {
    const prev = tripWithPlaces([{ name: "Ubud Monkey Forest", day: 0, coords: { lat: 1, lng: 2 } }]);
    const next = tripWithPlaces([{ name: "  ubud   monkey   forest ", day: 0 }]);
    const merged = mergePreserveManualCoords(prev, next);
    expect(merged.days[0].places[0].coordinates).toEqual({ lat: 1, lng: 2 });
  });

  it("preserves coord across a place being moved to a different day", () => {
    const prev = tripWithPlaces([{ name: "Beach", day: 0, coords: { lat: 10, lng: 20 } }]);
    const next = tripWithPlaces([{ name: "Beach", day: 1 }]);
    const merged = mergePreserveManualCoords(prev, next);
    expect(merged.days[1].places[0].coordinates).toEqual({ lat: 10, lng: 20 });
  });

  it("places newly added in next with no name match keep next's coord (incl. null)", () => {
    const prev = tripWithPlaces([{ name: "Old", day: 0, coords: { lat: 1, lng: 2 } }]);
    const next = tripWithPlaces([{ name: "New", day: 0 }]);
    const merged = mergePreserveManualCoords(prev, next);
    expect(merged.days[0].places[0].coordinates).toBeNull();
  });

  it("prev with null coord does not override next's coord", () => {
    const prev = tripWithPlaces([{ name: "A", day: 0 }]);
    const next = tripWithPlaces([{ name: "A", day: 0, coords: { lat: 5, lng: 6 } }]);
    const merged = mergePreserveManualCoords(prev, next);
    expect(merged.days[0].places[0].coordinates).toEqual({ lat: 5, lng: 6 });
  });

  it("returns a new trip reference when any override is applied", () => {
    const prev = tripWithPlaces([{ name: "A", day: 0, coords: { lat: 1, lng: 2 } }]);
    const next = tripWithPlaces([{ name: "A", day: 0 }]);
    const merged = mergePreserveManualCoords(prev, next);
    expect(merged).not.toBe(next);
  });

  it("returns the exact next reference when no overrides apply", () => {
    const prev = tripWithPlaces([{ name: "A", day: 0 }]); // no manual coords in prev
    const next = tripWithPlaces([{ name: "A", day: 0 }]);
    const merged = mergePreserveManualCoords(prev, next);
    expect(merged).toBe(next);
  });

  it("first occurrence wins when the same name appears twice in prev", () => {
    const prev = tripWithPlaces([
      { name: "Beach", day: 0, coords: { lat: 1, lng: 1 } },
      { name: "Beach", day: 1, coords: { lat: 9, lng: 9 } },
    ]);
    const next = tripWithPlaces([{ name: "Beach", day: 0 }]);
    const merged = mergePreserveManualCoords(prev, next);
    expect(merged.days[0].places[0].coordinates).toEqual({ lat: 1, lng: 1 });
  });
});
