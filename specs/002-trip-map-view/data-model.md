# Phase 1 Data Model: Trip Map View

**Feature**: 002-trip-map-view | **Date**: 2026-10-15

**Scope**: Describe every data shape this feature reads or writes, where it lives, and what state transitions it participates in. **No persisted schema breaks** — `Place.coordinates` is already a nullable `{lat, lng}` field on the Feature 001 domain model (see `lib/domain/schema.ts`).

---

## 1. Persisted entities (no change)

### `Trip` / `Day` / `Place`

Unchanged from Feature 001. This feature consumes `Place.coordinates` and may populate it from one of three paths:

| Path | Source | When |
|---|---|---|
| AI | `lib/ai/generate.ts` (extended) | On trip generation (and preserved on regeneration per FR-006a) |
| Manual drop | `boardStore.setCoordinates(placeId, {lat, lng})` | Traveler drops a pin from the "No location set" tray |
| Manual edit | same action, invoked from the pin popup | Traveler enters "Edit location" mode and overwrites existing coords |

**Invariants** (enforced by `CoordinatesSchema` already in place):
- `lat ∈ [-90, 90]`, `lng ∈ [-180, 180]`
- If either value is missing or out of range, the pair stays `null` (never a partial object).

---

## 2. New domain additions (not persisted on their own)

### 2.1 `GeneratedItinerarySchema` — additive change

```ts
// lib/domain/schema.ts (edited)
// Permissive on inputs; the boundary coerces/validates.
export const GeneratedItinerarySchema = z.object({
  days: z.array(z.object({
    places: z.array(z.object({
      name: z.string().min(1).max(120),
      description: z.string().max(600),
      category: z.string(),
      dayPart: z.string(),
      lat: z.number().optional(),   // NEW
      lng: z.number().optional(),   // NEW
    })),
  })),
});
```

The transform in `lib/ai/generate.ts` folds `{lat, lng}` into `coordinates: {lat, lng}` iff both are present and inside valid ranges, else `coordinates: null`.

### 2.2 `coord-merge` helper (pure)

```ts
// lib/domain/coord-merge.ts (new)
export function mergePreserveManualCoords(prev: Trip, next: Trip): Trip;
```

Input `prev` and `next` are two full `Trip` snapshots. Output is a new `Trip` identical to `next` except for each place in `next`:
- Lookup by normalized name (lowercase, trim, collapse internal whitespace) across all days of `prev`.
- If `prev` has a match whose `coordinates !== null`, override `next.place.coordinates` with that value.
- Otherwise keep `next`'s coordinates (which may be from AI or `null`).

**Side-effect-free**; writes nothing; safe for `use client`.

### 2.3 `setCoordinates` board operation

```ts
// lib/domain/board-ops.ts (added export)
export function setCoordinates(
  trip: Trip,
  placeId: string,
  coords: { lat: number; lng: number } | null,
): Trip;
```

Returns `trip` unchanged if `placeId` not found or `coords` fails `CoordinatesSchema`. Otherwise returns a new trip with the one place updated.

### 2.4 Store action

```ts
// lib/store/board-store.ts (edited)
setCoordinates: (placeId: string, coords: {lat: number; lng: number} | null) => void;
```

Thin wrapper around `apply(setCoordinates)` — persists through `repo.save` exactly like other edits (same code path).

---

## 3. Ephemeral viewmodel (per-session, not persisted)

### `MapViewModel`

Derived from `currentTrip` + `DayFilterState` by `useMapViewModel`:

```ts
type DayFilter = { kind: "all" } | { kind: "single"; dayId: string };

type MapPin = {
  placeId: string;
  dayId: string;
  dayIndex: number;      // 0-based, for color/number
  name: string;
  description: string;
  category: PlaceCategory;
  coord: { lat: number; lng: number };
};

type UnlocatedPlace = {
  placeId: string;
  dayId: string;
  dayIndex: number;
  name: string;
};

type DayLegend = {
  dayId: string;
  dayIndex: number;
  label: string;
  count: number;          // located places in this day
  colorToken: string;     // Tailwind class or CSS var
};

type MapViewModel = {
  pins: MapPin[];             // filtered by DayFilter
  unlocated: UnlocatedPlace[]; // all days, regardless of filter
  legend: DayLegend[];
  bounds: [[number, number], [number, number]] | null; // null if no pins
  totalLocated: number;        // across whole trip, for cap check
  showCapBanner: boolean;      // totalLocated > 50
};
```

