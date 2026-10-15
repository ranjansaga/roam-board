# Contract: Map view UI controls

**Feature**: 002-trip-map-view | **Scope**: The Map view's interactive surfaces and their keyboard/ARIA contract. Governs FR-002, FR-004, FR-005, FR-007, FR-008, FR-009, FR-012, FR-013, FR-019, FR-020.

Every control below MUST be reachable in tab order, have a visible focus style (reuse the Board view tokens), expose a meaningful accessible name, and honor `prefers-reduced-motion`.

---

## 1. View toggle (Board ↔ Map)

- **Element**: `<div role="tablist">` with two `<button role="tab">` elements ("Board", "Map").
- **Keyboard**: `Tab` focuses the tablist, `ArrowLeft/ArrowRight` moves between tabs, `Enter`/`Space` activates.
- **State**: active tab has `aria-selected="true"`; inactive tab has `aria-selected="false"` and `tabindex="-1"` (roving tabindex).
- **Persistence**: the active tab is **session-only** (component state), not URL. Opening a trip always starts on Board.

## 2. Day filter

- **Element**: a horizontal `<fieldset>` with one radio per day plus "All days".
- **Keyboard**: standard radio-group semantics — `Tab` into the group lands on the selected radio; `ArrowLeft/ArrowRight` moves selection AND focus.
- **ARIA**: `<legend>Day filter</legend>` (visually hidden). Each radio has `aria-label` like "Day 2 of 5, 4 places".
- **Behavior**: selecting a single day triggers `map.setView(dayBounds, { animate: !reducedMotion })` and sets the viewmodel's `DayFilter`. Selecting "All days" clears the filter and fits bounds to all located pins. If no pins exist, the fit is skipped.

## 3. Pin interaction

- **Marker**: Leaflet `Marker` created with `{ keyboard: true, title: "<name> — Day N" }`.
- **Keyboard**: `Tab` reaches each marker in render order; `Enter`/`Space` opens the popup; `Escape` closes it.
- **Popup content**: `name`, `day label`, `description` (if present), category chip, "Edit location" button (FR-009).
- **ARIA**: popup is `role="dialog" aria-label="<name>"`; focus moves into the popup on open and returns to the marker on close.

## 4. "No location set" tray

- **Element**: a right-aligned `<aside aria-label="Places without a location">` on desktop; collapses to a `<details>` sheet on narrow viewports.
- **Content**: one `<button>` per unlocated place, grouped by day. The button's accessible name is "Set location for <place name> (day <N>)".
- **Behavior**: activating a tray button puts the Map view in `dropMode = { placeId }`:
  - Map cursor changes to a crosshair (visual only).
  - A persistent status message announces "Pick a point on the map for <place name>" via a `role="status"` live region.
  - The next primary click/tap or `Enter` on a focused map area calls `boardStore.setCoordinates(placeId, { lat, lng })` and exits drop mode.
  - `Escape` cancels drop mode without saving.
- **Empty tray state**: tray is still rendered but shows "All places have a location."

## 5. Edit location mode (pin popup)

- Entering edit mode from a pin popup disables the tray (dimmed, `aria-disabled`) and shows the same crosshair + status message as drop mode, scoped to that place.
- Confirming overwrites `coordinates`; cancelling keeps the previous value.
- Pins are **never** draggable (prevents accidental moves — spec Edge Cases).

## 6. Tile-provider disclosure modal (SC-008)

- **Element**: `<div role="dialog" aria-modal="true" aria-labelledby="tiles-title">` rendered as a focus trap when `disclosureAcknowledged === false`.
- **Content**: tile-provider name, one-sentence privacy note (IP sent to provider on each tile), one-sentence note about dropped points (sent only to fetch surrounding tiles), two buttons: **Dismiss** (primary) and **Learn more** (link to in-app Settings page section).
- **Behavior**: `MapViewClient` is NOT mounted while the modal is open — no tile network request fires until Dismiss is clicked. The dismissal timestamp is written to `localStorage["roam-board.map.tile-disclosure.v1"]`.
- **Re-show**: a Settings control (out of scope UI; the hook exists) can clear the flag, which causes the modal to re-render the next time the Map view opens.

## 7. Attribution footer (FR-020)

- Standard Leaflet `L.control.attribution()` placed bottom-right, with text that includes "© OpenStreetMap contributors" and the tile provider's required credit.
- Attribution is always visible, non-dismissible, keyboard-reachable, and does not overlap pins at any zoom level the viewmodel targets.

## 8. Empty / failure states

- **Empty state (no located pins)**: Map view renders a muted empty basemap centered on `(0, 0)` at zoom 2 and an inline card "No places have a location yet — add some from the tray below."
- **Tile load failure**: After 3 consecutive tile request failures within 10 s, the Map view swaps the map canvas for an accessible `<ul>` grouped by day, listing every pin's name + category + day. The tray and disclosure state remain unchanged. (FR-015)

## 9. Reduced-motion contract

Every change of map center, zoom, or marker transition MUST pass through a single `applyView(latLng, zoom)` wrapper that selects between `map.setView(..., { animate: false })` and `map.flyTo(...)` based on the live `prefers-reduced-motion` value. The wrapper is the only place that decides motion; individual event handlers never call Leaflet motion methods directly. (FR-013, SC-005)

## 10. Day colors

- Day index maps to a fixed palette of up to 10 color tokens (defined once in `lib/map/config.ts`).
- Pin color + numeric badge are **both** rendered — never color alone — to satisfy WCAG 2.2 AA for color-blind users (echoes FR-003/FR-012).
- The legend entries use the same color + numeric badge, enabling direct visual lookup.
