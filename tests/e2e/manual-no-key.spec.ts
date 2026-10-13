import { test, expect } from "@playwright/test";

test("a traveler can build a trip manually with no API key", async ({ page }) => {
  // No settings set → no API key configured.
  await page.goto("/");

  await page.getByLabel(/city or place/i).fill("Porto");
  await page.getByLabel(/number of days/i).fill("2");
  await page.getByRole("button", { name: /start blank trip/i }).click();

  // Board for the new manual trip.
  await expect(page.getByRole("heading", { name: "Porto" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Day 1" })).toBeVisible();

  // Add an activity by hand.
  await page
    .getByRole("region", { name: "Day 1" })
    .getByRole("button", { name: /add activity/i })
    .click();

  await expect(
    page.getByRole("region", { name: "Day 1" }).getByRole("heading", { name: "New activity" }),
  ).toBeVisible();
});
