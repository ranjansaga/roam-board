import { create } from "zustand";
import type { Trip } from "@/lib/domain/schema";
import { getTripRepository } from "@/lib/persistence/local-storage-repo";

const repo = getTripRepository();

function upsert(trips: Trip[], trip: Trip): Trip[] {
  const without = trips.filter((t) => t.id !== trip.id);
  return [trip, ...without];
}

interface BoardStore {
  trips: Trip[];
  currentTrip: Trip | null;
  storageAvailable: boolean;
  /** Load the full trip list from storage (call on app/home mount). */
  refresh: () => void;
  /** Persist a trip, upsert it into the list, and make it current. */
  saveTrip: (trip: Trip) => void;
  /** Load a trip by id into `currentTrip` (from the current list or storage). */
  openTrip: (id: string) => Trip | null;
  /** Remove a trip from storage and state. */
  removeTrip: (id: string) => void;
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  trips: [],
  currentTrip: null,
  storageAvailable: true,
  refresh: () => set({ trips: repo.list(), storageAvailable: repo.isAvailable() }),
  saveTrip: (trip) => {
    const ok = repo.save(trip);
    set((s) => ({ currentTrip: trip, trips: upsert(s.trips, trip), storageAvailable: ok }));
  },
  openTrip: (id) => {
    const existing = get().trips.find((t) => t.id === id) ?? null;
    const trip = existing ?? repo.get(id);
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
}));
