# Phase 1 Data Model: AI Itinerary Generation + Kanban Board

**Date**: 2026-10-12 · **Feature**: `001-ai-itinerary-kanban`

Zod schemas in `lib/domain/schema.ts` are the single source of truth; TypeScript types are inferred
(`z.infer<typeof ...>`). Field shapes below are the design contract — not final code.

---

## Enumerations

```ts
// Fixed category set (FR-028). Any AI-produced value outside this set maps to "other".
PlaceCategory = "food" | "sightseeing" | "outdoors" | "culture"
              | "nightlife" | "shopping" | "transit" | "accommodation" | "other"

// Card timing (FR-005, clarified): structured day-part + explicit order index.
DayPart = "morning" | "afternoon" | "evening"

// Generation preferences (all optional at input; FR-002/FR-003).
Pace = "relaxed" | "balanced" | "packed"
```

## Entity: Place / Activity (card)

| Field | Type | Req. | Rules |
|------|------|:---:|------|
| `id` | string (uuid) | ✓ | Stable client-generated id |
| `name` | string | ✓ | 1–120 chars (FR-005) |
| `description` | string | ✓ | 0–600 chars |
| `category` | `PlaceCategory` | ✓ | From fixed set; out-of-set → `"other"` (FR-028) |
| `dayPart` | `DayPart` | ✓ | morning/afternoon/evening (FR-005) |
| `order` | integer ≥ 0 | ✓ | Order within its day; unique per day (FR-005) |
| **`cost`** | `{ amount: number; currency: string } \| null` | — | **Nullable, unused in 001** (FR-025) → Budget feature |
| **`coordinates`** | `{ lat: number; lng: number } \| null` | — | **Nullable, unused in 001** (FR-025) → Map/Weather features |
| **`accessibility`** | `{ wheelchairAccessible?: boolean; stepFree?: boolean; notes?: string } \| null` | — | **Nullable, unused in 001** (FR-025) → Accessibility feature |

> The three **bold** fields are the Principle II forward-compatible core: they exist and serialize
> from Feature 001 so Features 002–005 attach with **no breaking migration**. No 001 behavior reads
> or writes them.

## Entity: Day

| Field | Type | Req. | Rules |
|------|------|:---:|------|
| `id` | string (uuid) | ✓ | |
| `index` | integer ≥ 0 | ✓ | 0-based day position; contiguous within a trip |
| `label` | string | ✓ | e.g. "Day 1" (derived from `index`, editable) |
| `date` | ISO date string `\| null` | — | Optional; nullable in 001 |
| `places` | `Place[]` | ✓ | Ordered by `order`; may be empty (empty days allowed) |

## Entity: Trip

| Field | Type | Req. | Rules |
|------|------|:---:|------|
| `id` | string (uuid) | ✓ | |
| `title` | string | ✓ | 1–120 chars; defaults from destination |
| `destination` | string | ✓ | 1–120 chars |
| `days` | `Day[]` | ✓ | **length 1–7** (FR-027); `index` contiguous |
| `preferences` | `GenerationRequest \| null` | — | Snapshot of inputs used to generate (if any) |
| `createdAt` | ISO datetime | ✓ | |
| `updatedAt` | ISO datetime | ✓ | Bumped on every mutation |
| `source` | `"ai" \| "manual"` | ✓ | How the trip was first created |

## Entity: GenerationRequest (transient)

| Field | Type | Req. | Rules |
|------|------|:---:|------|
| `destination` | string | ✓ | 1–120 chars (FR-001) |
| `days` | integer | ✓ | **1–7** (FR-027) |
| `interests` | string[] | — | 0–10 items, each ≤ 40 chars (FR-002) |
| `pace` | `Pace` | — | Default `"balanced"` (FR-003) |
| `party` | string | — | Free text, ≤ 120 chars (FR-002) |
| `accessibilityNeeds` | string | — | Free text, ≤ 240 chars; passed as generation context only in 001 |

> Not persisted as a first-class record; a snapshot is stored on `Trip.preferences`. Request size is
> capped (Principle V): bounded `days`, bounded `interests` count/length, bounded free-text lengths.

## Entity: TravelerSettings (local, on-device)

| Field | Type | Req. | Rules |
|------|------|:---:|------|
| `geminiApiKey` | string `\| null` | — | BYOK; on-device only; **never** sent anywhere but `/api/generate` per request; never persisted server-side (FR-009) |
| `model` | string `\| null` | — | Optional override of the `GEMINI_MODEL` default |
| `reducedMotion` | boolean | — | Mirrors/overrides `prefers-reduced-motion` for DnD |

## AI generation output schema (the `generateObject` target)

The model is asked to return a plain itinerary that the boundary **normalizes** into `Day[] + Place[]`:

```ts
GeneratedItinerary = {
  days: Array<{
    places: Array<{
      name: string
      description: string
      category: PlaceCategory   // coerced to "other" if unknown
      dayPart: DayPart
    }>
  }>
}
```

**Normalization rules applied by `lib/ai` after validation (FR-006):**

- Force the number of days to exactly the requested `days` (pad with empty days / drop extras).
- Assign `order` per day from array position; assign `id`s; coerce unknown categories to `"other"`.
- Enforce the 6-items/day cap — trim any overflow beyond 6 — to bound output (FR-027, Principle V).
- If output fails Zod validation, treat as a generation failure (clear error, app stays usable —
  FR-024, Principle IV); never render a partial/broken board (SC-007).

## Trip export file

A self-contained, versioned JSON document (FR-029). Full contract in
[contracts/trip-export.schema.md](./contracts/trip-export.schema.md).

```ts
TripExport = {
  schemaVersion: 1          // integer; gates import compatibility
  exportedAt: ISO datetime
  trip: Trip                // complete, self-contained
}
```

**Import rules**: recognized `schemaVersion` → import (migrate if needed); unknown/newer version or
malformed content → reject with a clear message, leaving existing trips untouched (FR-021, edge
cases).

## Relationships & invariants

- `Trip 1–* Day 1–* Place`. A `Place` belongs to exactly one `Day`; a `Day` to exactly one `Trip`.
- `Trip.days.length ∈ [1,7]`; `Day.index` values are `0..n-1` and contiguous.
- Within a `Day`, `Place.order` values are unique and define display order.
- `updatedAt` is bumped on any mutation; persistence writes the whole `Trip` atomically via the
  repository.
