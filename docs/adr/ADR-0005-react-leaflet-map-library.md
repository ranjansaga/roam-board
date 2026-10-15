# ADR-0005: react-leaflet for the Trip Map view

- **Status**: Accepted
- **Date**: 2026-10-15

## Context

Feature 002 (Trip Map View) needs an interactive map that pins every located place
in a trip, supports pan/zoom, keyboard-reachable markers, popups, and polylines, and
honors `prefers-reduced-motion`. It must be BYOK-consistent with the rest of the app
(no additional user-provided or paid API key — Constitution V, FR-010, FR-011).

See the full option matrix in [research.md §R1](../../specs/002-trip-map-view/research.md#r1-map-library).

## Decision

Use **react-leaflet 5** (built on Leaflet 1.9.4), loaded in a Next.js client component
via `next/dynamic(..., { ssr: false })` so Leaflet's `window`-touching code never runs
on the server and does not ship to bundles that don't open the Map view.

## Consequences

- No API key, no account, no per-request fee. Works offline-of-provider for development.
- React 19-compatible (v5 line).
- Marker keyboard focus is first-class via Leaflet's `keyboard: true` option; combined
  with a parallel SR-visible `<ul aria-live="polite">` summary we meet WCAG 2.2 AA
  without duplicating UX.
- Leaflet's gesture animations are controlled by three init flags
  (`zoomAnimation`, `fadeAnimation`, `markerZoomAnimation`); programmatic motion flows
  through a single `applyView(latLng, zoom)` wrapper so reduced-motion is enforced in
  exactly one place.
- Leaflet is ~150 kB gzipped; the dynamic-import boundary keeps it out of the Board
  bundle.
- If vector-tile polish becomes a priority later, migrating to MapLibre GL is a
  one-component swap — the viewmodel, store action, and contracts stay the same.
