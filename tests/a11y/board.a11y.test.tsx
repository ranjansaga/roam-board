import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import { emptyTrip } from "@/lib/domain/trip";
import { addPlace } from "@/lib/domain/board-ops";

describe("KanbanBoard accessibility", () => {
  it("has no axe violations with content", async () => {
    let trip = emptyTrip("Lisbon", 2);
    trip = addPlace(trip, trip.days[0].id, {
      name: "Time Out Market",
      description: "A famous food hall.",
      category: "food",
      dayPart: "afternoon",
    });
    const { container } = render(<KanbanBoard trip={trip} />);
    const results = await axe(container);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
