import type { Day } from "@/lib/domain/schema";
import { PlaceCard } from "./PlaceCard";

/** Read-only presentational column for one day (Foundational T017). */
export function DayColumn({ day }: { day: Day }) {
  return (
    <section
      aria-label={day.label}
      className="w-72 shrink-0 rounded-lg border p-3"
      style={{ borderColor: "var(--border)", background: "var(--muted)" }}
    >
      <h2 className="mb-2 text-sm font-semibold">{day.label}</h2>
      <ul className="flex flex-col gap-2" aria-label={`Activities for ${day.label}`}>
        {day.places.length === 0 ? (
          <li className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            No activities yet.
          </li>
        ) : (
          day.places.map((place) => (
            <li key={place.id}>
              <PlaceCard place={place} />
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
