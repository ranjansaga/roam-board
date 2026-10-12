import type { Place } from "@/lib/domain/schema";

/** Read-only presentational card for a place/activity (Foundational T017). */
export function PlaceCard({ place }: { place: Place }) {
  return (
    <article
      className="rounded-md border p-3"
      style={{ borderColor: "var(--border)", background: "var(--card)" }}
      aria-label={`${place.name} — ${place.category}, ${place.dayPart}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium">{place.name}</h3>
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-xs capitalize"
          style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
        >
          {place.category}
        </span>
      </div>
      {place.description ? (
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          {place.description}
        </p>
      ) : null}
      <p className="mt-1 text-xs capitalize" style={{ color: "var(--muted-foreground)" }}>
        {place.dayPart}
      </p>
    </article>
  );
}
