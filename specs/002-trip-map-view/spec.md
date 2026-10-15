# Feature Specification: Trip Map View

**Feature Branch**: `002-trip-map-view`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Feature 003 Map / Navigation. Add an interactive map view to a trip that visualises the Places on each Day. Users should be able to switch between the existing Kanban board and a Map view, see all places pinned, filter by day, and get a sense of travel between stops. Must stay BYOK-consistent with the rest of the app (prefer no additional API key where possible). The domain already has `Place.coordinates` as a nullable field; part of this feature is deciding how coords get populated (AI-generated during itinerary creation, user-entered, or client-side geocoding) and handling places that still have none. Must be accessible (keyboard nav, screen-reader summary of pins) and respect reduced-motion. Non-goals for now: turn-by-turn navigation, offline maps, real-time location."

## Clarifications

### Session 2026-10-15

- Q: When a traveler regenerates a trip after already setting/correcting locations by hand, what happens to those manual coordinates? → A: Manual coords win — surviving places keep their manual coords; AI fills coords only for new or still-null places.
- Q: Should the Map view enforce a maximum number of places per trip, and if so, roughly what cap? → A: ~50 places as a soft cap — Map still renders everything, but a non-blocking banner warns the traveler; SC-002's render-time target is only guaranteed up to this cap.
- Q: Must the app show a one-time in-app disclosure that interacting with the map sends the traveler's IP (and chosen points) to a third-party tile provider? → A: Yes — show a one-time dismissible in-app disclosure in the Map view the first time it is opened, naming the tile provider; persist dismissal locally.
- Q: When a traveler adds a place manually (Feature 001 US2), should the dialog offer a "Pick on map" step or should the place always land in the "No location set" tray? → A: Tray-only — every manually-added place lands in the "No location set" tray; location is set later from the Map view. Add-Place dialog is unchanged.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See my trip on a map (Priority: P1)

A traveler who has just generated (or opened) a trip switches from the Kanban board to a Map view and sees every place in the itinerary pinned on an interactive map, color- or number-coded by day. They can pan, zoom, click a pin to see which place and day it belongs to, and filter the pins by a single day or view all days together. From this one glance they can judge whether the itinerary makes geographic sense ("Day 2 is on the other side of town — maybe I should resequence").

**Why this priority**: This is the whole point of the feature. A map view with no coordinates has no value, so this slice must also include populating coordinates for AI-generated places (the common case). It is the demo moment that justifies the feature.

**Independent Test**: Generate a new trip (or open an existing one from storage) that has at least two days with multiple places. Open the Map view. Confirm every place with a resolvable location appears as a pin on the map, is identifiable as belonging to its day, and that opening/closing a pin surfaces the place's name and day. Confirm the board/map toggle works both ways without data loss.

**Acceptance Scenarios**:

1. **Given** a newly generated trip with places that have coordinates, **When** the traveler opens the Map view, **Then** every place with coordinates appears as a pin, grouped visually by day.
2. **Given** the traveler is on the Map view, **When** they select a single day from a day filter, **Then** only that day's pins are shown and the map auto-fits to those pins.
3. **Given** the traveler is on the Map view, **When** they click or activate a pin via keyboard, **Then** a popup shows the place's name, the day it belongs to, and any notes.
4. **Given** the traveler is on the Map view, **When** they switch back to the Board view, **Then** the board shows the same trip in its last state (no edits lost, selection preserved where applicable).
5. **Given** `prefers-reduced-motion` is set, **When** the map pans or zooms (programmatically or by filter changes), **Then** animations are instant rather than animated.

---

### User Story 2 - Fix or add a place's location (Priority: P2)

Some places arrive without coordinates — either the AI couldn't resolve them, or the traveler added the place manually (Feature 001 US2). The traveler sees those places listed in a dedicated "No location set" tray on the Map view, picks one, and sets its location by dropping a pin on the map. The place then appears on the map alongside the rest.

**Why this priority**: Without this, any trip with unresolved places shows an incomplete map and the traveler has no way to repair it. Still P2 because US1 demonstrates value for the happy path on its own and this is a repair flow.

**Independent Test**: Open a trip that includes at least one place with no coordinates. Confirm the Map view lists it in a "No location set" tray and does not render it as a pin. Pick the place, drop a pin on the map, confirm the place now appears pinned and is removed from the tray, and that the location persists after reloading the page.

**Acceptance Scenarios**:

1. **Given** a trip has places without coordinates, **When** the traveler opens the Map view, **Then** those places are listed in a clearly labeled "No location set" tray, not silently dropped.
2. **Given** the traveler selects an unlocated place, **When** they confirm a point on the map, **Then** that place is saved with those coordinates and immediately appears as a pin.
3. **Given** the traveler sets a location for a place, **When** they reload or reopen the trip later, **Then** the location is still saved.
4. **Given** the traveler wants to correct a wrong AI-provided coordinate, **When** they open a pin's popup, **Then** they can enter an "Edit location" mode and drop a new point to overwrite it.

---

### User Story 3 - See the shape of each day (Priority: P3)

