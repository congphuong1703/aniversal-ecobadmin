import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

function workerScope(projectName: string, workerIndex: number) {
  return `pw-${projectName}-${workerIndex}`;
}

async function resetRepository(request: APIRequestContext, scope: string) {
  const response = await request.post("/api/test/reset", {
    data: { submissions: [] },
    headers: { "x-e2e-worker-id": scope },
  });

  expect(response.status()).toBe(200);
}

async function completeAttendingRsvp(page: Page) {
  await page.goto("/#rsvp");
  await expect(page.locator(".guest-name-item").first()).toBeVisible();
  await page.locator(".guest-name-item").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Tham gia" }).click();
  await expect(page.getByRole("heading", { name: "Cảm ơn bạn." })).toBeVisible();

  const circles = page.locator(".lucky-number-circle");
  await expect(circles).toHaveCount(5);
  const values = await circles.allTextContents();

  return {
    guestName: "E2E Guest 01",
    number: values[0]!,
  };
}

async function loginAsAdmin(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Mật khẩu quản trị").fill("e2e-admin-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Bức tranh khách mời, cập nhật theo từng phản hồi.",
    }),
  ).toBeVisible();
}

async function expectPublicDrawToReveal(
  page: Page,
  expectedNumber: string,
  expectedWinner: string,
) {
  const revealedCard = page
    .locator(".draw-card.is-revealed")
    .filter({
      has: page.locator(".draw-winning-number", { hasText: expectedNumber }),
    })
    .filter({ hasText: expectedWinner });
  await expect(revealedCard).toHaveCount(1);
  await expect(revealedCard.locator(".draw-winning-number")).toHaveText(
    expectedNumber,
  );
  await expect(revealedCard.getByText(expectedWinner, { exact: true })).toBeVisible();
}

test.beforeEach(async ({ context, request }, testInfo) => {
  const scope = workerScope(testInfo.project.name, testInfo.workerIndex);
  await context.setExtraHTTPHeaders({ "x-e2e-worker-id": scope });
  await resetRepository(request, scope);
});

test("keeps draws admin-only and reveals each of five rounds to the public page", async ({
  page,
  request,
}, testInfo) => {
  const scope = workerScope(testInfo.project.name, testInfo.workerIndex);
  const anonymousDraw = await request.post("/api/admin/draws/next", {
    headers: { "x-e2e-worker-id": scope },
  });
  expect(anonymousDraw.status()).toBe(401);

  const assignment = await completeAttendingRsvp(page);
  const publicPage = await page.context().newPage();
  const adminPage = await page.context().newPage();

  await publicPage.goto("/quay-trung-thuong");
  await expect(publicPage.getByRole("link", { name: "Quay lại" })).toHaveAttribute(
    "href",
    "/#top",
  );
  await expect(
    publicPage.getByRole("link", { name: "Quay trúng thưởng" }),
  ).toHaveCount(0);
  await expect(publicPage.getByText("Chưa có giải nào được mở.")).toBeVisible();
  await expect(publicPage.getByText("Chờ quay")).toHaveCount(5);

  await loginAsAdmin(adminPage);
  const numberFilter = adminPage.getByLabel("Tìm theo tên hoặc số");
  await numberFilter.fill(assignment.number);
  const filteredGuestRow = adminPage
    .locator(".admin-guest-row")
    .filter({ hasText: assignment.guestName });
  await expect(filteredGuestRow).toHaveCount(1);
  await expect(filteredGuestRow).toContainText(assignment.number);

  const winningNumbers = new Set<string>();
  for (let round = 0; round < 5; round += 1) {
    const drawButton = adminPage.getByRole("button", {
      name: /Quay giải ngẫu nhiên/,
    });
    await expect(drawButton).toBeEnabled();
    await drawButton.click();

    await expect(adminPage.locator(".admin-draw-result")).toHaveCount(round + 1);
    const adminNumbers = await adminPage
      .locator(".admin-draw-number")
      .allTextContents();
    const winningNumber = adminNumbers
      .map((number) => number.trim())
      .find((number) => !winningNumbers.has(number)) ?? "";
    expect(winningNumber).toMatch(/^\d{2}$/);
    expect(winningNumbers.has(winningNumber)).toBe(false);
    winningNumbers.add(winningNumber);

    await expectPublicDrawToReveal(
      publicPage,
      winningNumber,
      assignment.guestName,
    );
    await expect(
      publicPage.locator(".draw-card.is-revealed .draw-card-status"),
    ).toHaveCount(round + 1);
  }

  expect(winningNumbers.size).toBe(5);
  await expect(
    adminPage.getByRole("button", { name: "Đã hoàn tất" }),
  ).toBeDisabled();

  const sixthDraw = await adminPage.request.post("/api/admin/draws/next", {
    headers: { "x-e2e-worker-id": scope },
  });
  expect(sixthDraw.status()).toBe(409);

  await publicPage.close();
  await adminPage.close();
});
