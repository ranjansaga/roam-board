# Contract: AI generation — coordinate extension

**Feature**: 002-trip-map-view | **Boundary module**: `lib/ai/generate.ts`

Extends the existing AI generation contract (`specs/001-ai-itinerary-kanban/contracts/`) with an optional per-place `{lat, lng}` enrichment. **The boundary module is still the only place in the app that talks to the AI provider** (Constitution IV).

## 1. Prompt change (informative)

The system prompt gains one line directing the model to return numeric `lat` and `lng` for each place where the model is confident, and to omit them (or set them to `null`) otherwise.

> "For each place, include `lat` and `lng` as decimal degrees (WGS84) when you are confident of its location. Omit both fields if you are not confident. Do not guess."

Prompt engineering details beyond that one line are implementation concerns and may change without a contract version bump.

## 2. Model output schema (as parsed)

```jsonc
{
  "days": [
    {
      "places": [
        {
          "name": "Monkey Forest Sanctuary",
          "description": "Sacred grove with macaques and temple ruins.",
          "category": "sightseeing",
          "dayPart": "morning",
          "lat": -8.5188,     // optional
          "lng": 115.2606     // optional
        }
      ]
    }
  ]
}
```

- `lat` and `lng` are OPTIONAL at the schema level (zod `.optional()`).
- A place MAY include neither, both, or only one. Only "both present and in range" counts as a valid pair.

## 3. Validation rules (enforced in `lib/ai/generate.ts`)

| Rule | Behavior on fail |
|---|---|
| `lat` is a finite number in `[-90, 90]` | Treat the pair as missing (`coordinates = null`) |
| `lng` is a finite number in `[-180, 180]` | Treat the pair as missing (`coordinates = null`) |
| Exactly one of `lat` / `lng` is present | Treat the pair as missing (`coordinates = null`) |
| Both valid | Set `place.coordinates = { lat, lng }` |

**The trip MUST still be saved** regardless of the per-place outcome. No single invalid pair fails the generation.

## 4. Observability (R9)

For every completed generation, the boundary logs one line in each category below. These are structured console logs (no telemetry sink added by this feature):

```text
ai.coord_enrichment { placesTotal: 15, placesWithCoords: 14, placesInvalidCoords: 0 }
ai.coord_enrichment.sample { destination: "Bali", successRate: 0.933 }
```

**MUST NOT** log coordinate values, place names, or user prompt text — the destination string is already user-supplied input and is the only identifier in these lines.

## 5. Regeneration contract (FR-006a)

If a caller invokes generation while passing an optional `prevTrip` parameter (future `regenerate(prevTrip, newPreferences)` call), the boundary MUST:

1. Build the fresh trip from the model output (with AI-provided coords).
2. Apply `mergePreserveManualCoords(prevTrip, freshTrip)` from `lib/domain/coord-merge.ts`.
3. Return the merged trip.

Today's `generate` call has no `prevTrip` parameter, so the merge is a no-op; the helper exists so the regenerate flow (future feature) picks the behavior up for free.

## 6. Backward compatibility

- Existing `GenerationRequest` is **unchanged**.
- Trips generated before this feature was shipped have `coordinates === null` on every place; they display correctly in the Map view (every place in the tray) and the user can locate them manually (FR-008).
- The trip export schema (`TripExportSchema`) is **unchanged** — `TRIP_EXPORT_SCHEMA_VERSION` stays at `1` because the only place that got new values (`Place.coordinates`) was already in the exported shape.
