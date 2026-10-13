import { test, expect } from "@playwright/test";

// A valid, schema-shaped trip: Day 1 has "Alpha", Day 2 is empty.
const TRIP = {
  id: "trip-kbd",
  title: "Lisbon",
  destination: "Lisbon",
  source: "manual",
  preferences: null,
  createdAt: "2026-10-13T00:00:00.000Z",
  updatedAt: "2026-10-13T00:00:00.000Z",
  days: [
    {
      id: "day-1",
      index: 0,
      label: "Day 1",
      date: null,
      places: [
        {
          id: "place-alpha",
          name: "Alpha",
          description: "",
          category: "food",
          dayPart: "morning",
          order: 0,
          cost: null,
          coordinates: null,
          accessibility: null,
        },
      ],
    },
    { id: "day-2", index: 1, label: "Day 2", date: null, places: [] },
  ],
};

test("a card can be moved across days using the keyboard-accessible controls", async ({ page }) => {
  await page.addInitScript((trip) => {
    localStorage.setItem("roam-board:trips", JSON.stringify([trip]));
  }, TRIP);

  await page.goto("/trips/trip-kbd");

  // Alpha starts in Day 1.
  await expect(page.getByRole("region", { name: "Day 1" }).getByRole("heading", { name: "Alpha" })).toBeVisible();

  // Move it to Day 2 via the accessible select (operable by keyboard alone).
  await page.getByLabel(/move Alpha to another day/i).selectOption({ label: "Day 2" });

  // Alpha is now in Day 2.
  await expect(page.getByRole("region", { name: "Day 2" }).getByRole("heading", { name: "Alpha" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Day 1" }).getByRole("heading", { name: "Alpha" })).toHaveCount(0);
});
