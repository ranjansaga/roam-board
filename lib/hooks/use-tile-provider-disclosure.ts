"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Local-storage key for the first-visit tile-provider disclosure (Feature 002
 * FR-019). Value is an ISO-8601 timestamp of dismissal, or absent if never
 * dismissed. Versioned so a future terms change can force a re-prompt by
 * bumping the suffix.
 */
export const DISCLOSURE_STORAGE_KEY = "roam-board.map.tile-disclosure.v1";

type Subscriber = () => void;

const subscribers = new Set<Subscriber>();

function notify() {
  for (const s of subscribers) s();
}

function readFlag(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(DISCLOSURE_STORAGE_KEY);
  } catch {
    // Blocked storage (private window, Safari ITP, strict settings) — treat as
    // "not yet dismissed" so the disclosure still appears each session.
    return null;
  }
}

function writeFlag(value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(DISCLOSURE_STORAGE_KEY);
    else window.localStorage.setItem(DISCLOSURE_STORAGE_KEY, value);
  } catch {
    // Swallow — a failed write is non-fatal; the modal just re-appears next
    // session. SC-008's gating happens at render time, not here.
  }
  notify();
}

/**
 * React hook for the tile-provider disclosure gate.
 *
 * `acknowledged` reflects the persisted dismissal state across tabs; call
 * `acknowledge()` on first dismissal; call `reset()` from a Settings control
 * to re-show the modal. Safe when `localStorage` is unavailable: `acknowledged`
 * stays `false` and the writes are swallowed.
 */
export function useTileProviderDisclosure(): {
  acknowledged: boolean;
  acknowledge: () => void;
  reset: () => void;
} {
  const acknowledged = useSyncExternalStore(
    (onChange) => {
      subscribers.add(onChange);
      // Also react to writes from another tab.
      const onStorage = (e: StorageEvent) => {
        if (e.key === null || e.key === DISCLOSURE_STORAGE_KEY) onChange();
      };
      if (typeof window !== "undefined") {
        window.addEventListener("storage", onStorage);
      }
      return () => {
        subscribers.delete(onChange);
        if (typeof window !== "undefined") {
          window.removeEventListener("storage", onStorage);
        }
      };
    },
    () => readFlag() !== null,
    () => false,
  );

  const acknowledge = useCallback(() => {
    writeFlag(new Date().toISOString());
  }, []);
  const reset = useCallback(() => {
    writeFlag(null);
  }, []);

  return { acknowledged, acknowledge, reset };
}
