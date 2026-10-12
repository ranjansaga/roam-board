import { z } from "zod";
import { TripSchema, type Trip } from "@/lib/domain/schema";
import type { TripRepository } from "./trip-repository";

const STORAGE_KEY = "roam-board:trips";
const TripsSchema = z.array(TripSchema);

/**
 * localStorage-backed TripRepository. Every access is guarded so the app stays usable
 * when storage is unavailable (private browsing, quota, SSR). See ADR-0004.
 */
export class LocalStorageTripRepository implements TripRepository {
  private read(): Trip[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = TripsSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : [];
    } catch {
      return [];
    }
  }

  private write(trips: Trip[]): boolean {
    if (typeof window === "undefined") return false;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
      return true;
    } catch {
      return false;
    }
  }

  list(): Trip[] {
    return [...this.read()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  get(id: string): Trip | null {
    return this.read().find((t) => t.id === id) ?? null;
  }

  save(trip: Trip): boolean {
    const trips = this.read();
    const i = trips.findIndex((t) => t.id === trip.id);
    if (i >= 0) trips[i] = trip;
    else trips.push(trip);
    return this.write(trips);
  }

  delete(id: string): boolean {
    return this.write(this.read().filter((t) => t.id !== id));
  }

  isAvailable(): boolean {
    if (typeof window === "undefined") return false;
    try {
      const probe = "roam-board:__probe";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }
}

let singleton: TripRepository | null = null;
export function getTripRepository(): TripRepository {
  return (singleton ??= new LocalStorageTripRepository());
}
