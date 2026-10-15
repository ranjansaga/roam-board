# ADR-0006: CARTO raster basemaps for Trip Map tiles

- **Status**: Accepted
- **Date**: 2026-10-15

## Context

The Trip Map view (Feature 002) needs raster map tiles. The default OSM tile servers
(`tile.openstreetmap.org`) are explicitly **not** for third-party apps per the OSM
Foundation tile usage policy, so using them — even for a portfolio demo — is incorrect.
Keyed providers (Mapbox, MapTiler, Stadia) would introduce a secret or a user-held key
and violate the keyless intent of FR-010 / FR-011 (Constitution V).

See the full option matrix in [research.md §R2](../../specs/002-trip-map-view/research.md#r2-tile-source).

## Decision

Use **CARTO raster basemaps** served from `https://{s}.basemaps.cartocdn.com/...`,
Positron (light) and Dark Matter (dark). Free for non-commercial use, no API key,
standard OSM-plus-CARTO attribution.

## Consequences

- Zero secrets in client bundles; zero additional user-held keys (FR-011 trivially
  met).
- Positron / Dark Matter are muted, high-contrast tile themes that keep day-colored
  pins legible (helps SC-004 contrast).
- Attribution ("© OpenStreetMap contributors, © CARTO") is required and surfaced
  via Leaflet's built-in `L.control.attribution` (FR-020). The control is persistent,
  non-dismissible, and keyboard-reachable.
- On the first visit to the Map view we show a one-time dismissible disclosure
  explaining that opening the map sends the user's IP to CARTO (FR-019, SC-008).
  No tile request fires before dismissal.
- If CARTO's free terms change, swapping to another keyless source
  (e.g. OpenFreeMap vector + MapLibre) is a one-file change in `lib/map/config.ts`.
