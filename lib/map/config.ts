/**
 * Map view configuration (Feature 002, ADR-0006).
 *
 * CARTO raster basemaps — no API key, free for non-commercial use, standard
 * OSM-plus-CARTO attribution. All consumers of this module MUST surface
 * {@link TILE_ATTRIBUTION_HTML} as a persistent, non-dismissible attribution
 * (FR-020) and gate the first tile request on the disclosure modal (FR-019,
 * SC-008).
 */

export const TILE_PROVIDER_NAME = "CARTO (OpenStreetMap)";

export const TILE_URL_LIGHT =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

export const TILE_URL_DARK =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

/** Max native zoom supported by CARTO raster tiles. */
export const TILE_MAX_ZOOM = 20;

/**
 * Attribution HTML string — fulfils OpenStreetMap and CARTO terms of use.
 * Surfaced via Leaflet's built-in `L.control.attribution` (FR-020).
 */
export const TILE_ATTRIBUTION_HTML =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>';

export interface LatLng {
  lat: number;
  lng: number;
}

export type Bounds = [[number, number], [number, number]];

/**
 * Compute Leaflet-style [[southLat, westLng], [northLat, eastLng]] bounds for a
 * set of coordinates, or `null` if the set is empty. Single-point input returns
 * a degenerate box the caller can expand with its own padding/zoom.
 */
export function boundsFor(points: readonly LatLng[]): Bounds | null {
  if (points.length === 0) return null;
  let south = points[0].lat;
  let north = points[0].lat;
  let west = points[0].lng;
  let east = points[0].lng;
  for (const p of points) {
    if (p.lat < south) south = p.lat;
    if (p.lat > north) north = p.lat;
    if (p.lng < west) west = p.lng;
    if (p.lng > east) east = p.lng;
  }
  return [
    [south, west],
    [north, east],
  ];
}

/**
 * Up to 10 day colors — paired at the call site with a numeric badge, never
 * color-alone (WCAG 2.2 AA for color-blind users, FR-003/FR-012). Hex strings
 * chosen for ≥ 4.5:1 contrast on both CARTO Positron and Dark Matter tiles.
 */
export const DAY_COLORS: readonly string[] = [
  "#2563eb", // blue-600
  "#dc2626", // red-600
  "#16a34a", // green-600
  "#ca8a04", // yellow-600
  "#9333ea", // purple-600
  "#0891b2", // cyan-600
  "#ea580c", // orange-600
  "#db2777", // pink-600
  "#4f46e5", // indigo-600
  "#059669", // emerald-600
];

/** Color for a day. Wraps modulo DAY_COLORS.length to tolerate more than 10 days. */
export function colorForDay(dayIndex: number): string {
  if (!Number.isFinite(dayIndex) || dayIndex < 0) return DAY_COLORS[0];
  return DAY_COLORS[dayIndex % DAY_COLORS.length];
}

/**
 * Soft cap of located places per trip (FR-018). Above this count the Map view
 * still renders every place but shows a non-blocking banner — performance
 * target SC-002 is not guaranteed above the cap.
 */
export const MAP_SOFT_CAP = 50;
