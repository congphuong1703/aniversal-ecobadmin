import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

const E2E_FIRST_GUEST_NAME = "E2E Guest 01";

function workerScope(projectName: string, workerIndex: number) {
  return `pw-${projectName}-${workerIndex}`;
}

async function seedAdminHistory(request: APIRequestContext, scope: string) {
  const response = await request.post("/api/test/reset", {
    headers: { "x-e2e-worker-id": scope },
    data: {
      submissions: [
        {
          guestId: "guest-01",
          attending: true,
          message: "Phản hồi đầu tiên",
          clientSubmissionId: "30000000-0000-4000-8000-000000000001",
        },
        {
          guestId: "guest-01",
          attending: false,
          message: null,
          clientSubmissionId: "30000000-0000-4000-8000-000000000002",
        },
        {
          guestId: "guest-02",
          attending: true,
          message: "Sẽ tham dự",
          clientSubmissionId: "30000000-0000-4000-8000-000000000003",
        },
      ],
    },
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

test.beforeEach(async ({ context, request }, testInfo) => {
  const scope = workerScope(testInfo.project.name, testInfo.workerIndex);
  await context.setExtraHTTPHeaders({ "x-e2e-worker-id": scope });
  await seedAdminHistory(request, scope);
});

test("handles login failure and success, dashboard history, and logout", async ({
  page,
}) => {
  await page.goto("/admin");
  await expectNoHorizontalOverflow(page);
  const password = page.getByLabel("Mật khẩu quản trị");
  await password.fill("wrong-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByText(/Không thể đăng nhập/)).toBeVisible();
  await expect(password).toBeVisible();

  await password.fill("e2e-admin-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Bức tranh khách mời, cập nhật theo từng phản hồi.",
    }),
  ).toBeVisible();

  const rawAdminResponse = await page.request.get("/admin");
  const rawAdminBody = await rawAdminResponse.text();
  expect(rawAdminResponse.status()).toBe(200);
  expect(rawAdminBody).toContain("Đang kiểm tra phiên quản trị");
  expect(rawAdminBody).not.toContain(E2E_FIRST_GUEST_NAME);
  expect(rawAdminBody).not.toContain("Phản hồi đầu tiên");

  const summary = page.locator('[aria-label="Tổng quan phản hồi"]');
  const expectedMetrics = [
    ["Tổng khách", "25"],
    ["Tham dự", "1"],
    ["Không tham dự", "1"],
    ["Chưa phản hồi", "23"],
  ] as const;

  for (const [index, [label, value]] of expectedMetrics.entries()) {
    const card = summary.locator(".admin-summary-card").nth(index);
    await expect(card.locator("dt")).toHaveText(label);
    await expect(card.locator("dd")).toHaveText(value);
  }

  await expectNoHorizontalOverflow(page);

  const disclosure = page.getByRole("button", {
    name: `Xem lịch sử ${E2E_FIRST_GUEST_NAME}`,
  });
  await disclosure.focus();
  await page.keyboard.press("Enter");
  const history = page.getByRole("region", {
    name: `Lịch sử phản hồi của ${E2E_FIRST_GUEST_NAME}`,
  });
  await expect(history).toBeVisible();
  await expect(history.getByRole("listitem")).toHaveCount(2);
  await expect(history.getByRole("listitem").first()).toContainText(
    "Không tham dự",
  );
  await expect(history).toContainText("Phản hồi đầu tiên");
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: /Đăng xuất/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Danh sách phản hồi, dành riêng cho đội ngũ.",
    }),
  ).toBeVisible();
});
