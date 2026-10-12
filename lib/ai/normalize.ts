import {
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
 * Turn raw (schema-valid) model output into our canonical Day[]: exactly `request.days`
 * days, order/ids assigned, categories coerced to the fixed set, capped at MAX_ITEMS_PER_DAY,
 * and roadmap fields nulled (FR-004/005/006/025/027/028).
 */
export function normalizeItinerary(raw: GeneratedItinerary, request: GenerationRequest): Day[] {
  const days: Day[] = [];
  for (let i = 0; i < request.days; i++) {
    const source = raw.days[i];
    const places: Place[] = (source?.places ?? []).slice(0, MAX_ITEMS_PER_DAY).map((p, idx) => ({
      id: newId(),
      name: p.name,
      description: p.description,
      category: coerceCategory(p.category),
      dayPart: coerceDayPart(p.dayPart),
      order: idx,
      cost: null,
      coordinates: null,
      accessibility: null,
    }));
    days.push({ id: newId(), index: i, label: `Day ${i + 1}`, date: null, places });
  }
  return days;
}