### `MapInteractionState` (component-local, not in store)

```ts
type MapInteractionState = {
  activePinId: string | null;        // currently-open popup
  editLocationFor: string | null;    // placeId in "edit location" mode (FR-009)
  dropMode: { placeId: string } | null; // tray → map pick in progress (FR-008)
  showRoutes: boolean;               // US3 toggle
  disclosureAcknowledged: boolean;   // mirrors localStorage flag
};
```

Lives inside `MapPanel` with `useState`/`useReducer`; **does not** go to Zustand. Crossing into Zustand would couple ephemeral UI state to persisted trip state and invite stale reads.

### `DisclosureFlag` (persisted in localStorage only)

```ts
// Key: "roam-board.map.tile-disclosure.v1"
// Value: ISO-8601 timestamp of dismissal, or absent.
```

Hooked by `useTileProviderDisclosure`; a Settings link resets it to re-show the modal.

---

## 4. State transitions

### 4.1 Place coordinates lifecycle

```text
                 ┌──────────────┐
     (AI miss) ──│ coordinates  │─── (manual drop) ────┐
                 │   = null     │                       │
                 └──────────────┘                       ▼
                        ▲                        ┌─────────────┐
                        │                        │ coordinates │
             (edit→clear│not supported)          │   = {l,g}   │
                        │                        └─────────────┘
                        │                               │
                        └── (regeneration & no match)   │
                                                        │
                                                        │
                            (edit location, FR-009) ────┘
```

- Clearing an existing coord is **not supported** in this feature (no FR requires it). The only way back to `null` is a regeneration where the manual name didn't survive.

### 4.2 Disclosure gate (SC-008)

```text
first open of Map view
  └── disclosureAcknowledged === false
         ├── render disclosure modal
         ├── MapViewClient is NOT mounted → no tile request fires
         └── on dismiss → set localStorage flag → mount MapViewClient
```

### 4.3 Day filter

```text
DayFilter = {all}  ──select day─▶  {single, dayId}  ──select "All days"─▶  {all}
                                           │
                                           └── pins filtered + map auto-fits to that day's bounds
                                                 (setView with animate: !reducedMotion)
```

---

## 5. Relationships to existing modules

| New / edited module | Depends on | Depended on by |
|---|---|---|
| `lib/domain/schema.ts` (edit) | zod | everything |
| `lib/domain/coord-merge.ts` (new) | `schema.ts` | `lib/ai/generate.ts` |
| `lib/domain/board-ops.ts` (edit) | `schema.ts` | `lib/store/board-store.ts` |
| `lib/ai/generate.ts` (edit) | AI SDK, `schema.ts`, `coord-merge.ts` | `app/api/generate/route.ts` |
| `lib/store/board-store.ts` (edit) | `board-ops.ts`, repo | all trip pages |
| `lib/map/config.ts` (new) | — | `MapViewClient.tsx` |
| `lib/map/distance.ts` (new) | — | `useMapViewModel.ts` (US3) |
| `lib/hooks/useTileProviderDisclosure.ts` (new) | — | `MapPanel.tsx` |
| `app/trips/[tripId]/map/*` (new) | store, viewmodel, dynamic Leaflet | `app/trips/[tripId]/page.tsx` |
| `app/trips/[tripId]/page.tsx` (edit) | — | router |

---

## 6. Validation rules (summary)

| Rule | Enforced where | Covers |
|---|---|---|
| Coordinates in valid lat/lng range | `CoordinatesSchema` | FR-006, FR-008, FR-009 |
| AI pair missing/invalid → `null` | `lib/ai/generate.ts` transform | FR-006 |
| Manual coord preserved across regen | `mergePreserveManualCoords` | FR-006a |
| Add-Place dialog never writes coords | existing `addPlace` op unchanged | FR-007a |
| No tile fetch before disclosure dismissed | `MapPanel` gates `MapViewClient` mount | SC-008, FR-019 |
| Map stays usable without a single located place | `MapViewModel.pins = []` → empty-state branch | Edge Case (0 coords) |
| Cap banner above 50 located places | `MapViewModel.showCapBanner` | FR-018 |
