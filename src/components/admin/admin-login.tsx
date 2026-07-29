"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { FormError } from "@/components/ui/form-error";

const GENERIC_LOGIN_ERROR =
  "Không thể đăng nhập. Vui lòng kiểm tra mật khẩu và thử lại.";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setError(GENERIC_LOGIN_ERROR);
        return;
      }

      router.refresh();
    } catch {
      setError(GENERIC_LOGIN_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="admin-page admin-login-page">
      <div className="admin-orbit admin-orbit-large" aria-hidden="true" />
      <div className="admin-orbit admin-orbit-small" aria-hidden="true" />
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <div className="brand-mark admin-brand">
          <span>Eco</span>
          <strong>Badminton</strong>
        </div>
        <span className="eyebrow">Khu vực quản trị</span>
        <h1 className="font-display" id="admin-login-title">
          Danh sách phản hồi, dành riêng cho đội ngũ.
        </h1>
        <p className="admin-login-intro">
          Đăng nhập để xem trạng thái mới nhất và toàn bộ lịch sử RSVP của khách mời.
        </p>

        <form className="admin-login-form" onSubmit={submitLogin}>
          <label className="field-label" htmlFor="admin-password">
            Mật khẩu quản trị
          </label>
          <input
            autoComplete="current-password"
            disabled={isSubmitting}
            id="admin-password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          {error ? <FormError>{error}</FormError> : null}
          <button className="button-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>
        <p className="admin-login-note">
          Phiên quản trị được bảo vệ bằng cookie ký và tự hết hạn sau 8 giờ.
        </p>
      </section>
    </main>
  );
}
