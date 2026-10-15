# Phase 0 Research: Trip Map View

**Feature**: 002-trip-map-view | **Date**: 2026-10-15

Every open question flagged in the plan's Technical Context is resolved here. Decisions are recorded with rationale and the alternatives considered. Two of these graduate to ADRs (`ADR-0005`, `ADR-0006`) because they are nontrivial and hard to reverse once code is written against them.

---

## R1. Map library

**Decision**: **react-leaflet** 5.x (built on Leaflet 1.9.4), loaded in a Next.js client component via `dynamic(..., { ssr: false })`.

**Rationale**:
- Mature, battle-tested, free of per-request fees. No account, no key, no token.
- React 19 compatible (v5 line).
- Supports raster tiles out of the box — the simplest viable path for FR-002/FR-003.
- Marker keyboard focus and ARIA roles are reachable (markers render as DOM elements); custom `keyboard: true` and `title` give accessible labels we need for FR-012.
- Reduced-motion is honored via `zoomAnimation: false` + `fadeAnimation: false` + `markerZoomAnimation: false` on map init when `prefers-reduced-motion` matches (FR-013).
- Vite/Vitest friendly — can be code-split out of jsdom tests entirely.

**Alternatives considered**:
- **MapLibre GL** — vector tiles look sharper, but needs a vector tile source (OpenFreeMap works, Protomaps works) and is heavier for a feature whose main value is "show me the pins." Rejected on YAGNI (Constitution VII); revisit later if visual polish demands it.
- **Mapbox GL JS** — needs an access token (public key), which breaks the BYOK-consistency intent of FR-010. Rejected.
- **Google Maps JS API** — needs a billable API key, breaks FR-010/FR-011. Rejected.
- **Hand-roll SVG over a static tile** — fast to ship but loses pan/zoom, so would fail FR-002. Rejected.

**Captured as**: `docs/adr/ADR-0005-react-leaflet-map-library.md` (to be written in Phase 2 implementation; placeholder listed in plan).

---

## R2. Tile source

**Decision**: **CARTO raster basemaps** (Positron for light, Dark Matter for dark), served from `https://{s}.basemaps.cartocdn.com/...`. Free for non-commercial use, no key, standard OSM attribution plus CARTO attribution.

**Rationale**:
- No API key → no secret in client bundle (FR-011) and no additional user key (FR-010).
- OSM Foundation's main tile servers (`tile.openstreetmap.org`) are explicitly **not** for third-party apps — using them breaks the OSM tile usage policy. CARTO basemaps re-serve OSM data under a free, portfolio-friendly policy.
- Positron / Dark Matter are two muted, high-contrast themes that pair well with Day colors (reduces visual noise behind pins — helps SC-004 contrast).
- Attribution requirements are trivially satisfied by Leaflet's built-in attribution control; satisfies FR-020.

**Alternatives considered**:
- **OpenStreetMap default tiles** — violates OSM tile usage policy for any app with real users; even for a portfolio demo it is incorrect to document doing this. Rejected.
- **Stadia Maps** — attractive styles but requires a (free-tier) API key; breaks FR-010 intent. Rejected.
- **MapTiler** — same key requirement. Rejected.
- **OpenFreeMap** (vector) — appealing and free but ties us to MapLibre; see R1 rejection. Rejected (follow-on).
- **Protomaps PMTiles** (self-hosted) — great for offline, overkill for v1. Rejected on YAGNI.

**Captured as**: `docs/adr/ADR-0006-carto-basemaps-tiles.md` (Phase 2).

---

## R3. AI coordinate schema extension

**Decision**: Extend `GeneratedItinerarySchema` in `lib/domain/schema.ts` so each generated place MAY include `lat` and `lng` as optional numbers. The boundary module (`lib/ai/generate.ts`) validates each pair against `[-90, 90]` / `[-180, 180]` using the existing `CoordinatesSchema`. Valid pairs become `coordinates: {lat, lng}`; invalid or missing pairs become `coordinates: null`. The trip still saves regardless.

