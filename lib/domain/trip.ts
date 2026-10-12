import type { Day, GenerationRequest, Trip } from "./schema";
import { MAX_ITEMS_PER_DAY, TRIP_MAX_DAYS } from "./schema";
import { newId } from "./id";

/** Wrap normalized days (from the AI boundary) into a complete Trip. */
export function buildTrip(request: GenerationRequest, days: Day[]): Trip {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title: request.destination,
    destination: request.destination,
    days,
    preferences: request,
    source: "ai",
    createdAt: now,
    updatedAt: now,
  };
}

/** Create an empty, manually-built trip with the given number of days. */
export function emptyTrip(destination: string, dayCount: number): Trip {
  const now = new Date().toISOString();
  const count = Math.min(Math.max(dayCount, 1), TRIP_MAX_DAYS);
  const days: Day[] = Array.from({ length: count }, (_, i) => ({
    id: newId(),
    index: i,
    label: `Day ${i + 1}`,
    date: null,
    places: [],
  }));
  return {
    id: newId(),
    title: destination || "Untitled trip",
    destination: destination || "Untitled trip",
    days,
    preferences: null,
    source: "manual",
    createdAt: now,
    updatedAt: now,
  };
}

export { MAX_ITEMS_PER_DAY };
