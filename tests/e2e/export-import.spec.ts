import { test, expect } from "@playwright/test";

const backup = {
  schemaVersion: 1,
  exportedAt: "2026-10-13T00:00:00.000Z",
  app: "roam-board",
  trip: {
    id: "x",
    title: "Kyoto",
    destination: "Kyoto",
    source: "manual",
    preferences: null,
    createdAt: "2026-10-13T00:00:00.000Z",
    updatedAt: "2026-10-13T00:00:00.000Z",
    days: [
      {
        id: "d1",
        index: 0,
        label: "Day 1",
        date: null,
        places: [
          {
            id: "p1",
            name: "Fushimi Inari",
            description: "Shrine",
            category: "culture",
            dayPart: "morning",
            order: 0,
            cost: null,
            coordinates: null,
            accessibility: null,
          },
        ],
      },
    ],
  },
};

test("importing a backup file opens the trip", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel(/import a trip backup file/i).setInputFiles({
    name: "kyoto.roamboard.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });

  await expect(page.getByRole("heading", { name: "Kyoto" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fushimi Inari" })).toBeVisible();
});
