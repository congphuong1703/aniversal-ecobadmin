import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminLogin } from "./admin-login";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, init?: ResponseInit) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
      ...init,
    }),
  );
}

describe("AdminLogin", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    refresh.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows one generic password error without exposing the API response", async () => {
    fetchMock.mockImplementationOnce(() =>
      jsonResponse(
        { error: { code: "INTERNAL_ERROR", message: "Database unavailable" } },
        { status: 500 },
      ),
    );
    const user = userEvent.setup();

    render(<AdminLogin />);
    await user.type(screen.getByLabelText(/mật khẩu quản trị/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /đăng nhập/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /không thể đăng nhập.*kiểm tra mật khẩu/i,
    );
    expect(screen.queryByText(/database unavailable/i)).not.toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("submits the password and refreshes the server route after success", async () => {
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({ authenticated: true }),
    );
    const user = userEvent.setup();

    render(<AdminLogin />);
    const password = screen.getByLabelText(/mật khẩu quản trị/i);
    await user.type(password, "club-secret");
    await user.click(screen.getByRole("button", { name: /đăng nhập/i }));

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "club-secret" }),
    });
  });
});