**Rationale**:
- Permissive input, strict output — matches the existing pattern (`category` and `dayPart` are also permissive strings and get coerced).
- Keeps `PlaceSchema` unchanged — Constitution Principle II (no breaking schema migrations).
- Keeps the degraded path identical to today: AI returns garbage → place still exists, just with null coords (Constitution IV).

**Alternatives considered**:
- Make AI coords required — rejected; raises the AI schema-failure rate and breaks Constitution IV.
- Separate "enrichment" call to geocode AI place names client-side — rejected; needs a third-party geocoder (new key, FR-010 pressure) and doubles AI/network cost (Constitution V).

---

## R4. Preserving manual coordinates across regeneration (FR-006a)

**Decision**: Add a pure helper `mergePreserveManualCoords(prevTrip, nextTrip)` in `lib/domain/coord-merge.ts`. Match places by **normalized name** (lowercase, trimmed, collapsed whitespace) scoped to the whole trip (not per day — a place can move days between generations). For each surviving name match where `prev.coordinates !== null`, override `next.coordinates` with the previous value.

Today's app has no in-app "regenerate" button — a new generation currently creates a new Trip with a fresh id and lands in the trips list alongside the old one, so FR-006a is **vacuously satisfied** right now. This helper is written and tested now so that **when** a regenerate affordance is added (future feature), it already does the right thing — a cheap seam, not speculative scaffolding.

**Rationale**:
- Name is the only stable identity across a stateless AI regeneration — ids are generated fresh each time.
- Normalization (lowercase + whitespace collapse) tolerates trivial model variation ("Ubud Monkey Forest" vs "ubud monkey forest").
- Scoping to the whole trip means a user can drag a place from Day 2 to Day 3 between generations and still keep their manual coord — this matches traveler intent.
- Keeping the helper pure and unit-tested is a well-known Constitution-VI "risky seam" pattern.

**Alternatives considered**:
- Match by id — rejected; ids don't survive regeneration.
- Match by `(name, day index)` — rejected; penalizes legitimate reorderings.
- Fuzzy matching with a distance metric — rejected on YAGNI; adds complexity and surprise.
- Side-car "overrides" map stored separately from the trip — rejected on YAGNI; the Trip is already the single source of truth.

**Carryover note**: The spec promises FR-006a will "visibly communicate" the behavior to the traveler. Since no regenerate flow exists today, this UI copy requirement is deferred to whichever future feature introduces regeneration; the merge helper is still implemented and tested now so adding the UI later is a one-line hook-up.

---

## R5. Reduced motion for Leaflet

**Decision**: Detect `window.matchMedia('(prefers-reduced-motion: reduce)')` once at mount of `MapViewClient` and pass to Leaflet's constructor:

```ts
new L.Map(el, {
  zoomAnimation: !reduced,
  fadeAnimation: !reduced,
  markerZoomAnimation: !reduced,
  // flyTo / panTo wrapped to call setView directly when reduced
})
```

Pan/zoom triggered by code (filter changes, pin selection) uses `map.setView(latLng, zoom, { animate: !reduced })`. The media-query listener updates a ref so a setting change mid-session (OS-level toggle) applies on the next action without a remount.

**Rationale**: FR-013 and SC-005 require all motion to be instant under reduced-motion. Leaflet's option flags cover gesture-driven motion; the wrapper covers programmatic motion.

**Alternatives considered**:
- Use `useReducedMotion` from Feature 001's `lib/hooks/useReducedMotion.ts` and remount the map on change — rejected; remount is heavy and causes a visible flash.

---

## R6. SSR / dynamic import

**Decision**: `MapViewClient` is a client component imported via `next/dynamic(() => import('./MapViewClient'), { ssr: false, loading: () => <MapViewSkeleton /> })`. All `react-leaflet` and `leaflet` imports live inside that module, never at the top level of `MapPanel`. Leaflet's CSS (`leaflet/dist/leaflet.css`) is imported inside the client module.

