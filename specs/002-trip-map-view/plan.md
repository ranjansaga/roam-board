# Implementation Plan: Trip Map View

**Branch**: `002-trip-map-view` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-trip-map-view/spec.md`

## Summary

Add a Map view to a trip page that pins every place with coordinates onto an interactive map, grouped by day, with a day filter, a "No location set" tray for repair, pin-click popups, a Board↔Map toggle, and an optional "Show day routes" overlay. Extend the AI generation path to request coordinates per place, kept nullable so trips still save when the model can't resolve them. Preserve any manually-set coordinates across regeneration. All work is BYOK-consistent: no new user-facing keys, no secrets in client bundles, and the first visit shows a dismissible tile-provider disclosure.

Technical approach: use **react-leaflet** (Leaflet-backed) with **CARTO raster basemaps** (no key, free, attribution-only) rendered via a client-only dynamic import so Next.js SSR stays clean. Pins and the day filter are driven by a derived `MapViewModel` built from `currentTrip`; the "No location set" tray and location-edit mode use the same Zustand store as Feature 001, calling a new `setCoordinates` action backed by a new pure op in `lib/domain/board-ops.ts`. Keyboard parity mirrors the Board (tab to filter, pins, tray; Enter/Space activates). The AI schema gains optional `lat`/`lng` fields on each generated place; the boundary module validates ranges and silently drops invalid pairs. A one-time disclosure modal gates the first tile fetch via local-storage flag.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), React 19.3, Node 20+ (dev/test only)

**Primary Dependencies**: Next.js 16.4 (App Router), Zustand 5, Zod 4, Vercel AI SDK v7 + `@ai-sdk/google` v4, dnd-kit (existing). **New**: `leaflet` 1.9.4, `react-leaflet` 5.x (React 19-compatible), `@types/leaflet` (dev)

**Storage**: Browser `localStorage` via existing `lib/persistence/local-storage-repo.ts` (no new storage mechanism; coordinates ride on the existing `Trip` JSON)

**Testing**: Vitest + Testing Library (unit/integration/a11y), jest-axe for accessibility, Playwright for e2e. Map rendering is skipped in jsdom (Leaflet needs real DOM); its logic is tested via headless adapters, and the browser rendering path is covered by one Playwright e2e scenario.

**Target Platform**: Modern evergreen browsers (desktop + mobile); same as Feature 001. No native apps, no offline.

**Project Type**: Single Next.js web app (App Router)

**Performance Goals**: Map opens with all pins visible in **< 2 s** (warm cache, ≤ 50 located places, consumer laptop). Pan/zoom at 60 fps on devices that support it.

**Constraints**: No secret keys in client bundles (Constitution). No additional user-provided key beyond Feature 001's Gemini key. `prefers-reduced-motion` disables all map transitions. WCAG 2.2 AA. Soft cap of 50 located places (FR-018). Tile requests gated by the first-visit disclosure modal (SC-008).

**Scale/Scope**: One trip at a time; max 7 days × 6 places = 42 places per trip hard cap (existing from Feature 001). Soft cap of 50 is comfortably above the hard cap, so in practice the banner is a safety net for future features that raise `MAX_ITEMS_PER_DAY`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-Phase-0 | Rationale |
|---|---|---|---|
| I. Spec-Driven, Documented in the Open | Spec + plan + ADRs exist; PRs reference the spec | **PASS** | Spec approved + clarified; this plan is in-tree; two new ADRs will land in Phase 1 (map library, tile source). |
| II. Vertical Slices on Forward-Compatible Core | Reuses `Place.coordinates` (already nullable); no breaking schema change | **PASS** | Only additive change is on `GeneratedItinerarySchema` (adds optional `lat`/`lng`); core `PlaceSchema` is unchanged. |
| III. Accessibility (WCAG 2.2 AA) | Keyboard, focus, labels, alt, contrast, reduced-motion | **PASS** (gated) | Explicit FRs 012/013 and SC-004/SC-005; jest-axe runs on the trip page with Map view active. See research: Leaflet marker keyboard pattern. |
| IV. AI Bounded/Observable/Degradable | Single boundary module, validated output, graceful degradation | **PASS** | Coordinate parsing stays inside the existing AI boundary (`lib/ai/*`); invalid coords → null, never throw; app remains usable without any coordinates. |
| V. Cost & Abuse Awareness | Cache, debounce, bounded loops, no runaway calls | **PASS** | Tile requests bounded by the Leaflet viewport and the first-visit disclosure gate; no AI calls added beyond the existing generation path. |
| VI. Typed, Tested, Trustworthy | End-to-end types, risky-seam tests, CI gates | **PASS** | Tests target: coord-merge op, viewmodel derivation, disclosure gate, keyboard focus, and 1 e2e. CI already runs typecheck/lint/vitest/axe/build. |
| VII. Simplicity & Reversibility (YAGNI) | Simplest thing that works; ADR for nontrivial choices | **PASS** | No routing engine, no geocoding, no clustering — all deliberately out of scope. Two ADRs record the lib and tile choices. |

No violations → **Complexity Tracking table omitted**.

### Post-Design Re-check (after Phase 1)

Re-ran every gate against the research + data-model + contracts artifacts. All seven principles still **PASS**:

- **I**: Phase 1 produced spec+plan+research+data-model+contracts+quickstart; two ADRs are listed in the file tree for the implementation phase.
- **II**: `PlaceSchema` is untouched; only `GeneratedItinerarySchema` gains two optional fields. No persistence migration. `TRIP_EXPORT_SCHEMA_VERSION` stays at 1.
- **III**: Contract `map-view-controls.md` enumerates keyboard, ARIA, SR summary, reduced-motion, and color-plus-badge rules for every control.
- **IV**: Coordinate parsing is inside `lib/ai/generate.ts`; invalid coords → `null`, never throw. `coord-merge` is a pure helper. Observability logs added (R9) without a new sink.
- **V**: No new AI calls. Tile fetches gated by the first-visit disclosure modal; soft cap banner for runaway trips.
- **VI**: Three test tiers (unit / integration / one e2e) spelled out in R7 and the plan's test tree; CI gates unchanged.
- **VII**: Routing, geocoding, clustering, and offline maps are all explicitly out of scope. Only two new third-party deps (`leaflet`, `react-leaflet`). Two ADRs cover the nontrivial choices.

No violations surfaced during design → **no additions to Complexity Tracking**.

## Project Structure

### Documentation (this feature)

```text
specs/002-trip-map-view/
├── plan.md               # This file
├── research.md           # Phase 0 output (library/tile/AI-schema decisions)
├── data-model.md         # Phase 1 output (viewmodel, store additions, no schema break)
├── quickstart.md         # Phase 1 output (how to validate the slice end-to-end)
├── contracts/
│   ├── ai-generation-coords.md    # AI boundary input/output extension
│   └── map-view-controls.md       # Keyboard/ARIA contract for Map view controls
└── checklists/
    └── requirements.md   # From /speckit-specify
```

### Source Code (repository root)

Single Next.js App Router project. New files are additive; a handful of existing files get small, scoped edits.

```text
app/
├── trips/[tripId]/
│   ├── page.tsx                            # (edit) hosts Board↔Map toggle
│   └── map/
│       ├── MapViewClient.tsx               # (new, client-only via dynamic import) react-leaflet host
│       ├── MapPanel.tsx                    # (new) wraps MapViewClient, day filter, tray, disclosure
│       ├── DayFilter.tsx                   # (new) accessible day filter chips
│       ├── NoLocationTray.tsx              # (new) tray listing places with null coords
│       ├── TileProviderDisclosure.tsx      # (new) one-time modal gating tile fetch
│       └── useMapViewModel.ts              # (new) derives pins + tray + legend from currentTrip

lib/
├── domain/
│   ├── schema.ts                           # (edit) extend GeneratedItinerarySchema with optional lat/lng
│   ├── board-ops.ts                        # (edit) add setCoordinates(trip, placeId, coords)
│   └── coord-merge.ts                      # (new) mergePreserveManualCoords(prevTrip, nextTrip)
├── ai/
│   └── generate.ts                         # (edit) ask AI for coords; validate; drop invalid; merge
├── store/
│   └── board-store.ts                      # (edit) add setCoordinates action
├── hooks/
│   └── useTileProviderDisclosure.ts        # (new) localStorage flag + reset affordance
└── map/
    ├── config.ts                           # (new) tile URL, attribution, bounds helpers
    └── distance.ts                         # (new) haversine for US3 route totals

tests/
├── unit/
│   ├── coord-merge.test.ts                 # (new) FR-006a
│   ├── set-coordinates.test.ts             # (new) board-op + store action
│   ├── ai-coord-parsing.test.ts            # (new) invalid coords → null; valid pass through
│   ├── map-viewmodel.test.ts               # (new) tray split, legend, day filter projection
│   └── distance.test.ts                    # (new) haversine (US3)
├── integration/
│   ├── map-panel.test.tsx                  # (new) controls, tray, disclosure gating (jsdom)
│   └── tile-disclosure.test.tsx            # (new) SC-008: no tile request before dismissal
├── a11y/
│   └── map-panel.a11y.test.tsx             # (new) axe on Map panel + keyboard order
└── e2e/
    └── trip-map.spec.ts                    # (new) view toggle, filter, tray → drop pin → persist

docs/adr/
├── ADR-0005-react-leaflet-map-library.md   # (new)
└── ADR-0006-carto-basemaps-tiles.md        # (new)
```

**Structure Decision**: Keep the Map view in a dedicated `app/trips/[tripId]/map/` subtree so Leaflet's client-only code never leaks into SSR or into the Board view's bundle (dynamic import with `ssr: false`). Domain primitives (coord merge, haversine, setCoordinates op) live in `lib/domain/` + `lib/map/` and are testable without a DOM. Feature 001's `board-ops.ts` stays the authoritative mutation surface; this feature adds one op there and one in `coord-merge.ts`.

## Complexity Tracking

> Not applicable — Constitution Check has no violations.
