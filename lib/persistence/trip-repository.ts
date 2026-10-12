import type { Trip } from "@/lib/domain/schema";

/**
 * Persistence boundary for trips. Callers depend ONLY on this interface, never on a
 * concrete storage mechanism — so swapping localStorage for IndexedDB later is a
 * one-file change (Constitution Principles II & VII). See ADR-0004.
 */
export interface TripRepository {
  /** All saved trips (most-recently-updated first). Returns [] if storage is unavailable. */
  list(): Trip[];
  /** One trip by id, or null if missing/unavailable. */
  get(id: string): Trip | null;
  /** Insert or replace a trip. Returns false if it could not be persisted. */
  save(trip: Trip): boolean;
  /** Remove a trip. Returns false if it could not be persisted. */
  delete(id: string): boolean;
  /** Whether durable storage is usable right now (false in private mode / quota-full). */
  isAvailable(): boolean;
}