**Rationale**: Leaflet touches `window` and `document` at import time. Server rendering would crash. The dynamic boundary also keeps Leaflet (≈ 150 kB gzipped) out of any route bundle that doesn't open the Map view — enforces SC-002 (fast switch) and keeps the Board view bundle lean.

---

## R7. Testing map code in jsdom

**Decision**: Three tiers.
1. **Pure unit tests** (`lib/domain/*`, `lib/map/*`, viewmodel derivation) — run in Vitest/jsdom; no Leaflet imports.
2. **Component integration tests** for `MapPanel`, `DayFilter`, `NoLocationTray`, and `TileProviderDisclosure` — Leaflet-free surface rendered with a mocked `MapViewClient` that exposes only the pins-list and disclosure state the parent needs. Covers SC-008 (disclosure gating) and FR-007/FR-007a (tray behavior).
3. **One Playwright e2e** (`tests/e2e/trip-map.spec.ts`) that runs the real map in a real Chromium — covers US1 happy path, US2 drop-pin-and-persist, and reduced-motion.

**Rationale**: Leaflet in jsdom is unreliable (SVG/DOM behavior drift, canvas not available). This split keeps unit tests fast and deterministic while still verifying the browser render path once. Matches Constitution VI ("tests MUST target the risky seams").

**Alternatives considered**:
- `@testing-library/react` with Leaflet in jsdom — rejected; flaky.
- Playwright-only — rejected; would be the only test for the coord merge logic, which is unit-level work.

---

## R8. Marker keyboard access & SR summary

**Decision**:
- Pass `keyboard: true` and a human-readable `title` to each Leaflet marker (both are first-class Leaflet options). This gives tab-focus and a tooltip accessible to screen readers.
- Render a visually-hidden `<ul aria-live="polite">` next to the map that mirrors the current viewmodel: `"Showing N places on day K"` + a bulleted list of each pin's name, day, and category. This is the FR-012 "screen-reader-accessible textual summary." It is also the FR-015 fallback when tiles fail (just elevate it from visually-hidden to visible on tile error).

**Rationale**: Leaflet markers are not natively AA-accessible without hints; combining native markers (for sighted keyboard users) with a parallel SR-visible list (for screen-reader users) gives both audiences the real information without duplicating UX.

**Alternatives considered**:
- Rely only on markers + ARIA — rejected; marker popups are not SR-friendly on all engines.
- Hide markers from AT and give SR users a list only — rejected; sighted keyboard users lose spatial context.

---

## R9. Observability for coord enrichment

**Decision**: Emit two structured console logs from the AI boundary when generation returns:
- `ai.coord_enrichment { placesTotal, placesWithCoords, placesInvalidCoords }`
- `ai.coord_enrichment.sample { destination, successRate }`

No PII, no coord values (destination is already user-supplied input, not a leak). This is the minimum needed to validate SC-001 ("≥ 90% of places arrive with usable coordinates") in dev; wiring to a real sink is out of scope for this feature.

**Rationale**: Constitution IV requires every AI call to log token usage and metadata; this adds a thin, feature-specific line without a telemetry stack. Measurable, cheap, reversible.

---

## R10. 50-place soft cap enforcement (FR-018)

**Decision**: The cap is a *derived display rule*, not a storage limit. `useMapViewModel` counts `placesWithCoords` across all days of `currentTrip`; when > 50, the viewmodel sets `showCapBanner: true`. The banner uses `role="status"` and is dismissible per-session (not persisted). No place is ever filtered or hidden by the cap.

**Rationale**: The current hard cap in Feature 001 is 7 × 6 = 42, so the banner is a future-proof safety net rather than a user-visible annoyance today. Keeping the cap at the viewmodel layer (not storage) means later features that raise `MAX_ITEMS_PER_DAY` get the banner for free.

---

## Open questions after Phase 0

None blocking. The three plan-stage items the spec deferred are all resolved above (R1 map library, R2 tile source, R3 AI coord-enrichment path). Address-search geocoding stays explicitly out of scope.
