import { expect, test, type APIRequestContext } from "@playwright/test";

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

test.beforeEach(async ({ context, request }, testInfo) => {
  const scope = workerScope(testInfo.project.name, testInfo.workerIndex);
  await context.setExtraHTTPHeaders({ "x-e2e-worker-id": scope });
  await seedAdminHistory(request, scope);
});

test("handles login failure and success, dashboard history, and logout", async ({
  page,
}) => {
  await page.goto("/admin");
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

  const summary = page.locator('[aria-label="Tổng quan phản hồi"]');
  await expect(summary.getByText("20", { exact: true })).toBeVisible();
  await expect(summary.getByText("1", { exact: true })).toHaveCount(2);
  await expect(summary.getByText("18", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  const disclosure = page.getByRole("button", {
    name: "Xem lịch sử Nguyễn Văn An",
  });
  await disclosure.focus();
  await page.keyboard.press("Enter");
  const history = page.getByRole("region", {
    name: "Lịch sử phản hồi của Nguyễn Văn An",
  });
  await expect(history).toBeVisible();
  await expect(history.getByRole("listitem")).toHaveCount(2);
  await expect(history.getByRole("listitem").first()).toContainText(
    "Không tham dự",
  );
  await expect(history).toContainText("Phản hồi đầu tiên");

  await page.getByRole("button", { name: /Đăng xuất/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Danh sách phản hồi, dành riêng cho đội ngũ.",
    }),
  ).toBeVisible();
});
