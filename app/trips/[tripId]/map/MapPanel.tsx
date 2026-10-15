"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useBoardStore } from "@/lib/store/board-store";
import { useTileProviderDisclosure } from "@/lib/hooks/use-tile-provider-disclosure";
import { MAP_SOFT_CAP } from "@/lib/map/config";
import { TileProviderDisclosure } from "./TileProviderDisclosure";
import { DayFilterChips } from "./DayFilter";
import { useMapViewModel, type DayFilter } from "./useMapViewModel";
import type { MapViewClientProps } from "./MapViewClient";

/**
 * Dynamic-import the Leaflet-touching client ONLY — keeps Leaflet (~150 KB
 * gzipped) and its CSS off any route that doesn't open the Map view, and
 * keeps `window`-touching code out of SSR entirely.
 */
const MapViewClient = dynamic<MapViewClientProps>(
  () => import("./MapViewClient").then((m) => m.MapViewClient),
  { ssr: false, loading: () => <MapViewSkeleton /> },
);

export function MapPanel({ tripId }: { tripId: string }) {
  const trip = useBoardStore((s) => s.currentTrip);
  const activeTrip = trip && trip.id === tripId ? trip : null;

  const [filter, setFilter] = React.useState<DayFilter>({ kind: "all" });
  const [activePinId, setActivePinId] = React.useState<string | null>(null);
  const [editTargetPinId, setEditTargetPinId] = React.useState<string | null>(null);
  const [capBannerDismissed, setCapBannerDismissed] = React.useState(false);

  const vm = useMapViewModel(activeTrip, filter);
  const disclosure = useTileProviderDisclosure();

  // US2 (drop/edit) handlers are implemented in Phase 4; for US1 they are no-ops.
  const noOpDrop = React.useCallback(() => {}, []);

  const showCapBanner = vm.showCapBanner && !capBannerDismissed;

  return (
    <section
      aria-label="Trip map"
      className="flex flex-col gap-3"
      data-testid="map-panel"
    >
      {showCapBanner && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
          style={{
            background: "var(--muted)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          <span>
            This trip has more than {MAP_SOFT_CAP} located places. The map still
            shows every one, but it may feel slower than usual.
          </span>
          <button
            type="button"
            onClick={() => setCapBannerDismissed(true)}
            className="shrink-0 rounded border px-2 py-1 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            Dismiss
          </button>
        </div>
      )}

      <DayFilterChips legend={vm.legend} filter={filter} onChange={setFilter} />

      <div
        className="relative overflow-hidden rounded-md border"
        style={{ borderColor: "var(--border)", height: "min(70vh, 560px)" }}
      >
        {disclosure.acknowledged ? (
          vm.pins.length === 0 && vm.unlocated.length === 0 ? (
            <EmptyState kind="no-places" />
          ) : vm.pins.length === 0 ? (
            <EmptyState kind="no-coords" />
          ) : (
            <MapViewClient
              pins={vm.pins}
              bounds={vm.bounds}
              activePinId={activePinId}
              onPinSelect={setActivePinId}
              dropMode={null}
              onDropLocation={noOpDrop}
              editTargetPinId={editTargetPinId}
              onRequestEdit={setEditTargetPinId}
            />
          )
        ) : (
          <>
            <MapViewSkeleton />
            <TileProviderDisclosure onDismiss={disclosure.acknowledge} />
          </>
        )}
      </div>

      <ScreenReaderSummary
        totalLocated={vm.totalLocated}
        totalPlaces={vm.totalPlaces}
        filter={filter}
        legend={vm.legend}
        pins={vm.pins}
      />
    </section>
  );
}

/**
 * Visually-hidden, screen-reader live summary (Feature 002 FR-012).
 * Also used as the FR-015 fallback when tile loading fails — just elevate
 * from sr-only to visible then (handled in Phase 6).
 */
function ScreenReaderSummary({
  totalLocated,
  totalPlaces,
  filter,
  legend,
  pins,
}: {
  totalLocated: number;
  totalPlaces: number;
  filter: DayFilter;
  legend: ReturnType<typeof useMapViewModel>["legend"];
  pins: ReturnType<typeof useMapViewModel>["pins"];
}) {
  const scope =
    filter.kind === "single"
      ? legend.find((l) => l.dayId === filter.dayId)?.label ?? "selected day"
      : "all days";
  return (
    <ul className="sr-only" aria-live="polite" aria-label="Map summary">
      <li>
        Trip map showing {totalLocated} of {totalPlaces} places with a saved
        location, scoped to {scope}.
      </li>
      {legend.map((d) => (
        <li key={d.dayId}>
          {d.label}: {d.count} place{d.count === 1 ? "" : "s"} mapped.
        </li>
      ))}
      {pins.map((p) => (
        <li key={p.placeId}>
          {p.name}, {p.category}, Day {p.dayIndex + 1}.
        </li>
      ))}
    </ul>
  );
}

function MapViewSkeleton() {
  return (
    <div
      aria-hidden
      className="h-full w-full animate-pulse"
      style={{ background: "var(--muted)" }}
    />
  );
}

function EmptyState({ kind }: { kind: "no-places" | "no-coords" }) {
  const title =
    kind === "no-places" ? "This trip has no places yet." : "No places have a location yet.";
  const body =
    kind === "no-places"
      ? "Add places from the Board view, then come back here to see them on the map."
      : "Open the Board to add coordinates, or use the tray (next slice) to drop pins on the map.";
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center"
      style={{ color: "var(--muted-foreground)" }}
    >
      <strong style={{ color: "var(--foreground)" }}>{title}</strong>
      <p className="max-w-sm text-sm">{body}</p>
    </div>
  );
}
