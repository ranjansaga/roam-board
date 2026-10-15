import { useMemo } from "react";
import type { Place, PlaceCategory, Trip } from "@/lib/domain/schema";
import { boundsFor, colorForDay, MAP_SOFT_CAP, type Bounds } from "@/lib/map/config";

export type DayFilter = { kind: "all" } | { kind: "single"; dayId: string };

export interface MapPin {
  placeId: string;
  dayId: string;
  dayIndex: number;
  name: string;
  description: string;
  category: PlaceCategory;
  coord: { lat: number; lng: number };
  colorToken: string;
}

export interface UnlocatedPlace {
  placeId: string;
  dayId: string;
  dayIndex: number;
  dayLabel: string;
  name: string;
}

export interface DayLegend {
  dayId: string;
  dayIndex: number;
  label: string;
  count: number;
  colorToken: string;
}

export interface MapViewModel {
  pins: MapPin[];
  unlocated: UnlocatedPlace[];
  legend: DayLegend[];
  bounds: Bounds | null;
  totalLocated: number;
  totalPlaces: number;
  showCapBanner: boolean;
}

interface PinWithPlace extends MapPin {
  __place: Place;
}

/**
 * Pure derivation from a Trip + DayFilter to the Map view's rendering model.
 * Called inside components with `useMemo` wrapping so it is cheap and
 * deterministic. See data-model.md §3 and research.md §R10.
 */
export function deriveMapViewModel(trip: Trip | null, filter: DayFilter): MapViewModel {
  if (!trip) {
    return {
      pins: [],
      unlocated: [],
      legend: [],
      bounds: null,
      totalLocated: 0,
      totalPlaces: 0,
      showCapBanner: false,
    };
  }
  const allPins: PinWithPlace[] = [];
  const unlocated: UnlocatedPlace[] = [];
  const legend: DayLegend[] = [];
  let totalPlaces = 0;

  for (const day of trip.days) {
    const colorToken = colorForDay(day.index);
    let dayLocated = 0;
    for (const place of day.places) {
      totalPlaces += 1;
      if (place.coordinates) {
        dayLocated += 1;
        allPins.push({
          placeId: place.id,
          dayId: day.id,
          dayIndex: day.index,
          name: place.name,
          description: place.description,
          category: place.category,
          coord: place.coordinates,
          colorToken,
          __place: place,
        });
      } else {
        unlocated.push({
          placeId: place.id,
          dayId: day.id,
          dayIndex: day.index,
          dayLabel: day.label,
          name: place.name,
        });
      }
    }
    legend.push({
      dayId: day.id,
      dayIndex: day.index,
      label: day.label,
      count: dayLocated,
      colorToken,
    });
  }

  const totalLocated = allPins.length;
  const filteredPins =
    filter.kind === "single"
      ? allPins.filter((p) => p.dayId === filter.dayId)
      : allPins;

  const pins: MapPin[] = filteredPins.map((p) => {
    // Strip the internal __place reference before returning the public shape.
    const { __place, ...pin } = p;
    void __place;
    return pin;
  });
  const bounds = boundsFor(filteredPins.map((p) => p.coord));
  const showCapBanner = totalLocated > MAP_SOFT_CAP;

  return {
    pins,
    unlocated,
    legend,
    bounds,
    totalLocated,
    totalPlaces,
    showCapBanner,
  };
}

/**
 * React hook wrapping {@link deriveMapViewModel} with `useMemo` so repeated
 * renders with the same inputs are free.
 */
export function useMapViewModel(trip: Trip | null, filter: DayFilter): MapViewModel {
  return useMemo(() => deriveMapViewModel(trip, filter), [trip, filter]);
}
