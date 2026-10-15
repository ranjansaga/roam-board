import { describe, it, expect } from "vitest";
import { addPlace, setCoordinates } from "@/lib/domain/board-ops";
import { emptyTrip } from "@/lib/domain/trip";
import type { Trip } from "@/lib/domain/schema";

function seedWithPlace(): { trip: Trip; placeId: string } {
  const base = emptyTrip("T", 1);
  const t = addPlace(base, base.days[0].id, {
    name: "P",
    description: "",
    category: "other",
    dayPart: "morning",
  });
  return { trip: t, placeId: t.days[0].places[0].id };
}

describe("setCoordinates", () => {
  it("stores valid coordinates", () => {
    const { trip, placeId } = seedWithPlace();
    const next = setCoordinates(trip, placeId, { lat: -8.5, lng: 115.2 });
    expect(next.days[0].places[0].coordinates).toEqual({ lat: -8.5, lng: 115.2 });
  });

  it("clears coordinates when passed null", () => {
    const { trip, placeId } = seedWithPlace();
    const withCoords = setCoordinates(trip, placeId, { lat: 1, lng: 2 });
    const cleared = setCoordinates(withCoords, placeId, null);
    expect(cleared.days[0].places[0].coordinates).toBeNull();
  });

  it("rejects out-of-range latitude", () => {
    const { trip, placeId } = seedWithPlace();
    const next = setCoordinates(trip, placeId, { lat: 91, lng: 0 });
    expect(next).toBe(trip);
  });

  it("rejects out-of-range longitude", () => {
    const { trip, placeId } = seedWithPlace();
    const next = setCoordinates(trip, placeId, { lat: 0, lng: -181 });
    expect(next).toBe(trip);
  });

  it("returns the trip unchanged for an unknown placeId", () => {
    const { trip } = seedWithPlace();
    const next = setCoordinates(trip, "does-not-exist", { lat: 0, lng: 0 });
    expect(next).toBe(trip);
  });

  it("does not mutate the input trip", () => {
    const { trip, placeId } = seedWithPlace();
    const before = JSON.parse(JSON.stringify(trip));
    setCoordinates(trip, placeId, { lat: 10, lng: 20 });
    expect(trip).toEqual(before);
  });

  it("bumps updatedAt on a successful set", async () => {
    const { trip, placeId } = seedWithPlace();
    await new Promise((r) => setTimeout(r, 2));
    const next = setCoordinates(trip, placeId, { lat: 10, lng: 20 });
    expect(new Date(next.updatedAt).getTime()).toBeGreaterThan(
      new Date(trip.updatedAt).getTime(),
    );
  });
});
