import { expect, test } from "@playwright/test";

test("keeps the story header in the primary brand color", async ({ page }) => {
  await page.goto("/story");

  await expect(page.locator(".story-page-header")).toHaveCSS(
    "background-color",
    "rgb(1, 45, 204)",
  );
});

test("matches gallery indicators to slide states and opens an image modal", async ({
  page,
}) => {
  await page.goto("/story");

  const galleries = page.locator(".story-gallery");
  await expect(galleries).toHaveCount(5);

  const expectedIndicatorCounts = [0, 2, 5, 7, 2];
  for (let index = 0; index < expectedIndicatorCounts.length; index += 1) {
    await expect(
      galleries.nth(index).locator(".story-gallery-controls button"),
    ).toHaveCount(expectedIndicatorCounts[index]);
  }

  const firstImage = page
    .locator(".story-gallery-image-button")
    .first();
  await firstImage.scrollIntoViewIfNeeded();
  await firstImage.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").locator(".story-gallery-modal-image"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đóng" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
