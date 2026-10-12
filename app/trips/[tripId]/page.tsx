"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import { useBoardStore } from "@/lib/store/board-store";
import type { Trip } from "@/lib/domain/schema";

export default function TripPage() {
  const params = useParams<{ tripId: string }>();
  const id = params.tripId;
  const openTrip = useBoardStore((s) => s.openTrip);
  const [state, setState] = React.useState<{ trip: Trip | null; loaded: boolean }>({
    trip: null,
    loaded: false,
  });
  const { trip, loaded } = state;

  React.useEffect(() => {
    // Hydration-safe: the persisted trip can only be read client-side after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ trip: openTrip(id), loaded: true });
  }, [id, openTrip]);

  if (!loaded) {
    return <p>Loading…</p>;
  }

  if (!trip) {
    return (
      <p>
        Trip not found.{" "}
        <Link href="/" className="underline">
          Start a new trip
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{trip.title}</h1>
        <Link href="/" className="text-sm underline">
          New trip
        </Link>
      </div>
      <KanbanBoard trip={trip} />
    </div>
  );
}
