import type { Trip } from "@/lib/domain/schema";

/** Render a trip as human-readable Markdown-style text for sharing/pasting (FR-030). */
export function tripToText(trip: Trip): string {
  const lines: string[] = [];
  const dayWord = trip.days.length === 1 ? "day" : "days";
  lines.push(`# ${trip.title} — ${trip.days.length} ${dayWord}`);

  for (const day of trip.days) {
    lines.push("");
    lines.push(`## ${day.label}`);
    if (day.places.length === 0) {
      lines.push("_No activities yet._");
      continue;
    }
    for (const place of day.places) {
      const desc = place.description ? ` — ${place.description}` : "";
      lines.push(`- **${place.dayPart}** · ${place.name} (${place.category})${desc}`);
    }
  }

  return lines.join("\n");
}
