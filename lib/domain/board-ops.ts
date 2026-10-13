import type { Day, Place, Trip } from "./schema";
import { MAX_ITEMS_PER_DAY, TRIP_MAX_DAYS } from "./schema";
import { newId } from "./id";

export type PlaceEdit = Partial<Pick<Place, "name" | "description" | "category" | "dayPart">>;
export type NewPlace = Pick<Place, "name" | "description" | "category" | "dayPart">;

/** Re-number day indexes/labels and per-day place order so they are always contiguous. */
function reindex(days: Day[]): Day[] {
  return days.map((day, i) => ({
    ...day,
    index: i,
    label: `Day ${i + 1}`,
    places: day.places.map((p, order) => ({ ...p, order })),
  }));
}

/** Return a new Trip with the given days, re-normalized and timestamp-bumped. */
function withDays(trip: Trip, days: Day[]): Trip {
  return { ...trip, days: reindex(days), updatedAt: new Date().toISOString() };
}

export function addPlace(trip: Trip, dayId: string, input?: Partial<NewPlace>): Trip {
  const days = trip.days.map((day) => {
    if (day.id !== dayId || day.places.length >= MAX_ITEMS_PER_DAY) return day;
    const place: Place = {
      id: newId(),
      name: input?.name ?? "New activity",
      description: input?.description ?? "",
      category: input?.category ?? "other",
      dayPart: input?.dayPart ?? "morning",
      order: day.places.length,
      cost: null,
      coordinates: null,
      accessibility: null,
    };
    return { ...day, places: [...day.places, place] };
  });
  return withDays(trip, days);
}

export function updatePlace(trip: Trip, placeId: string, patch: PlaceEdit): Trip {
  const days = trip.days.map((day) => ({
    ...day,
    places: day.places.map((p) => (p.id === placeId ? { ...p, ...patch } : p)),
  }));
  return withDays(trip, days);
}

export function deletePlace(trip: Trip, placeId: string): Trip {
  const days = trip.days.map((day) => ({
    ...day,
    places: day.places.filter((p) => p.id !== placeId),
  }));
  return withDays(trip, days);
}

/**
 * Move a place to `targetDayId` at `targetIndex`. Handles both reordering within a day and moving
 * across days. A cross-day move into a full day (>= MAX_ITEMS_PER_DAY) is rejected (returns trip
 * unchanged) to honor the per-day cap.
 */
export function moveCard(
  trip: Trip,
  placeId: string,
  targetDayId: string,
  targetIndex: number,
): Trip {
  const sourceDay = trip.days.find((d) => d.places.some((p) => p.id === placeId));
  const moved = sourceDay?.places.find((p) => p.id === placeId);
  if (!sourceDay || !moved) return trip;

  const targetDay = trip.days.find((d) => d.id === targetDayId);
  if (!targetDay) return trip;

  const crossDay = sourceDay.id !== targetDayId;
  if (crossDay && targetDay.places.length >= MAX_ITEMS_PER_DAY) return trip;

  const days = trip.days.map((day) => {
    if (day.id === sourceDay.id && day.id === targetDayId) {
      // Reorder within the same day.
      const remaining = day.places.filter((p) => p.id !== placeId);
      const index = Math.max(0, Math.min(targetIndex, remaining.length));
      remaining.splice(index, 0, moved);
      return { ...day, places: remaining };
    }
    if (day.id === sourceDay.id) {
      return { ...day, places: day.places.filter((p) => p.id !== placeId) };
    }
    if (day.id === targetDayId) {
      const places = [...day.places];
      const index = Math.max(0, Math.min(targetIndex, places.length));
      places.splice(index, 0, moved);
      return { ...day, places };
    }
    return day;
  });
  return withDays(trip, days);
}

export function addDay(trip: Trip): Trip {
  if (trip.days.length >= TRIP_MAX_DAYS) return trip;
  const day: Day = {
    id: newId(),
    index: trip.days.length,
    label: `Day ${trip.days.length + 1}`,
    date: null,
    places: [],
  };
  return withDays(trip, [...trip.days, day]);
}

export function removeDay(trip: Trip, dayId: string): Trip {
  if (trip.days.length <= 1) return trip;
  return withDays(
    trip,
    trip.days.filter((d) => d.id !== dayId),
  );
}
