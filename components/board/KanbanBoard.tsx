import type { Trip } from "@/lib/domain/schema";
import { DayColumn } from "./DayColumn";

/** Read-only presentational Kanban board (Foundational T017). Interaction is added in US2. */
export function KanbanBoard({ trip }: { trip: Trip }) {
  return (
    <div className="overflow-x-auto">
      <div
        className="flex gap-4 pb-4"
        role="list"
        aria-label={`Itinerary for ${trip.destination}`}
      >
        {trip.days.map((day) => (
          <div role="listitem" key={day.id}>
            <DayColumn day={day} />
          </div>
        ))}
      </div>
    </div>
  );
}
