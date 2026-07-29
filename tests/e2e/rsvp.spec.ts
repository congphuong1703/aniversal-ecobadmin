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

async function openRsvp(page: Page) {
  await page.goto("/#rsvp");
  await expect(
    page.getByRole("radio", { name: /Ảnh khách mời/ }).first(),
  ).toBeVisible();
  const guestCard = await page.locator(".guest-card").first().boundingBox();
  expect(guestCard).not.toBeNull();
  expect((guestCard?.width ?? 0) / (guestCard?.height ?? 1)).toBeCloseTo(
    4 / 5,
    1,
  );
}

async function verifyFirstGuest(page: Page) {
  await openRsvp(page);
  await page
    .getByRole("radio", { name: /Ảnh khách mời/ })
    .first()
    .check();
  await page.getByRole("button", { name: /Tiếp tục/ }).click();
  await expect(page.getByLabel("Họ và tên đầy đủ")).toBeFocused();
  await page.getByLabel("Họ và tên đầy đủ").fill("Nguyễn Văn An");
  await page.getByRole("button", { name: /Xác minh/ }).click();
  await expect(
    page.getByRole("heading", { name: "Bạn sẽ tham dự chứ?" }),
  ).toBeVisible();
}

test.beforeEach(async ({ context, request }, testInfo) => {
  const scope = workerScope(testInfo.project.name, testInfo.workerIndex);
  await context.setExtraHTTPHeaders({ "x-e2e-worker-id": scope });
  await resetRepository(request, scope);
});

test("completes an attending RSVP responsively and opens the approved map", async ({
  page,
}, testInfo) => {
  await verifyFirstGuest(page);
  await page.getByRole("radio", { name: "Tham dự", exact: true }).check();
  await page
    .getByLabel("Lời nhắn cho EcoBadminton Không bắt buộc")
    .fill("Hẹn gặp cả đội!");
  await page.getByRole("button", { name: "Gửi phản hồi" }).click();

  await expect(
    page.getByRole("heading", { name: "Cảm ơn bạn." }),
  ).toBeVisible();
  const mapLink = page.getByRole("link", { name: /Mở Google Maps/ });
  await expect(mapLink).toHaveAttribute("href", MAP_URL);
  await expect(mapLink).toHaveAttribute("target", "_blank");
  const popupPromise = page.waitForEvent("popup");
  await mapLink.click();
  const popup = await popupPromise;
  await expect.poll(() => popup.url()).toContain("google.com/maps");
  await popup.close();

  const expectedViewport = testInfo.project.name.startsWith("mobile")
    ? { width: 390, height: 844 }
    : { width: 1440, height: 1000 };
  expect(page.viewportSize()).toEqual(expectedViewport);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("declines without a message and records intentional response history", async ({
  page,
  request,
}, testInfo) => {
  await verifyFirstGuest(page);
  await page.getByRole("radio", { name: "Không tham dự", exact: true }).check();
  await page.getByRole("button", { name: "Gửi phản hồi" }).click();
  await expect(page.getByText(/Tiếc một chút/)).toBeVisible();

  await page.getByRole("button", { name: "Gửi phản hồi mới" }).click();
  await page.getByRole("radio", { name: "Tham dự", exact: true }).check();
  await page
    .getByLabel("Lời nhắn cho EcoBadminton Không bắt buộc")
    .fill("Kế hoạch đã thay đổi");
  await page.getByRole("button", { name: "Gửi phản hồi" }).click();
  await expect(
    page.getByRole("heading", { name: "Cảm ơn bạn." }),
  ).toBeVisible();

  const scope = workerScope(testInfo.project.name, testInfo.workerIndex);
  const stateResponse = await request.get("/api/test/rsvp-state", {
    headers: { "x-e2e-worker-id": scope },
  });
  expect(stateResponse.status()).toBe(200);
  const state = (await stateResponse.json()) as {
    submissions: Array<{ attending: boolean; message: string | null }>;
  };
  expect(state.submissions).toHaveLength(2);
  expect(state.submissions.map(({ attending }) => attending)).toEqual([
    false,
    true,
  ]);
  expect(state.submissions[0]?.message).toBeNull();
});

test("rejects the wrong name and returns focus to the verification field", async ({
  page,
}) => {
  await openRsvp(page);
  await page
    .getByRole("radio", { name: /Ảnh khách mời/ })
    .first()
    .check();
  await page.getByRole("button", { name: /Tiếp tục/ }).click();
  const nameInput = page.getByLabel("Họ và tên đầy đủ");
  await nameInput.fill("Tên Không Khớp");
  await page.getByRole("button", { name: /Xác minh/ }).click();

  await expect(
    page.getByText("Thông tin chưa khớp với ảnh đã chọn."),
  ).toBeVisible();
  await expect(nameInput).toBeFocused();
});

test("retries a lost response with the same submission id and deduplicates", async ({
  page,
  request,
}, testInfo) => {
  await verifyFirstGuest(page);
  await page.getByRole("radio", { name: "Tham dự", exact: true }).check();

  let droppedResponse = false;
  await page.route("**/api/rsvp", async (route) => {
    if (!droppedResponse) {
      droppedResponse = true;
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      await route.abort("failed");
      return;
    }

    await route.continue();
  });

  await page.getByRole("button", { name: "Gửi phản hồi" }).click();
  await expect(page.getByRole("button", { name: "Thử gửi lại" })).toBeVisible();
  await page.getByRole("button", { name: "Thử gửi lại" }).click();
  await expect(
    page.getByRole("heading", { name: "Cảm ơn bạn." }),
  ).toBeVisible();

  const scope = workerScope(testInfo.project.name, testInfo.workerIndex);
  const stateResponse = await request.get("/api/test/rsvp-state", {
    headers: { "x-e2e-worker-id": scope },
  });
  const state = (await stateResponse.json()) as { submissions: unknown[] };
  expect(state.submissions).toHaveLength(1);
});

test("supports keyboard radio selection, visible focus, validation focus, and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openRsvp(page);
  const guestRadios = page.getByRole("radio", { name: /Ảnh khách mời/ });
  await guestRadios.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(guestRadios.nth(1)).toBeChecked();
  await expect(guestRadios.nth(1)).toBeFocused();
  expect(
    await guestRadios
      .nth(1)
      .evaluate(
        (radio) => getComputedStyle(radio.closest("label")!).outlineStyle,
      ),
  ).not.toBe("none");
  expect(
    await page
      .locator(".reveal")
      .first()
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");

  await page.getByRole("button", { name: /Tiếp tục/ }).click();
  const nameInput = page.getByLabel("Họ và tên đầy đủ");
  await page.getByRole("button", { name: /Xác minh/ }).click();
  await expect(nameInput).toBeFocused();
  await nameInput.fill("Trần Minh Châu");
  await page.getByRole("button", { name: /Xác minh/ }).click();

  await page.getByRole("button", { name: "Gửi phản hồi" }).click();
  await expect(
    page.getByRole("radio", { name: "Tham dự", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByText("Vui lòng chọn tham dự hoặc không tham dự."),
  ).toBeVisible();
});
