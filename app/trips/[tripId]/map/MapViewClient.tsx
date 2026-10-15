"use client";

import * as React from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap,
  useMapEvent,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import {
  TILE_ATTRIBUTION_HTML,
  TILE_MAX_ZOOM,
  TILE_URL_LIGHT,
  type Bounds,
} from "@/lib/map/config";
import type { MapPin } from "./useMapViewModel";

export interface MapViewClientProps {
  pins: readonly MapPin[];
  bounds: Bounds | null;
  /** Pin currently selected (popup open). */
  activePinId: string | null;
  onPinSelect: (placeId: string | null) => void;
  /** When set, the next click on the map calls onDropLocation. */
  dropMode: { placeId: string } | null;
  onDropLocation: (coord: { lat: number; lng: number }) => void;
  /** Pin ids whose "Edit location" affordance should appear in the popup. */
  editTargetPinId: string | null;
  onRequestEdit: (placeId: string | null) => void;
  /** Optional US3 overlay — straight-line routes per day in day order. */
  dayRoutes?: readonly { dayId: string; color: string; coords: [number, number][] }[];
}

/**
 * Thin react-leaflet host (Feature 002 FR-002/FR-003/FR-004/FR-013).
 *
 * MUST be loaded via next/dynamic({ ssr: false }) so Leaflet (which touches
 * window at import time) stays out of the server bundle and the Board route
 * bundle. All motion flows through the single applyView wrapper so reduced-
 * motion is enforced in one place.
 */
export function MapViewClient({
  pins,
  bounds,
  activePinId,
  onPinSelect,
  dropMode,
  onDropLocation,
  editTargetPinId,
  onRequestEdit,
  dayRoutes,
}: MapViewClientProps) {
  const reduced = useReducedMotion();
  const initial = React.useMemo<{ center: [number, number]; zoom: number }>(() => {
    if (bounds) {
      const [[s, w], [n, e]] = bounds;
      return { center: [(s + n) / 2, (w + e) / 2], zoom: 10 };
    }
    return { center: [0, 0], zoom: 2 };
  }, [bounds]);

  return (
    <MapContainer
      center={initial.center}
      zoom={initial.zoom}
      zoomAnimation={!reduced}
      fadeAnimation={!reduced}
      markerZoomAnimation={!reduced}
      scrollWheelZoom
      style={{ height: "100%", width: "100%", minHeight: 320 }}
      attributionControl={true}
      aria-label="Trip map"
    >
      <TileLayer
        url={TILE_URL_LIGHT}
        attribution={TILE_ATTRIBUTION_HTML}
        maxZoom={TILE_MAX_ZOOM}
      />
      <AutoFit bounds={bounds} reduced={reduced} />
      <DropModeHandler dropMode={dropMode} onDropLocation={onDropLocation} />
      {pins.map((pin) => (
        <Marker
          key={pin.placeId}
          position={[pin.coord.lat, pin.coord.lng]}
          draggable={false}
          keyboard
          icon={buildPinIcon(pin.colorToken, pin.dayIndex + 1)}
          title={`${pin.name} — Day ${pin.dayIndex + 1}`}
          eventHandlers={{
            click: () => onPinSelect(pin.placeId),
            keypress: () => onPinSelect(pin.placeId),
            popupclose: () => {
              if (activePinId === pin.placeId) onPinSelect(null);
              if (editTargetPinId === pin.placeId) onRequestEdit(null);
            },
          }}
        >
          <Popup>
            <div className="flex max-w-[220px] flex-col gap-1 text-sm">
              <strong>{pin.name}</strong>
              <span style={{ color: "var(--muted-foreground)" }}>
                Day {pin.dayIndex + 1} · {pin.category}
              </span>
              {pin.description && <p className="m-0 text-xs">{pin.description}</p>}
              <button
                type="button"
                onClick={() => onRequestEdit(pin.placeId)}
                className="mt-1 self-start rounded border px-2 py-1 text-xs font-medium"
                style={{
                  background: "var(--card)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {editTargetPinId === pin.placeId
                  ? "Click the map to confirm"
                  : "Edit location"}
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
      {dayRoutes?.map((r) => (
        <Polyline
          key={r.dayId}
          positions={r.coords}
          pathOptions={{ color: r.color, weight: 3, opacity: 0.75 }}
        />
      ))}
    </MapContainer>
  );
}

/**
 * Build a divIcon showing the day's color and a numeric badge. Numeric badge
 * ensures color-blind users can still distinguish days (FR-003 / FR-012).
 */
function buildPinIcon(color: string, dayNumber: number): L.DivIcon {
  const html = `
    <span class="roam-pin" style="--pin:${color};">
      <span class="roam-pin__badge">${dayNumber}</span>
    </span>`;
  return L.divIcon({
    html,
    className: "roam-pin-wrap",
    iconSize: [28, 36],
    iconAnchor: [14, 32],
    popupAnchor: [0, -28],
  });
}

/**
 * Internal: fit the map to new bounds via a single applyView wrapper so the
 * reduced-motion decision lives in exactly one place (FR-013 / SC-005).
 */
function AutoFit({ bounds, reduced }: { bounds: Bounds | null; reduced: boolean }) {
  const map = useMap();
  React.useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds as L.LatLngBoundsExpression, {
      padding: [24, 24],
      maxZoom: 15,
      animate: !reduced,
    });
  }, [map, bounds, reduced]);
  return null;
}

/**
 * Internal: when dropMode is active, the next click on the map calls back with
 * the point. Right-click and other inputs are ignored.
 */
function DropModeHandler({
  dropMode,
  onDropLocation,
}: {
  dropMode: { placeId: string } | null;
  onDropLocation: (coord: { lat: number; lng: number }) => void;
}) {
  useMapEvent("click", (e) => {
    if (!dropMode) return;
    onDropLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
  });
  return null;
}
