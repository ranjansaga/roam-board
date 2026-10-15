import {
  CoordinatesSchema,
  DAY_PARTS,
  MAX_ITEMS_PER_DAY,
  PLACE_CATEGORIES,
  type DayPart,
  type Day,
  type GeneratedItinerary,
  type GenerationRequest,
  type Place,
  type PlaceCategory,
} from "@/lib/domain/schema";
import { newId } from "@/lib/domain/id";

function coerceCategory(raw: string): PlaceCategory {
  const v = raw.trim().toLowerCase();
  return (PLACE_CATEGORIES as readonly string[]).includes(v) ? (v as PlaceCategory) : "other";
}

function coerceDayPart(raw: string): DayPart {
  const v = raw.trim().toLowerCase();
  return (DAY_PARTS as readonly string[]).includes(v) ? (v as DayPart) : "morning";
}

/**
 * Fold an optional raw lat/lng pair into Place.coordinates. Both values must be
 * finite numbers and inside valid ranges; otherwise the pair is dropped silently
 * and `coordinates` stays null (Feature 002 FR-006, see research.md §R3).
 * Returns `{ coords, invalid }` so the caller can report an enrichment metric
 * for places where the model supplied a pair we had to reject.
 */
export function foldCoords(
  lat: number | undefined,
  lng: number | undefined,
): { coords: Place["coordinates"]; invalid: boolean } {
  const hasAny = lat !== undefined || lng !== undefined;
  if (!hasAny) return { coords: null, invalid: false };
  if (lat === undefined || lng === undefined) return { coords: null, invalid: true };
  const parsed = CoordinatesSchema.safeParse({ lat, lng });
  if (!parsed.success) return { coords: null, invalid: true };
  return { coords: parsed.data, invalid: false };
}

/**
 * Turn raw (schema-valid) model output into our canonical Day[]: exactly `request.days`
 * days, order/ids assigned, categories coerced to the fixed set, capped at MAX_ITEMS_PER_DAY,
 * roadmap fields nulled or populated (FR-004/005/006/025/027/028, Feature 002 FR-006).
 */
export interface NormalizeResult {
  days: Day[];
  placesTotal: number;
  placesWithCoords: number;
  placesInvalidCoords: number;
}

export function normalizeItinerary(
  raw: GeneratedItinerary,
  request: GenerationRequest,
): NormalizeResult {
  const days: Day[] = [];
  let placesTotal = 0;
  let placesWithCoords = 0;
  let placesInvalidCoords = 0;
  for (let i = 0; i < request.days; i++) {
    const source = raw.days[i];
    const places: Place[] = (source?.places ?? []).slice(0, MAX_ITEMS_PER_DAY).map((p, idx) => {
      const { coords, invalid } = foldCoords(p.lat, p.lng);
      placesTotal += 1;
      if (coords) placesWithCoords += 1;
      if (invalid) placesInvalidCoords += 1;
      return {
        id: newId(),
        name: p.name,
        description: p.description,
        category: coerceCategory(p.category),
        dayPart: coerceDayPart(p.dayPart),
        order: idx,
        cost: null,
        coordinates: coords,
        accessibility: null,
      };
    });
    days.push({ id: newId(), index: i, label: `Day ${i + 1}`, date: null, places });
  }
  return { days, placesTotal, placesWithCoords, placesInvalidCoords };
}