The traveler toggles a "Show day routes" option and sees a simple line connecting the places of each day in order, so a sprawling day stands out from a compact one at a glance. The visualization is straight lines in day order (not road-routed turn-by-turn directions) and includes a small summary of the day's cumulative straight-line distance.

**Why this priority**: This adds polish and portfolio-level visual payoff but is additive — the map is useful without it. Deferred so the first two slices can ship and be validated.

**Independent Test**: On a trip with multiple places per day, toggle "Show day routes" and confirm each day's places are connected by a visible line in the correct order with day-distinct color/number. Confirm the day summary shows a reasonable straight-line distance total. Toggle it off and confirm the lines disappear.

**Acceptance Scenarios**:

1. **Given** a trip is open on the Map view, **When** the traveler toggles "Show day routes" on, **Then** each day's places are connected by a polyline in day order using the day's color/number.
2. **Given** routes are shown, **When** the traveler filters to a single day, **Then** only that day's route and pins remain visible.
3. **Given** routes are shown, **When** a day has fewer than two located places, **Then** no line is drawn for that day (no error).

---

### Edge Cases

- A trip has **zero places with coordinates** → the Map view shows an empty-state message and (if the tray applies) lists all places as unlocated; the map still renders a sensible default view.
- A trip has **a single place with coordinates** → the map centers on that one pin at a reasonable zoom; no polyline is drawn.
- **All of a day's places are unlocated** → the day appears in the day filter but shows no pins for that day; the day filter communicates "no mapped places this day."
- The traveler **drags a pin accidentally** → pins are not draggable unless the traveler explicitly enters "Edit location" mode for that place.
- The map is used on a **narrow mobile viewport** → the day filter and "No location set" tray collapse into dismissible sheets so the map remains the primary surface.
- **Browser denies network access or map tiles fail to load** → a plain fallback renders the pins and the "No location set" tray in an accessible list form, so the trip is still navigable.
- The traveler is on **the Board view when a place loses its coordinates** (e.g., re-generation replaces the trip) → nothing visible changes on the board; the Map view surfaces the places in the tray next time it is opened.
- **Regeneration conflict**: a place with manually-set coordinates survives regeneration but the AI returns different coordinates for the same place identity → the manual coordinates MUST be kept (see FR-006a) and the AI's alternative silently discarded.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The trip view MUST offer a user-facing toggle between the existing Board view and a new Map view, with keyboard-operable controls and visible focus states.
- **FR-002**: The Map view MUST render every place of the current trip that has coordinates as a distinct pin on an interactive map, with pan and zoom support.
- **FR-003**: Pins MUST be visually distinguishable by the day they belong to (color and/or numeric label), and a legend MUST explain the mapping.
- **FR-004**: Each pin MUST expose, on click or keyboard activation, the place's name, day, and notes (if any).
- **FR-005**: The Map view MUST provide a day filter that supports "All days" and selecting any single day; selecting a single day MUST auto-fit the map viewport to that day's pins.
- **FR-006**: The AI itinerary generator (Feature 001 boundary) MUST request and validate coordinates for each place it returns, and MUST tolerate places where the model cannot provide coordinates (coordinates remain null for those places; the trip still saves).
- **FR-006a**: On trip regeneration, any place that survives the regeneration (same place identity) and already has manually-set coordinates MUST retain those manual coordinates; AI-provided coordinates MUST only populate places that are newly added by the regeneration or that still have null coordinates. The regeneration flow MUST visibly communicate this behavior to the traveler (e.g., a confirmation or post-regeneration note) so lost expectations do not surprise them.
- **FR-007**: Places without coordinates MUST appear in a clearly labeled, keyboard-accessible "No location set" tray inside the Map view, never silently dropped.
- **FR-007a**: Places added via the Feature 001 "Add place" dialog MUST always be created with null coordinates (no in-dialog location picker is added by this feature) and MUST therefore appear in the "No location set" tray on the next Map-view open. The Add-Place dialog itself remains unchanged by this feature.
- **FR-008**: The traveler MUST be able to set coordinates for an unlocated place by selecting it and confirming a point on the map; the saved coordinates MUST persist with the rest of the trip (same storage path).
- **FR-009**: The traveler MUST be able to correct an existing place's coordinates via an explicit "Edit location" affordance on the pin's popup; pins MUST NOT move by accidental drag.
- **FR-010**: The Map view MUST operate without requiring any additional user-provided API key beyond what Feature 001 requires (AI BYOK), using map tiles and any geolocation lookup from sources that are free for this app's scale.
- **FR-011**: No secret or paid-service key for map tiles, geocoding, or routing may appear in client-side bundles; if any such service is used, it MUST be reached through a server-side boundary consistent with the existing AI boundary.
- **FR-012**: The Map view MUST meet WCAG 2.2 AA requirements: full keyboard operability (tab to toggle, filter, tray, pins, and location-edit controls), visible focus, meaningful ARIA labels for pins, and a screen-reader-accessible textual summary of what the map currently shows (e.g., "Day 2: 4 places, centered on Ubud").
- **FR-013**: All map motion (pan, zoom, auto-fit on filter) MUST honor `prefers-reduced-motion` and apply changes instantly when it is set.
- **FR-014**: When no pin is in view (empty trip, all days filtered away, or all places unlocated), the Map view MUST show an informative empty state rather than a blank map.
- **FR-015**: If map tiles fail to load, the Map view MUST degrade to a readable list of pins (grouped by day) and the "No location set" tray, so the trip remains navigable.
- **FR-016**: *(US3 only)* An optional "Show day routes" control MUST connect each day's located places in day order with a straight-line polyline rendered in the day's color; days with fewer than two located places MUST NOT draw a line.
- **FR-017**: *(US3 only)* The day-routes mode MUST display each day's cumulative straight-line distance in a legend or day summary, in the traveler's locale units where available.
- **FR-018**: The Map view MUST render all places of the current trip regardless of count, but when a trip exceeds **50 located places** the Map view MUST display a non-blocking banner informing the traveler that performance targets (SC-002) are not guaranteed above this soft cap. No places are hidden or dropped; the cap is informational only.
- **FR-019**: The first time a traveler opens the Map view in a given browser, the Map view MUST present a dismissible disclosure that: (a) names the third-party map-tile provider in use, (b) explains that opening the Map view sends the traveler's IP address to that provider on each tile request, and (c) notes that any location points the traveler drops are sent to that provider only to the extent needed to fetch surrounding tiles. The disclosure's dismissal MUST persist locally so the traveler is not re-prompted on subsequent sessions on the same browser; a mechanism to re-show it (e.g., a Settings link) MUST be available.
- **FR-020**: The Map view MUST display a persistent attribution for the map-tile provider as required by that provider's terms of use (standard practice for open tile sources).

