import type { Place, Trip } from "./schema";

/**
 * Normalize a place name for identity matching across regeneration: lowercase,
 * trim, collapse internal whitespace. Documented in research.md §R4.
 */
function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Build a trip-scoped lookup of normalized name → coordinates for every place in `trip`
 * whose coordinates are set. First occurrence wins when the same name appears twice.
 */
function manualCoordsByName(trip: Trip): Map<string, Place["coordinates"]> {
  const out = new Map<string, Place["coordinates"]>();
  for (const day of trip.days) {
    for (const place of day.places) {
      if (place.coordinates == null) continue;
      const key = normalizeName(place.name);
      if (!out.has(key)) out.set(key, place.coordinates);
    }
  }
  return out;
}

/**
 * Return a new Trip identical to `next`, except any place whose normalized name also
 * exists in `prev` with non-null coordinates has those coordinates re-applied. New
 * places (no match in `prev`) keep whatever `next` provides, including `null`.
 *
 * Pure. Does not mutate either input. See FR-006a and research.md §R4.
 */
export function mergePreserveManualCoords(prev: Trip, next: Trip): Trip {
  const manual = manualCoordsByName(prev);
  if (manual.size === 0) return next;
  let changed = false;
  const days = next.days.map((day) => ({
    ...day,
    places: day.places.map((place) => {
      const override = manual.get(normalizeName(place.name));
      if (!override) return place;
      if (
        place.coordinates &&
        place.coordinates.lat === override.lat &&
        place.coordinates.lng === override.lng
      ) {
        return place;
      }
      changed = true;
      return { ...place, coordinates: override };
    }),
  }));
  return changed ? { ...next, days } : next;
}
