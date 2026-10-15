import { create } from "zustand";
import type { Trip } from "@/lib/domain/schema";
import {
  addDay as opAddDay,
  addPlace as opAddPlace,
  deletePlace as opDeletePlace,
  moveCard as opMoveCard,
  removeDay as opRemoveDay,
  setCoordinates as opSetCoordinates,
  updatePlace as opUpdatePlace,
  type NewPlace,
  type PlaceEdit,
} from "@/lib/domain/board-ops";
import type { Place } from "@/lib/domain/schema";
import { getTripRepository } from "@/lib/persistence/local-storage-repo";

const repo = getTripRepository();

function upsert(trips: Trip[], trip: Trip): Trip[] {
  return [trip, ...trips.filter((t) => t.id !== trip.id)];
}

interface BoardStore {
  trips: Trip[];
  currentTrip: Trip | null;
  storageAvailable: boolean;
  refresh: () => void;
  saveTrip: (trip: Trip) => void;
  openTrip: (id: string) => Trip | null;
  removeTrip: (id: string) => void;
  // Editing (US2) — each persists and updates state.
  addPlace: (dayId: string, input?: Partial<NewPlace>) => void;
  updatePlace: (placeId: string, patch: PlaceEdit) => void;
  deletePlace: (placeId: string) => void;
  moveCard: (placeId: string, targetDayId: string, targetIndex: number) => void;
  addDay: () => void;
  removeDay: (dayId: string) => void;
  setCoordinates: (placeId: string, coords: Place["coordinates"]) => void;
}

export const useBoardStore = create<BoardStore>((set, get) => {
  /** Apply a pure board operation to the current trip, persist it, and update state. */
  const apply = (op: (trip: Trip) => Trip) => {
    const current = get().currentTrip;
    if (!current) return;
    const next = op(current);
    if (next === current) return; // no-op (e.g. cap reached) — avoid a redundant write
    const ok = repo.save(next);
    set((s) => ({ currentTrip: next, trips: upsert(s.trips, next), storageAvailable: ok }));
  };

  return {
    trips: [],
    currentTrip: null,
    storageAvailable: true,
    refresh: () => set({ trips: repo.list(), storageAvailable: repo.isAvailable() }),
    saveTrip: (trip) => {
      const ok = repo.save(trip);
      set((s) => ({ currentTrip: trip, trips: upsert(s.trips, trip), storageAvailable: ok }));
    },
    openTrip: (id) => {
      const trip = get().trips.find((t) => t.id === id) ?? repo.get(id);
      set({ currentTrip: trip });
      return trip;
    },
    removeTrip: (id) => {
      repo.delete(id);
      set((s) => ({
        trips: s.trips.filter((t) => t.id !== id),
        currentTrip: s.currentTrip?.id === id ? null : s.currentTrip,
      }));
    },
    addPlace: (dayId, input) => apply((t) => opAddPlace(t, dayId, input)),
    updatePlace: (placeId, patch) => apply((t) => opUpdatePlace(t, placeId, patch)),
    deletePlace: (placeId) => apply((t) => opDeletePlace(t, placeId)),
    moveCard: (placeId, targetDayId, targetIndex) =>
      apply((t) => opMoveCard(t, placeId, targetDayId, targetIndex)),
    addDay: () => apply((t) => opAddDay(t)),
    removeDay: (dayId) => apply((t) => opRemoveDay(t, dayId)),
    setCoordinates: (placeId, coords) => apply((t) => opSetCoordinates(t, placeId, coords)),
  };
});