### Key Entities *(include if feature involves data)*

- **Trip, Day, Place**: Unchanged from Feature 001. The feature consumes the existing `Place.coordinates` field (nullable `{lat, lng}`); no schema migration is required.
- **MapViewState (ephemeral, per-session)**: What the Map view is currently showing — selected day filter, routes-visible toggle, selected pin, and whether the "edit location" mode is active for a given place. Does not persist across reloads; only `Place.coordinates` changes persist.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a freshly AI-generated 3-day trip, at least **90% of places** arrive with usable coordinates (plotted on the correct continent/city with no coordinate validation errors), without any additional user action.
- **SC-002**: For trips at or below the **50-place soft cap** (FR-018), a traveler can switch from Board to Map and see all pins rendered in **under 2 seconds** on a typical consumer laptop with warm cache.
- **SC-003**: A traveler can locate an unlocated place and save its coordinates in **under 30 seconds**, including opening the tray, selecting the place, dropping the pin, and confirming.
- **SC-004**: **100%** of Map view controls — view toggle, day filter, pin activation, location-edit, "No location set" tray — are reachable and operable by keyboard alone, with a visible focus indicator at each step.
- **SC-005**: With `prefers-reduced-motion` set, **zero** map pan/zoom transitions animate — all state changes apply instantly.
- **SC-006**: The feature ships with **no new client-side exposure of any secret or paid API key** and no new mandatory user-provided key beyond Feature 001's AI key.
- **SC-008**: On the first visit to the Map view in a fresh browser, **100%** of travelers see the third-party-tile disclosure before any map tile is fetched (verified by an integration test that asserts no tile network request fires until the disclosure is either dismissed or acknowledged).
- **SC-007**: Automated accessibility checks (axe) report **zero new violations** on the trip page with the Map view active.

## Assumptions

- **Coordinate source for AI-generated places**: The AI itinerary boundary already returns structured JSON validated by a schema; this feature extends that schema to include an optional `{lat, lng}` per place. The model is expected to supply coordinates for well-known places; when it cannot, the place is saved with null coordinates and surfaces in the "No location set" tray.
- **Coordinate source for user-added or unresolved places**: In this feature's scope, the traveler sets coordinates by **dropping a point on the map** from the "No location set" tray. The Feature 001 Add-Place dialog is deliberately **not** extended with a map picker or geocoding — manually-added places always arrive with null coordinates and are located later via the Map view. Full address-search geocoding is out of scope; it is a reasonable follow-up because it is additive and requires an external service decision.
- **Routing is straight-line, not road-routed**: US3 draws straight polylines between the day's places in order. Real road routing (and travel-time estimates) would require a routing service and is out of scope; the straight-line distance is sufficient to communicate the "shape of a day."
- **Map tiles**: An open, free-at-this-app's-scale raster tile source is sufficient (consistent with FR-010/FR-011). The specific tile source is a plan-stage choice, not a spec constraint, but the choice must not require an additional user-held key.
- **Device scope**: Target is modern desktop and modern mobile browsers (same as Feature 001). Native mobile apps and offline maps are out of scope.
- **Non-goals** (restated from input, binding): turn-by-turn navigation, offline maps, real-time user location, multi-trip overlays, and inter-day transit (flights/trains) rendering.
- **Trip storage**: Reuses the existing Zustand + persistence stack from Feature 001; no new storage mechanism is introduced for coordinates.
