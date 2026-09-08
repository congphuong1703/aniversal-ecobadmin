import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

const MAP_URL = "https://maps.app.goo.gl/RuNCYdPkAf9K5uS58";

function workerScope(projectName: string, workerIndex: number) {
  return `pw-${projectName}-${workerIndex}`;
}

async function resetRepository(
  request: APIRequestContext,
  scope: string,
  submissions: unknown[] = [],
) {
  const response = await request.post("/api/test/reset", {
    data: { submissions },
    headers: { "x-e2e-worker-id": scope },
  });

  expect(response.status()).toBe(200);
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function expectDialogWithoutScroll(page: Page) {
  await expect
    .poll(() =>
      page
        .getByRole("dialog")
        .evaluate((dialog) => dialog.scrollHeight <= dialog.clientHeight),
    )
    .toBe(true);
}

async function openRsvp(page: Page) {
  await page.goto("/#rsvp");
  await expect(page.locator(".guest-name-item").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function openConfirmation(page: Page) {
  await openRsvp(page);
  await page.locator(".guest-name-item").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Đúng người, đúng cuộc hẹn." }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

test.beforeEach(async ({ context, request }, testInfo) => {
  const scope = workerScope(testInfo.project.name, testInfo.workerIndex);
  await context.setExtraHTTPHeaders({ "x-e2e-worker-id": scope });
  await resetRepository(request, scope);
});

test("keeps the one-popup confirmation flow visible without modal scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openConfirmation(page);
  await expectDialogWithoutScroll(page);
  await expect(page.getByLabel("Lời nhắn cho EcoBadminton")).toBeVisible();
  await expect(page.getByRole("button", { name: "Tham gia" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hẹn dịp khác" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
});

test("completes an attending RSVP responsively and opens the approved map", async ({
  page,
}, testInfo) => {
  await openConfirmation(page);
  await page
    .getByLabel("Lời nhắn cho EcoBadminton")
    .fill("Hẹn gặp cả đội!");
  await page.getByRole("button", { name: "Tham gia" }).click();

  await expect(
    page.getByRole("heading", { name: "Cảm ơn bạn." }),
  ).toBeVisible();
  const mapLink = page.getByRole("link", { name: /Mở Google Maps/ });
  await expect(mapLink).toHaveAttribute("href", MAP_URL);
  await expect(mapLink).toHaveAttribute("target", "_blank");
  await expect(mapLink).toHaveAttribute("rel", "noreferrer");
  let resolveMapRequest: (url: string) => void;
  const mapRequest = new Promise<string>((resolve) => {
    resolveMapRequest = resolve;
  });
  await page.context().route("https://maps.app.goo.gl/**", async (route) => {
    resolveMapRequest(route.request().url());
    await route.abort("blockedbyclient");
  });
  const popupPromise = page.waitForEvent("popup");
  await mapLink.click();
  const [popup, requestedMapUrl] = await Promise.all([
    popupPromise,
    mapRequest,
  ]);
  expect(requestedMapUrl).toBe(MAP_URL);
  await popup.close();

  const expectedViewport = testInfo.project.name.startsWith("mobile")
    ? { width: 390, height: 844 }
    : { width: 1440, height: 1000 };
  expect(page.viewportSize()).toEqual(expectedViewport);
  await expectNoHorizontalOverflow(page);
});

test("declines only after the Hẹn dịp khác button has been hovered five times", async ({
  page,
  request,
}, testInfo) => {
  await openConfirmation(page);
  const declineButton = page.getByRole("button", { name: "Hẹn dịp khác" });
  await expect(declineButton).toHaveAttribute("aria-disabled", "true");
  for (let index = 0; index < 5; index += 1) {
    await page.mouse.move(0, 0);
    await declineButton.hover();
  }
  await expect(declineButton).toHaveAttribute("aria-disabled", "false");
  await declineButton.click();
  await expect(page.getByText(/Thật tiếc quá/)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const scope = workerScope(testInfo.project.name, testInfo.workerIndex);
  const stateResponse = await request.get("/api/test/rsvp-state", {
    headers: { "x-e2e-worker-id": scope },
  });
  expect(stateResponse.status()).toBe(200);
  const state = (await stateResponse.json()) as {
    submissions: Array<{ attending: boolean; message: string | null }>;
  };
  expect(state.submissions).toHaveLength(1);
  expect(state.submissions[0]?.attending).toBe(false);
  expect(state.submissions[0]?.message).toBeNull();
});

test("retries a failed direct response with the same submission id", async ({
  page,
  request,
}, testInfo) => {
  await openConfirmation(page);
  let droppedResponse = false;
  let originalSubmissionId = "";
  await page.route("**/api/rsvp", async (route) => {
    if (!droppedResponse) {
      droppedResponse = true;
      originalSubmissionId = String(
        route.request().postDataJSON().clientSubmissionId,
      );
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      await route.abort("failed");
      return;
    }

    await route.continue();
  });

  await page.getByRole("button", { name: "Tham gia" }).click();
  await expect(page.getByRole("button", { name: "Thử gửi lại" })).toBeVisible();
  await page.getByRole("button", { name: "Thử gửi lại" }).click();
  await expect(
    page.getByRole("heading", { name: "Cảm ơn bạn." }),
  ).toBeVisible();

  const scope = workerScope(testInfo.project.name, testInfo.workerIndex);
  const stateResponse = await request.get("/api/test/rsvp-state", {
    headers: { "x-e2e-worker-id": scope },
  });
  const state = (await stateResponse.json()) as {
    submissions: Array<{ clientSubmissionId: string }>;
  };
  expect(state.submissions).toHaveLength(1);
  expect(state.submissions[0]?.clientSubmissionId).toBe(originalSubmissionId);
});

test("supports keyboard selection, full names, and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openRsvp(page);
  const guestButtons = page.locator(".guest-name-item");
  await guestButtons.nth(1).focus();
  expect(
    await guestButtons
      .nth(1)
      .evaluate((button) => getComputedStyle(button).outlineStyle),
  ).not.toBe("none");
  expect(
    await page
      .locator(".reveal")
      .first()
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");

  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("E2E Guest 02", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tham gia" })).toBeVisible();
});
