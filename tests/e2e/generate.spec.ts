import { test, expect } from "@playwright/test";

const stubItinerary = {
  itinerary: {
    days: [
      {
        id: "d1",
        index: 0,
        label: "Day 1",
        date: null,
        places: [
          {
            id: "p1",
            name: "Time Out Market",
            description: "A famous Lisbon food hall.",
            category: "food",
            dayPart: "afternoon",
            order: 0,
            cost: null,
            coordinates: null,
            accessibility: null,
          },
        ],
      },
      { id: "d2", index: 1, label: "Day 2", date: null, places: [] },
    ],
  },
  usage: { model: "stub" },
};

test("generating an itinerary renders a board", async ({ page }) => {
  // BYOK key present on-device.
  await page.addInitScript(() => {
    localStorage.setItem(
      "roam-board:settings",
      JSON.stringify({ geminiApiKey: "test-key", model: null, reducedMotion: false }),
    );
  });
  // Stub the AI boundary so the test is deterministic and costs nothing.
  await page.route("**/api/generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(stubItinerary),
    });
  });

  await page.goto("/");
  await page.getByLabel(/destination/i).fill("Lisbon");
  await page.getByLabel(/days/i).fill("2");
  await page.getByRole("button", { name: /generate itinerary/i }).click();

  await expect(page.getByText("Time Out Market")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lisbon" })).toBeVisible();
});
