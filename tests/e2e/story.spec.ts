import { expect, test } from "@playwright/test";

test("shows every story image without cropping at its natural aspect ratio", async ({
  page,
}) => {
  await page.goto("/story");

  const photos = page.locator(".photo-grid-item img");
  await expect(photos).toHaveCount(17);

  const ratios = [];

  for (let index = 0; index < (await photos.count()); index += 1) {
    const photo = photos.nth(index);
    await photo.scrollIntoViewIfNeeded();
    await expect
      .poll(() => photo.evaluate((image) => (image as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);

    ratios.push(
      await photo.evaluate((image) => {
        const storyPhoto = image as HTMLImageElement;
        const bounds = storyPhoto.getBoundingClientRect();
        const itemBounds = storyPhoto
          .closest(".photo-grid-item")
          ?.getBoundingClientRect();

        return {
          alt: storyPhoto.alt,
          natural: storyPhoto.naturalWidth / storyPhoto.naturalHeight,
          rendered: bounds.width / bounds.height,
          imageBounds: bounds.toJSON(),
          itemBounds: itemBounds?.toJSON(),
        };
      }),
    );
  }

  for (const ratio of ratios) {
    expect(
      Math.abs(ratio.rendered - ratio.natural),
      `${ratio.alt} should keep its natural aspect ratio`,
    ).toBeLessThan(0.01);

    expect(ratio.itemBounds).toBeDefined();
    expect(ratio.imageBounds.left).toBeGreaterThanOrEqual(
      ratio.itemBounds?.left ?? 0,
    );
    expect(ratio.imageBounds.right).toBeLessThanOrEqual(
      ratio.itemBounds?.right ?? 0,
    );
    expect(ratio.imageBounds.top).toBeGreaterThanOrEqual(
      ratio.itemBounds?.top ?? 0,
    );
    expect(ratio.imageBounds.bottom).toBeLessThanOrEqual(
      ratio.itemBounds?.bottom ?? 0,
    );
  }

  const teamPhoto = ratios.find(({ alt }) => alt.includes("Đội hình"));
  expect(teamPhoto).toBeDefined();
  expect(teamPhoto!.imageBounds.width / teamPhoto!.itemBounds!.width).toBeGreaterThan(
    0.95,
  );

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
