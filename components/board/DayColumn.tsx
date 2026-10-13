"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { MAX_ITEMS_PER_DAY, type Day } from "@/lib/domain/schema";
import { useBoardStore } from "@/lib/store/board-store";
import { Button } from "@/components/ui/primitives";
import { PlaceCard } from "./PlaceCard";

export function DayColumn({ day, days, canRemove }: { day: Day; days: Day[]; canRemove: boolean }) {
  const addPlace = useBoardStore((s) => s.addPlace);
  const removeDay = useBoardStore((s) => s.removeDay);
  const { setNodeRef, isOver } = useDroppable({ id: day.id });
  const full = day.places.length >= MAX_ITEMS_PER_DAY;

  return (
    <section
      aria-label={day.label}
      className="w-72 shrink-0 rounded-lg border p-3"
      style={{ borderColor: isOver ? "var(--ring)" : "var(--border)", background: "var(--muted)" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{day.label}</h2>
        {canRemove ? (
          <button
            type="button"
            aria-label={`Remove ${day.label}`}
            onClick={() => removeDay(day.id)}
            className="rounded px-1 text-xs"
            style={{ color: "var(--danger)" }}
          >
            Remove
          </button>
        ) : null}
      </div>

      <SortableContext items={day.places.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-12 flex-col gap-2" aria-label={`Activities for ${day.label}`}>
          {day.places.length === 0 ? (
            <li className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              No activities yet.
            </li>
          ) : (
            day.places.map((p) => <PlaceCard key={p.id} place={p} day={day} days={days} />)
          )}
        </ul>
      </SortableContext>

      <Button
        type="button"
        variant="ghost"
        className="mt-2 w-full text-xs"
        disabled={full}
        onClick={() => addPlace(day.id)}
      >
        {full ? "Day full (6 max)" : "+ Add activity"}
      </Button>
    </section>
  );
}
