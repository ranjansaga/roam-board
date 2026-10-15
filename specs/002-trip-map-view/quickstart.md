# Quickstart: Validate the Trip Map View

**Feature**: 002-trip-map-view | **Date**: 2026-10-15

A runnable, 15-step validation guide. Finish these and the feature's user-visible promises (US1, US2, US3) and non-functional gates (a11y, reduced-motion, privacy disclosure, soft cap) are proven. For contract-level detail see `./contracts/`; for data shapes see `./data-model.md`.

---

## Prerequisites

- Node 20+, pnpm installed.
- A valid Gemini API key for the BYOK flow (set in Settings or via `GEMINI_API_KEY` in `.env.local`).
- Branch `002-trip-map-view` checked out.
- `pnpm install` run after this feature's new deps (`leaflet`, `react-leaflet`, `@types/leaflet`) are added to `package.json`.

## Setup commands

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test               # vitest unit + integration + a11y
pnpm test:e2e           # Playwright (brings up next dev; needs Chromium)
pnpm dev                # http://localhost:3000
```

All five commands MUST exit 0 before marking the feature done.

---

## Validation scenarios

Each scenario names the user story (US) or success criterion (SC) it proves. Running them in order is fine; most are independent.

### 1. First visit — tile-provider disclosure (SC-008, FR-019)

1. Open a fresh browser profile at `http://localhost:3000`.
2. Open any existing trip (or generate one). Click the "Map" tab.
3. **Expect**: a modal explaining the tile provider appears; the map area is NOT visible yet; the browser Network panel shows **zero** `basemaps.cartocdn.com` requests.
4. Click "Dismiss". The modal closes, the map renders, tile requests fire.
5. Reload the page, re-open the Map view.
6. **Expect**: the modal does **not** re-appear; map renders immediately.

### 2. Map renders every located pin, by day (US1 / FR-002 / FR-003)

1. Generate a trip ("Bali, 3 days, interests: temples, food").
2. Open the Map view.
3. **Expect**: every place that got AI-provided coordinates appears as a numbered + color-coded pin; the legend lists each day with the matching color + number; the day filter shows "All days" selected.

### 3. Pin popup content (FR-004)

1. Click (or Tab + Enter) on any pin.
2. **Expect**: popup shows place name, day label, description if present, category chip, and an "Edit location" button.
3. Press `Escape`. **Expect**: popup closes, focus returns to the pin.

### 4. Day filter (FR-005)

1. In the day filter, select "Day 2".
2. **Expect**: only Day 2 pins remain; the map auto-fits to those pins.
3. Select "All days". **Expect**: all pins return and the map fits all bounds.

### 5. Board ↔ Map toggle (US1 acceptance #4)

1. On the Map view with Day 2 filtered, click "Board".
2. **Expect**: Board renders unmodified — no lost edits, no selection drift.
3. Click "Map". **Expect**: the Map view starts fresh at "All days" (filter is session-only, not URL-persisted).

### 6. Keyboard-only navigation (SC-004 / FR-012)

1. From the trip page, press `Tab` repeatedly.
2. **Expect**: focus order is: view toggle → day filter → tray → first pin → ... → last pin → attribution. Each step shows a visible focus ring.
3. All controls can be activated with `Enter`/`Space`.

### 7. Screen-reader summary (FR-012)

1. Enable VoiceOver (macOS) or NVDA (Windows).
2. Open Map view.
3. **Expect**: the SR reads the viewmodel summary, e.g. "Trip map, 15 places on 3 days, Day 1 Ubud 4 places, Day 2 Seminyak 6 places, Day 3 Nusa Dua 5 places."

### 8. "No location set" tray (US2 / FR-007)

1. Open a trip that has at least one unlocated place (either generated without coords or added manually via the Board).
2. **Expect**: the tray lists each unlocated place grouped by day with a "Set location" button; the pin for that place is NOT on the map.

### 9. Manually-added places always land in the tray (FR-007a)

1. On the Board view, use "Add place" and create a new place on Day 1.
2. Switch to the Map view.
3. **Expect**: the Add-Place dialog is unchanged (no map picker); the new place appears in the "No location set" tray; no pin on the map yet.

### 10. Drop pin to set location, persist across reload (US2 / FR-008)

1. In the tray, click "Set location" on an unlocated place.
2. **Expect**: live-region status message announces the drop-mode; cursor turns to a crosshair.
3. Click any point on the map.
4. **Expect**: a new pin appears at that point in the correct day color/number; the tray entry disappears.
5. Reload the page. Re-open Map view.
6. **Expect**: the pin is still there (coordinates persisted via localStorage repo).

### 11. Edit a pin's location (FR-009)

1. Open any pin's popup; click "Edit location".
2. Pick a new point on the map.
3. **Expect**: the pin moves to the new location; next reload confirms persistence.
4. Try to drag a pin directly without entering edit mode. **Expect**: the pin does not move.

### 12. Reduced motion (SC-005 / FR-013)

1. Enable OS-level "Reduce motion".
2. Open the Map view and change the day filter.
3. **Expect**: the map snaps to the new view instantly — no pan/zoom animation. Pin popup open/close is also instant.

### 13. Empty / failure states (Edge Cases / FR-015)

1. Open a trip where **every** place has null coordinates.
2. **Expect**: the Map view shows an empty basemap and an inline card prompting the traveler to set locations from the tray.
3. Block `basemaps.cartocdn.com` in the browser (DevTools → Network → Block request domain). Reload the Map view.
4. **Expect**: after a short backoff the map area is replaced by an accessible list of pins grouped by day; the tray still works; no uncaught errors in the console.

### 14. 50-place soft cap banner (FR-018)

1. In the test suite, construct a trip with 51 located places and call `useMapViewModel` directly.
2. **Expect**: `showCapBanner === true`, `pins.length === 51` (no filtering).
3. (Manual check is not required because the Feature-001 hard cap is 42; the test is the proof.)

### 15. Automated gates (SC-007 / Constitution VI)

```bash
pnpm test                     # 0 failures
pnpm test:a11y                # 0 axe violations
pnpm test:e2e                 # all pass
pnpm build                    # succeeds
```

**Expect**: all four commands exit 0. If `pnpm test:a11y` reports new violations on the trip page with Map view active, SC-007 is **not** met and the feature is not shippable.

---

## Done When

- Scenarios 1–15 all pass locally with no manual workarounds.
- `research.md` is up to date with any mid-build decision changes.
- Two ADRs (`ADR-0005`, `ADR-0006`) exist and are committed.
- The spec's checklist (`checklists/requirements.md`) still shows 16/16 items passing.
