"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { TRIP_MAX_DAYS, type Trip } from "@/lib/domain/schema";
import { useBoardStore } from "@/lib/store/board-store";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { Button } from "@/components/ui/primitives";
import { DayColumn } from "./DayColumn";

export function KanbanBoard({ trip }: { trip: Trip }) {
  const moveCard = useBoardStore((s) => s.moveCard);
  const addDay = useBoardStore((s) => s.addDay);
  const reduced = useReducedMotion();
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const nameOf = (id: string | null): string => {
    for (const d of trip.days) {
      const p = d.places.find((pp) => pp.id === id);
      if (p) return p.name;
    }
    return "";
  };

  const locate = (overId: string): { dayId: string; index: number } | null => {
    const dayMatch = trip.days.find((d) => d.id === overId);
    if (dayMatch) return { dayId: dayMatch.id, index: dayMatch.places.length };
    for (const d of trip.days) {
      const i = d.places.findIndex((p) => p.id === overId);
      if (i >= 0) return { dayId: d.id, index: i };
    }
    return null;
  };

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const target = locate(String(over.id));
    if (target) moveCard(String(active.id), target.dayId, target.index);
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(String(active.id))}.`,
    onDragOver: ({ active, over }) =>
      over ? `${nameOf(String(active.id))} is over ${nameOf(String(over.id)) || "a day"}.` : "",
    onDragEnd: ({ active, over }) =>
      over ? `Moved ${nameOf(String(active.id))}.` : `${nameOf(String(active.id))} returned to its place.`,
    onDragCancel: ({ active }) => `Cancelled moving ${nameOf(String(active.id))}.`,
  };

  const activePlace = activeId
    ? trip.days.flatMap((d) => d.places).find((p) => p.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      accessibility={{ announcements }}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="overflow-x-auto">
        <div
          className="flex items-start gap-4 pb-4"
          role="group"
          aria-label={`Itinerary for ${trip.destination}`}
        >
          {trip.days.map((d) => (
            <DayColumn key={d.id} day={d} days={trip.days} canRemove={trip.days.length > 1} />
          ))}
          {trip.days.length < TRIP_MAX_DAYS ? (
            <Button type="button" variant="ghost" className="mt-1 shrink-0 text-xs" onClick={() => addDay()}>
              + Add day
            </Button>
          ) : null}
        </div>
      </div>

      <DragOverlay dropAnimation={reduced ? null : undefined}>
        {activePlace ? (
          <div
            className="w-64 rounded-md border p-3 text-sm font-medium shadow"
            style={{ borderColor: "var(--ring)", background: "var(--card)" }}
          >
            {activePlace.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
