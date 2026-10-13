"use client";

import * as React from "react";
import Link from "next/link";
import { useBoardStore } from "@/lib/store/board-store";

export function TripList() {
  const trips = useBoardStore((s) => s.trips);
  const refresh = useBoardStore((s) => s.refresh);
  const removeTrip = useBoardStore((s) => s.removeTrip);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  if (trips.length === 0) return null;

  return (
    <section
      aria-label="Your trips"
      className="flex flex-col gap-2 rounded-lg border p-4"
      style={{ borderColor: "var(--border)" }}
    >
      <h2 className="text-sm font-semibold">Your trips</h2>
      <ul className="flex flex-col gap-1">
        {trips.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-2">
            <Link href={`/trips/${t.id}`} className="text-sm underline">
              {t.title} · {t.days.length} {t.days.length === 1 ? "day" : "days"}
            </Link>
            <button
              type="button"
              aria-label={`Delete ${t.title}`}
              onClick={() => removeTrip(t.id)}
              className="text-xs"
              style={{ color: "var(--danger)" }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
