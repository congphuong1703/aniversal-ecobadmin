export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;
export const ADMIN_SESSION_MAX_REMAINING_MS =
  ADMIN_SESSION_TTL_SECONDS * 1_000;

export type AdminSessionTiming = {
  expiresAt: number;
  serverTime: number;
};

export function adminSessionRemainingMs(session: AdminSessionTiming) {
  const remainingMs = session.expiresAt * 1_000 - session.serverTime;

  if (
    !Number.isSafeInteger(remainingMs) ||
    remainingMs <= 0 ||
    remainingMs > ADMIN_SESSION_MAX_REMAINING_MS
  ) {
    return null;
  }

  return remainingMs;
}
