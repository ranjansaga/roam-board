import { describe, it, expect } from "vitest";
import { addDay, addPlace, deletePlace, moveCard, removeDay, updatePlace } from "@/lib/domain/board-ops";
import { emptyTrip } from "@/lib/domain/trip";
import type { Trip } from "@/lib/domain/schema";

const P = { name: "X", description: "", category: "food", dayPart: "morning" } as const;
const seed = (days = 2): Trip => emptyTrip("Test", days);

describe("board-ops", () => {
  it("adds places with contiguous order", () => {
    let t = seed(1);
    const dayId = t.days[0].id;
    t = addPlace(t, dayId, { ...P, name: "A" });
    t = addPlace(t, dayId, { ...P, name: "B" });
    expect(t.days[0].places.map((p) => p.name)).toEqual(["A", "B"]);
    expect(t.days[0].places.map((p) => p.order)).toEqual([0, 1]);
  });

  it("caps a day at 6 places", () => {
    let t = seed(1);
    for (let i = 0; i < 8; i++) t = addPlace(t, t.days[0].id, { ...P, name: `p${i}` });
    expect(t.days[0].places).toHaveLength(6);
  });

  it("updates a place", () => {
    let t = seed(1);
    t = addPlace(t, t.days[0].id, { ...P, name: "A" });
    t = updatePlace(t, t.days[0].places[0].id, { name: "Renamed", category: "culture" });
    expect(t.days[0].places[0].name).toBe("Renamed");
    expect(t.days[0].places[0].category).toBe("culture");
  });

  it("deletes a place and re-normalizes order", () => {
    let t = seed(1);
    const dayId = t.days[0].id;
    t = addPlace(t, dayId, { ...P, name: "A" });
    t = addPlace(t, dayId, { ...P, name: "B" });
    t = deletePlace(t, t.days[0].places[0].id);
    expect(t.days[0].places.map((p) => p.name)).toEqual(["B"]);
    expect(t.days[0].places[0].order).toBe(0);
  });

  it("reorders within a day", () => {
    let t = seed(1);
    const dayId = t.days[0].id;
    t = addPlace(t, dayId, { ...P, name: "A" });
    t = addPlace(t, dayId, { ...P, name: "B" });
    t = moveCard(t, t.days[0].places[1].id, dayId, 0);
    expect(t.days[0].places.map((p) => p.name)).toEqual(["B", "A"]);
  });

  it("moves a place across days", () => {
    let t = seed(2);
    t = addPlace(t, t.days[0].id, { ...P, name: "A" });
    t = moveCard(t, t.days[0].places[0].id, t.days[1].id, 0);
    expect(t.days[0].places).toHaveLength(0);
    expect(t.days[1].places.map((p) => p.name)).toEqual(["A"]);
  });

  it("rejects a cross-day move into a full day (returns trip unchanged)", () => {
    let t = seed(2);
    for (let i = 0; i < 6; i++) t = addPlace(t, t.days[1].id, { ...P, name: `b${i}` });
    t = addPlace(t, t.days[0].id, { ...P, name: "A" });
    const before = t;
    const after = moveCard(t, t.days[0].places[0].id, t.days[1].id, 0);
    expect(after).toBe(before);
  });

  it("adds/removes days with contiguous labels", () => {
    let t = seed(2);
    t = addDay(t);
    expect(t.days.map((d) => d.label)).toEqual(["Day 1", "Day 2", "Day 3"]);
    t = removeDay(t, t.days[1].id);
    expect(t.days.map((d) => d.label)).toEqual(["Day 1", "Day 2"]);
  });

  it("won't remove the last day or exceed 7 days", () => {
    const one = seed(1);
    expect(removeDay(one, one.days[0].id)).toBe(one);
    const seven = seed(7);
    expect(addDay(seven)).toBe(seven);
  });
});
