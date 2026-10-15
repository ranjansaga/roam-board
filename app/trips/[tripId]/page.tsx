"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import { ShareActions } from "@/components/trip/ShareActions";
import { useBoardStore } from "@/lib/store/board-store";
import { MapPanel } from "./map/MapPanel";

type ViewTab = "board" | "map";

export default function TripPage() {
  const params = useParams<{ tripId: string }>();
  const id = params.tripId;
  const currentTrip = useBoardStore((s) => s.currentTrip);
  const openTrip = useBoardStore((s) => s.openTrip);
  const [status, setStatus] = React.useState<"loading" | "ready" | "missing">("loading");
  const [view, setView] = React.useState<ViewTab>("board");

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
      <ViewTabs value={view} onChange={setView} />
      {view === "board" ? <KanbanBoard trip={trip} /> : <MapPanel tripId={trip.id} />}
    </div>
  );
}

function ViewTabs({ value, onChange }: { value: ViewTab; onChange: (v: ViewTab) => void }) {
  const tabsRef = React.useRef<HTMLDivElement>(null);

  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    onChange(value === "board" ? "map" : "board");
    const next = e.key === "ArrowLeft" ? (value === "map" ? "board" : "map") : value === "board" ? "map" : "board";
    requestAnimationFrame(() => {
      tabsRef.current?.querySelector<HTMLButtonElement>(`#view-tab-${next}`)?.focus();
    });
  }

  return (
    <div
      role="tablist"
      aria-label="Trip view"
      ref={tabsRef}
      onKeyDown={handleKey}
      className="inline-flex self-start rounded-md border p-0.5"
      style={{ borderColor: "var(--border)", background: "var(--card)" }}
    >
      <TabButton id="view-tab-board" selected={value === "board"} onClick={() => onChange("board")}>
        Board
      </TabButton>
      <TabButton id="view-tab-map" selected={value === "map"} onClick={() => onChange("map")}>
        Map
      </TabButton>
    </div>
  );
}

function TabButton({
  id,
  selected,
  onClick,
  children,
}: {
  id: string;
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onClick}
      className="rounded px-3 py-1.5 text-sm font-medium transition-colors"
      style={{
        background: selected ? "var(--primary)" : "transparent",
        color: selected ? "var(--primary-foreground)" : "var(--foreground)",
      }}
    >
      {children}
    </button>
  );
}
