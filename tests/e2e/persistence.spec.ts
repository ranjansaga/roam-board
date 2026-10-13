import { test, expect } from "@playwright/test";

test("trips persist across reload and list multiple", async ({ page }) => {
  await page.goto("/");

  // Create the first trip.
  await page.getByLabel(/city or place/i).fill("Porto");
  await page.getByLabel(/number of days/i).fill("2");
  await page.getByRole("button", { name: /start blank trip/i }).click();
  await expect(page.getByRole("heading", { name: "Porto" })).toBeVisible();

  // Reload → the trip is still there.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Porto" })).toBeVisible();

  // Back home → it shows in the trips list; create a second trip.
  await page.getByRole("link", { name: /new trip/i }).click();
  await expect(page.getByRole("region", { name: "Your trips" }).getByText(/Porto/)).toBeVisible();

  await page.getByLabel(/city or place/i).fill("Madrid");
  await page.getByLabel(/number of days/i).fill("1");
  await page.getByRole("button", { name: /start blank trip/i }).click();
  await expect(page.getByRole("heading", { name: "Madrid" })).toBeVisible();

  // Both trips are listed.
  await page.getByRole("link", { name: /new trip/i }).click();
  const list = page.getByRole("region", { name: "Your trips" });
  await expect(list.getByText(/Porto/)).toBeVisible();
  await expect(list.getByText(/Madrid/)).toBeVisible();
});
