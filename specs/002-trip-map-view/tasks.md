---

description: "Task list for feature 002-trip-map-view"
---

# Tasks: Trip Map View

**Input**: Design documents in `/specs/002-trip-map-view/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are included per the Constitution (Principle VI — "Typed, Tested, Trustworthy") and spelled out in research.md R7.

**Organization**: Tasks are grouped by user story so each slice (US1, US2, US3) is independently buildable, testable, and demoable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks).
- **[Story]**: `[US1]`, `[US2]`, `[US3]` — maps to the three user stories in `spec.md`. Setup/Foundational/Polish phases carry no story label.
- All paths are repo-relative to `/Users/ranjan/mystuff/roam-board`.

## Path Conventions

Single Next.js App Router project. New code lives under `app/trips/[tripId]/map/`, `lib/map/`, with small edits to `lib/domain/`, `lib/ai/`, `lib/store/`, `lib/hooks/`, and `app/trips/[tripId]/page.tsx`. Tests mirror Feature 001: `tests/unit`, `tests/integration`, `tests/a11y`, `tests/e2e`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the two new runtime dependencies and the two ADR stubs so later tasks can reference them.

- [X] T001 Add `leaflet@1.9.4`, `react-leaflet@5.x` (React 19-compatible) to `dependencies` and `@types/leaflet` to `devDependencies` in `package.json`; run `pnpm install`; commit the updated `pnpm-lock.yaml`.
- [X] T002 [P] Create `docs/adr/ADR-0005-react-leaflet-map-library.md` with full Context/Decision/Consequences prose (addresses analyze L1 — body landed on day 1, not deferred to T034).
- [X] T003 [P] Create `docs/adr/ADR-0006-carto-basemaps-tiles.md` with full Context/Decision/Consequences prose (addresses analyze L1).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Every piece below is consumed by at least two of the user stories. Finish this phase before starting any `[US*]` task.

**⚠️ CRITICAL**: No `[US*]` work may begin until this phase's checkpoint lands.

### Domain extensions

- [ ] T004 Extend `GeneratedItinerarySchema` in `lib/domain/schema.ts` with per-place optional `lat: z.number().optional()` and `lng: z.number().optional()`; keep `PlaceSchema` and `TripExportSchema` unchanged; keep `TRIP_EXPORT_SCHEMA_VERSION = 1`.
- [ ] T005 [P] Create pure helper `lib/domain/coord-merge.ts` exporting `mergePreserveManualCoords(prev: Trip, next: Trip): Trip`. Match by trip-scoped normalized name (lowercase, trim, collapse internal whitespace). For each surviving match where `prev.place.coordinates !== null`, override `next.place.coordinates` with that value; otherwise keep `next`'s value. Pure, no side effects.
- [ ] T006 [P] Add `setCoordinates(trip: Trip, placeId: string, coords: {lat: number; lng: number} | null): Trip` to `lib/domain/board-ops.ts`. Return `trip` unchanged if `placeId` not found or coords fail `CoordinatesSchema` validation (lat `[-90,90]`, lng `[-180,180]`); otherwise return a new trip with the one place updated. Pure.

### Domain tests

- [ ] T007 [P] Write unit test `tests/unit/coord-merge.test.ts` covering: identity match preserves manual coord; name case/whitespace variation still matches; place moved to a different day still preserves coord; place deleted in `next` is simply absent; `prev.coord === null` lets `next.coord` through; place added in `next` keeps whatever `next` provides.
- [ ] T008 [P] Write unit test `tests/unit/set-coordinates.test.ts` covering: valid coord sets it; invalid lat/lng returns trip unchanged; unknown placeId returns trip unchanged; `null` coord clears the field; the returned trip is a new reference (no in-place mutation).

### AI boundary

- [ ] T009 Edit `lib/ai/generate.ts` to: (a) include the one-line prompt addition from `contracts/ai-generation-coords.md §1`; (b) parse the extended `GeneratedItinerarySchema`; (c) fold `{lat, lng}` into `coordinates` iff both present and in range, else `coordinates: null`; (d) emit the two structured console logs from `contracts/ai-generation-coords.md §4` without logging coord values or place names; (e) accept an optional `prevTrip?: Trip` parameter and, when passed, apply `mergePreserveManualCoords` to the fresh trip before returning (not yet wired from any caller — the hook exists for future regenerate).
- [ ] T010 [P] Write unit test `tests/unit/ai-coord-parsing.test.ts` covering the AI post-processing path only (mock the model): both lat/lng present and valid → `coordinates` populated; lat only present → `null`; lat out of `[-90,90]` → `null`; non-finite number → `null`; missing both → `null`; and that one invalid pair never fails the whole generation. Also assert the two observability log lines fire with the expected shape (no coord values).

### Store, map config, hook

- [ ] T011 Add `setCoordinates(placeId: string, coords: {lat: number; lng: number} | null): void` to `lib/store/board-store.ts`, wiring it through the existing `apply()` helper so it persists via `repo.save` on every call.
- [ ] T012 [P] Create `lib/map/config.ts` exporting: the CARTO Positron (light) + Dark Matter (dark) tile URL templates, the required attribution HTML (OSM + CARTO), the 10-color day palette (CSS tokens or Tailwind classes paired with per-day numeric badges — never color-only), and a `boundsFor(pins: {lat,lng}[]): [[number,number],[number,number]] | null` helper.
- [ ] T013 [P] Create `lib/hooks/useTileProviderDisclosure.ts` exporting `{ acknowledged, acknowledge, reset }` backed by `localStorage["roam-board.map.tile-disclosure.v1"]`; must tolerate blocked storage (returns `acknowledged: false` and `acknowledge` is a safe no-op persistence attempt).

**Checkpoint**: `pnpm typecheck && pnpm lint && pnpm test` green. The three user-story phases can now proceed in parallel if staffed; sequential P1 → P2 → P3 is the default solo path.

---

## Phase 3: User Story 1 — See my trip on a map (Priority: P1) 🎯 MVP

**Goal**: Open any trip, toggle Board↔Map, see every located place pinned by day, filter by a single day, open pin popups by click or keyboard; first visit shows the tile-provider disclosure before any tile request fires.

**Independent Test**: Generate a Bali 3-day trip. Click "Map". A disclosure modal appears before any `basemaps.cartocdn.com` request. Dismiss it; all located places appear pinned, color/number-coded by day. Filtering to "Day 2" shows only Day 2 pins and auto-fits bounds; "All days" restores all. Clicking (or Enter'ing on) a pin opens a popup with name, day, and description. Switching back to Board shows the trip unmodified.

### Tests for User Story 1

- [ ] T014 [P] [US1] Unit test `tests/unit/map-viewmodel.test.ts` for `useMapViewModel` — pure derivation: full trip in → correct `pins`/`unlocated`/`legend`/`bounds`/`totalLocated`; day filter projects pins correctly; `null` `coordinates` always lands in `unlocated` regardless of day filter; `bounds === null` when no pins; `showCapBanner` flips at > 50 located places.
- [ ] T015 [P] [US1] Integration test `tests/integration/map-panel.test.tsx` (jsdom; `MapViewClient` mocked to its visible-pins list) covering: tablist toggle (Board↔Map) with correct `aria-selected`; day filter radio-group keyboard semantics; legend contents; empty state when no located pins exist.
- [ ] T016 [P] [US1] Integration test `tests/integration/tile-disclosure.test.tsx` asserting SC-008: on first mount with no localStorage flag, the disclosure dialog renders and the mocked tile-fetch spy records **zero** calls until Dismiss is clicked.
- [ ] T017 [P] [US1] Accessibility test `tests/a11y/map-panel.a11y.test.tsx` running jest-axe on the Map panel (with disclosure dismissed, mock `MapViewClient`); assert zero violations and verify the SR summary live-region exists with `aria-live="polite"`.
- [ ] T018 [US1] Playwright e2e `tests/e2e/trip-map.spec.ts` for US1 happy path: open an existing trip → click Map → dismiss disclosure → assert pin count matches located places → click a pin → assert popup content → toggle back to Board → assert unchanged. Also assert `prefers-reduced-motion: reduce` makes the day-filter view change instant (no animation).

### Implementation for User Story 1

- [ ] T019 [US1] Implement `app/trips/[tripId]/map/useMapViewModel.ts` consuming `useBoardStore().currentTrip` + a `DayFilter` arg, producing the `MapViewModel` shape from `data-model.md §3`. Pure projection; no side effects.
- [ ] T020 [US1] Implement `app/trips/[tripId]/map/TileProviderDisclosure.tsx` — focus-trapped `role="dialog" aria-modal="true"` with Dismiss (primary) and "Learn more" (anchor to a future Settings section); on dismiss, calls `useTileProviderDisclosure().acknowledge()`.
- [ ] T021 [US1] Implement `app/trips/[tripId]/map/DayFilter.tsx` as a `<fieldset>` with a visually-hidden legend and one radio per day plus "All days", following the keyboard contract in `contracts/map-view-controls.md §2` (roving tabindex, arrow-key selection + focus).
- [ ] T022 [US1] Implement `app/trips/[tripId]/map/MapViewClient.tsx` — client component importing `leaflet` + `react-leaflet` + `leaflet/dist/leaflet.css` at module top; initializes map with `zoomAnimation/fadeAnimation/markerZoomAnimation = !reducedMotion`; renders tile layer from `lib/map/config.ts`; renders one `Marker` per pin with `{ keyboard: true, title }`; wires an `applyView(latLng, zoom)` wrapper per `contracts/map-view-controls.md §9` (the only place that selects animated vs. instant motion).
- [ ] T023 [US1] Implement `app/trips/[tripId]/map/MapPanel.tsx` wrapping all of the above: dynamic-imports `MapViewClient` with `{ ssr: false, loading: <MapViewSkeleton /> }`; gates its mount on `useTileProviderDisclosure().acknowledged` so SC-008 holds; renders `TileProviderDisclosure`, `DayFilter`, legend, and a visually-hidden `<ul aria-live="polite">` carrying the SR summary from `contracts/map-view-controls.md §8`.
- [ ] T024 [US1] Edit `app/trips/[tripId]/page.tsx` to add a tablist (Board / Map) following `contracts/map-view-controls.md §1`; render either the existing `Board` or the new `MapPanel`; state is session-only (no URL).

**Checkpoint**: US1 is independently demoable — Scenarios 1–7 in `quickstart.md` all pass.

---

## Phase 4: User Story 2 — Fix or add a place's location (Priority: P2)

**Goal**: Places without coordinates land in a visible, keyboard-reachable "No location set" tray. The traveler selects one, drops a pin on the map, and the location saves (same storage path as every other trip edit). The traveler can also edit an existing pin's location via an explicit "Edit location" affordance; pins are never draggable.

**Independent Test**: Open a trip with at least one unlocated place. The tray lists it. Pick it; the Map enters drop-mode with a status announcement; click on the map; the pin appears and the tray entry disappears. Reload the page — the pin is still there. Open any pin, click "Edit location", pick a new point; next reload confirms the move. Try to drag a pin directly — it does not move.

### Tests for User Story 2

- [ ] T025 [P] [US2] Integration test `tests/integration/no-location-tray.test.tsx` (jsdom) covering: tray lists all `unlocated` entries grouped by day; empty-tray state renders "All places have a location."; activating a tray button sets `MapInteractionState.dropMode` and renders the `role="status"` message from `contracts/map-view-controls.md §4`; Escape cancels drop-mode without saving.
- [ ] T026 [US2] Extend `tests/e2e/trip-map.spec.ts` with US2 scenarios: tray → drop pin → pin appears → reload → pin persists; open popup → Edit location → re-pick → persists; manually-added place from Feature 001 Add-Place flow lands in the tray on next Map-view open (FR-007a).

### Implementation for User Story 2

- [ ] T027 [US2] Implement `app/trips/[tripId]/map/NoLocationTray.tsx` — `<aside aria-label="Places without a location">` on desktop, collapses to `<details>` sheet on narrow viewports; renders groups per day with keyboard-reachable "Set location for <name> (day N)" buttons; renders the empty-tray state when no unlocated places remain.
- [ ] T028 [US2] Add the drop-mode / edit-mode state machine to `MapPanel.tsx` (per `data-model.md §3` `MapInteractionState` + `contracts/map-view-controls.md §4–5`): cursor hint, `role="status"` live announcement, next map click calls `boardStore.setCoordinates(placeId, {lat, lng})`, Escape cancels, Edit-mode disables the tray with `aria-disabled`.
- [ ] T029 [US2] Add the "Edit location" button to the pin popup in `MapViewClient.tsx` that transitions to `editLocationFor` and reuses the same click-handler path as drop-mode so there is a single write surface to `setCoordinates`.

**Checkpoint**: US2 is independently demoable — Scenarios 8–11 in `quickstart.md` all pass.

---

## Phase 5: User Story 3 — See the shape of each day (Priority: P3)

**Goal**: An optional "Show day routes" toggle draws straight-line polylines between each day's located places in order, in that day's color, and shows a cumulative straight-line distance per day. Days with fewer than two located places draw nothing (no error).

**Independent Test**: On a trip with multiple located places per day, toggle "Show day routes" on; see one line per day connecting its places in order with the day's color and a per-day distance total; toggle off; lines disappear. Filtering to a single day leaves only that day's route and pins. A day with only one located place draws no line.

### Tests for User Story 3

- [ ] T030 [P] [US3] Unit test `tests/unit/distance.test.ts` for `haversine({lat,lng}, {lat,lng}): number` (kilometers): known fixtures (e.g. London↔Paris ≈ 344 km ± 1); zero when identical; symmetric; handles poles and the ±180° meridian.
- [ ] T031 [P] [US3] Extend `tests/unit/map-viewmodel.test.ts` with route projection: day with ≥ 2 located places yields a polyline + distance total; day with 0 or 1 located places yields no polyline; day filter correctly scopes polyline output.

### Implementation for User Story 3

- [ ] T032 [US3] Implement `lib/map/distance.ts` exporting `haversine(a, b): number` (kilometers, WGS84 approximation) and `routeTotal(points): number` summing consecutive haversine segments.
- [ ] T033 [US3] Add a "Show day routes" toggle to `MapPanel.tsx` and render `<Polyline>` per day inside `MapViewClient.tsx` using the day's palette color; render per-day distance in the legend (locale-aware units via `Intl.NumberFormat` where available, kilometers otherwise).

**Checkpoint**: US3 is independently demoable — Scenario 14 and the US3 subset of Scenario 15 in `quickstart.md` pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Close out the FRs not pinned to a single user story, finalize ADRs, and run the full quickstart.

- [ ] T034 [P] Fill in `docs/adr/ADR-0005-react-leaflet-map-library.md` and `docs/adr/ADR-0006-carto-basemaps-tiles.md` with the Context/Decision/Consequences prose derived from `research.md §R1`/`§R2`; link each to this feature's `plan.md`.
- [ ] T035 [P] Add a short "Map view" section to `README.md`: what the view does, that the tile provider is CARTO (no key required), the first-visit disclosure, and the 50-place soft cap note (FR-018). Mention the two new ADRs.
- [ ] T036 Implement the tile-failure fallback in `MapPanel.tsx` (FR-015): after 3 consecutive tile request errors within 10 s, swap the map canvas for an accessible `<ul>` grouped by day listing every pin's name + category + day; tray + disclosure state unchanged. Add integration test `tests/integration/tile-failure-fallback.test.tsx` driving the error threshold.
- [ ] T037 Implement the 50-place soft-cap banner UI in `MapPanel.tsx` (FR-018 / SC-002) — `role="status"`, dismissible per-session, no filtering of places. (Viewmodel flag already covered by T019; this task is the UI binding.)
- [ ] T038 Run `pnpm typecheck && pnpm lint && pnpm test && pnpm test:a11y && pnpm test:e2e && pnpm build` from a clean checkout; fix any regression; land all fixes in follow-up tasks or amended tasks above.
- [ ] T039 Walk through all 15 scenarios in `quickstart.md` manually in a real browser; file any gaps as new tasks under this phase and resolve before marking the feature done.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies; T001 must land before any test or dynamic import can resolve `leaflet` / `react-leaflet`.
- **Foundational (Phase 2)**: depends on Phase 1. Blocks every `[US*]` task.
- **US1 (Phase 3)**: depends on Foundational. Delivers MVP.
- **US2 (Phase 4)**: depends on Foundational. Can run in parallel with US3 if staffed; sequential P1 → P2 → P3 is the default solo path.
- **US3 (Phase 5)**: depends on Foundational.
- **Polish (Phase 6)**: depends on whichever user stories are being shipped.

### Within each user story

- Tests (`T014`–`T018`, `T025`–`T026`, `T030`–`T031`) MUST be authored and FAIL before the matching implementation tasks are started.
- Within US1: `T019` (viewmodel) comes before any component that reads from it; `T022` (MapViewClient) before `T023` (MapPanel) before `T024` (page toggle).
- Within US2: `T027` and `T028` can be written side-by-side but share `MapPanel.tsx`, so merge sequentially; `T029` depends on `T028`'s state machine.

### Parallel Opportunities

- Phase 1: `T002` and `T003` are independent `[P]` ADR stubs.
- Phase 2: `T005`, `T006`, `T007`, `T008`, `T010`, `T012`, `T013` are all `[P]` (different files). `T004` and `T009` touch shared files and are not `[P]`. `T011` depends on `T006`.
- Phase 3 tests: `T014`–`T017` are all `[P]`; `T018` is a Playwright test that boots dev — don't co-run with other e2e.
- Phase 5 tests: `T030` is `[P]`; `T031` edits an existing file created in T014 so it is not `[P]` with T014 and T019.
- Phase 6: `T034` and `T035` are `[P]` (docs only).

### Parallel example — Foundational phase

```bash
# After T001 lands, these can be worked in parallel:
Task: "T005 Create coord-merge helper (lib/domain/coord-merge.ts)"
Task: "T006 Add setCoordinates board-op (lib/domain/board-ops.ts)"
Task: "T007 Unit test coord-merge (tests/unit/coord-merge.test.ts)"
Task: "T008 Unit test set-coordinates (tests/unit/set-coordinates.test.ts)"
Task: "T012 Map config module (lib/map/config.ts)"
Task: "T013 Tile-disclosure hook (lib/hooks/useTileProviderDisclosure.ts)"
```

### Parallel example — US1 tests

```bash
# Can all run concurrently (different files, no shared state):
Task: "T014 Viewmodel unit tests (tests/unit/map-viewmodel.test.ts)"
Task: "T015 MapPanel integration test (tests/integration/map-panel.test.tsx)"
Task: "T016 Tile-disclosure gating test (tests/integration/tile-disclosure.test.tsx)"
Task: "T017 Map panel a11y test (tests/a11y/map-panel.a11y.test.tsx)"
```

---

## Implementation Strategy

### MVP first (US1 only)

1. Complete Phase 1 (3 tasks).
2. Complete Phase 2 (10 tasks). **Checkpoint** — all unit tests green.
3. Complete Phase 3 (US1, 11 tasks). **STOP and VALIDATE**: Scenarios 1–7 in `quickstart.md`. This is the demoable MVP.

### Incremental delivery

1. Setup + Foundational → foundation ready.
2. US1 → test → **MVP shipped** (demo on branch).
3. US2 → test → trips with missing coords are now repairable.
4. US3 → test → polish/visual.
5. Polish phase → ADRs, README, tile-failure fallback, soft-cap banner UI, full quickstart.

### Parallel team strategy

With two developers after Phase 2 completes:
- Dev A: US1 (MVP), then US3.
- Dev B: US2.
- Both converge on Phase 6 polish.

---

## Notes

- `[P]` = different files, no incomplete dependencies.
- `[US*]` labels map each task to a user story for traceability.
- Each user story is independently completable, testable, and shippable.
- Verify every test task fails before writing its implementation task.
- Commit after each task or logical group (follow `.claude/memory/reviewable-diffs-workflow`).
- Constitutional gates (typecheck + lint + test + axe + build) must stay green at every checkpoint, not just at the end.
- Explicit non-goals (do not add tasks for these): turn-by-turn navigation, offline maps, real-time location, address-search geocoding, pin clustering, multi-trip overlays.
