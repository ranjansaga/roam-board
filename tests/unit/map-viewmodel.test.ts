import { describe, it, expect } from "vitest";
import { emptyTrip } from "@/lib/domain/trip";
import { addPlace, setCoordinates } from "@/lib/domain/board-ops";
import type { Trip } from "@/lib/domain/schema";
import {
  deriveMapViewModel,
  type DayFilter,
} from "@/app/trips/[tripId]/map/useMapViewModel";

const ALL: DayFilter = { kind: "all" };
const single = (dayId: string): DayFilter => ({ kind: "single", dayId });

function tripWith(
  days: {
    places: { name: string; coords?: { lat: number; lng: number } }[];
  }[],
): Trip {
  let t = emptyTrip("Fixture", days.length);
  for (let i = 0; i < days.length; i++) {
    const dayId = t.days[i].id;
    for (const p of days[i].places) {
      t = addPlace(t, dayId, {
        name: p.name,
        description: `${p.name} desc`,
        category: "food",
        dayPart: "morning",
      });
      if (p.coords) {
        const placeId = t.days[i].places.find((pl) => pl.name === p.name)!.id;
        t = setCoordinates(t, placeId, p.coords);
      }
    }
  }
  return t;
}

describe("deriveMapViewModel", () => {
  it("returns an empty model for a null trip", () => {
    const vm = deriveMapViewModel(null, ALL);
    expect(vm.pins).toHaveLength(0);
    expect(vm.unlocated).toHaveLength(0);
    expect(vm.bounds).toBeNull();
    expect(vm.showCapBanner).toBe(false);
  });

  it("splits located and unlocated places into pins and tray", () => {
    const trip = tripWith([
      {
        places: [
          { name: "A", coords: { lat: 1, lng: 2 } },
          { name: "B" },
          { name: "C", coords: { lat: 3, lng: 4 } },
        ],
      },
    ]);
    const vm = deriveMapViewModel(trip, ALL);
    expect(vm.pins.map((p) => p.name)).toEqual(["A", "C"]);
    expect(vm.unlocated.map((p) => p.name)).toEqual(["B"]);
    expect(vm.totalLocated).toBe(2);
    expect(vm.totalPlaces).toBe(3);
  });

  it("tags pins with day index and a color token", () => {
    const trip = tripWith([
      { places: [{ name: "A", coords: { lat: 1, lng: 2 } }] },
      { places: [{ name: "B", coords: { lat: 3, lng: 4 } }] },
    ]);
    const vm = deriveMapViewModel(trip, ALL);
    expect(vm.pins[0].dayIndex).toBe(0);
    expect(vm.pins[1].dayIndex).toBe(1);
    expect(vm.pins[0].colorToken).not.toBe(vm.pins[1].colorToken);
  });

  it("legend reports per-day located-place counts and matches pin colors", () => {
    const trip = tripWith([
      {
        places: [
          { name: "A", coords: { lat: 1, lng: 2 } },
          { name: "B", coords: { lat: 3, lng: 4 } },
        ],
      },
      { places: [{ name: "C" }] },
    ]);
    const vm = deriveMapViewModel(trip, ALL);
    expect(vm.legend.map((l) => l.count)).toEqual([2, 0]);
    expect(vm.legend[0].colorToken).toBe(vm.pins[0].colorToken);
  });

  it("single-day filter projects pins and bounds to that day only", () => {
    const trip = tripWith([
      { places: [{ name: "A", coords: { lat: 10, lng: 20 } }] },
      { places: [{ name: "B", coords: { lat: 30, lng: 40 } }] },
    ]);
    const day2Id = trip.days[1].id;
    const vm = deriveMapViewModel(trip, single(day2Id));
    expect(vm.pins.map((p) => p.name)).toEqual(["B"]);
    expect(vm.bounds).toEqual([
      [30, 40],
      [30, 40],
    ]);
  });

  it("unlocated tray is unchanged by a day filter", () => {
    const trip = tripWith([
      {
        places: [
          { name: "A", coords: { lat: 1, lng: 2 } },
          { name: "B" },
        ],
      },
      { places: [{ name: "C" }] },
    ]);
    const day1Id = trip.days[0].id;
    const vm = deriveMapViewModel(trip, single(day1Id));
    expect(vm.unlocated.map((p) => p.name)).toEqual(["B", "C"]);
  });

  it("bounds is null when no pins match the filter", () => {
    const trip = tripWith([{ places: [{ name: "A", coords: { lat: 1, lng: 2 } }] }]);
    const vm = deriveMapViewModel(trip, single("does-not-exist"));
    expect(vm.pins).toHaveLength(0);
    expect(vm.bounds).toBeNull();
  });

  it("showCapBanner flips at > 50 located places", () => {
    // Not reachable through emptyTrip + addPlace because of the 7x6=42 Feature-001 hard
    // cap; synthesize a trip that bypasses that cap, as the real caller would after
    // MAX_ITEMS_PER_DAY is raised.
    const base = emptyTrip("Big", 1);
    const dayId = base.days[0].id;
    const big: Trip = {
      ...base,
      days: [
        {
          ...base.days[0],
          places: Array.from({ length: 51 }, (_, i) => ({
            id: `p${i}`,
            name: `P${i}`,
            description: "",
            category: "other" as const,
            dayPart: "morning" as const,
            order: i,
            cost: null,
            coordinates: { lat: i / 10, lng: i / 10 },
            accessibility: null,
          })),
        },
      ],
    };
    const vm = deriveMapViewModel(big, ALL);
    expect(vm.totalLocated).toBe(51);
    expect(vm.showCapBanner).toBe(true);
    // No place is filtered or hidden.
    expect(vm.pins).toHaveLength(51);
    void dayId;
  });
});
