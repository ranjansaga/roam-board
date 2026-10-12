# ADR-0004: localStorage behind a TripRepository interface

- **Status**: Accepted
- **Date**: 2026-10-12

## Context

v1 is local-first with no accounts and no server storage of trips. Trips must survive reloads and
support multiple saved trips.

## Decision

Persist trips in the browser's **localStorage**, accessed only through a **`TripRepository`**
interface. All callers depend on the interface, never on `localStorage` directly. Every access is
wrapped in try/catch with a "may not persist" warning when storage is unavailable.

## Consequences

- Simplest thing that works for small JSON trips (Principle VII).
- Swapping to IndexedDB later is a one-file change behind the interface, no caller changes (Principle II).
- Per-device/per-browser only; cross-device movement is via explicit export/import.
