"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import { ShareActions } from "@/components/trip/ShareActions";
import { useBoardStore } from "@/lib/store/board-store";

export default function TripPage() {
  const params = useParams<{ tripId: string }>();
  const id = params.tripId;
  const currentTrip = useBoardStore((s) => s.currentTrip);
  const openTrip = useBoardStore((s) => s.openTrip);
  const [status, setStatus] = React.useState<"loading" | "ready" | "missing">("loading");

  React.useEffect(() => {
    const t = openTrip(id);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reflect the post-mount load result
    setStatus(t ? "ready" : "missing");
  }, [id, openTrip]);

  // Read the trip reactively from the store so edits (add/move/delete) re-render the board.
  const trip = currentTrip && currentTrip.id === id ? currentTrip : null;

  if (status === "loading") {
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{trip.title}</h1>
        <div className="flex items-center gap-3">
          <ShareActions trip={trip} />
          <Link href="/" className="text-sm underline">
            New trip
          </Link>
        </div>
      </div>
      <KanbanBoard trip={trip} />
    </div>
  );
}
