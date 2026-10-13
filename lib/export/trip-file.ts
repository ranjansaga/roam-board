import { TRIP_EXPORT_SCHEMA_VERSION, TripExportSchema, type Trip } from "@/lib/domain/schema";
import { newId } from "@/lib/domain/id";

/** Serialize a trip to a self-contained, versioned JSON backup (FR-029). */
export function exportTripToJson(trip: Trip): string {
  const payload = {
    schemaVersion: TRIP_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: "roam-board" as const,
    trip,
  };
  return JSON.stringify(payload, null, 2);
}

export type ImportResult = { ok: true; trip: Trip } | { ok: false; error: string };

/**
 * Parse and validate a backup file (FR-021). Rejects malformed JSON and newer schema versions with a
 * clear message; never returns a partial trip. On success the trip gets fresh ids so it becomes the
 * importer's own editable copy.
 */
export function importTripFromJson(raw: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "This file isn't valid JSON." };
  }

  const version = (parsed as { schemaVersion?: unknown })?.schemaVersion;
  if (typeof version === "number" && version > TRIP_EXPORT_SCHEMA_VERSION) {
    return { ok: false, error: "This trip was made with a newer version of Roam Board." };
  }

  const env = TripExportSchema.safeParse(parsed);
  if (!env.success) {
    return { ok: false, error: "This file is missing or has invalid trip data." };
  }

  const src = env.data.trip;
  const trip: Trip = {
    ...src,
    id: newId(),
    updatedAt: new Date().toISOString(),
    days: src.days.map((d) => ({
      ...d,
      id: newId(),
      places: d.places.map((p) => ({ ...p, id: newId() })),
    })),
  };
  return { ok: true, trip };
}
