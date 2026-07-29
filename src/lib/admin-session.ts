import "server-only";

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

import { getEnv } from "@/lib/env";

const JWT_ALGORITHM = "HS256";
const TOKEN_ISSUER = "ecobadminton-rsvp";
const ADMIN_AUDIENCE = "admin";
const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

export const ADMIN_SESSION_COOKIE_NAME = "ecobadminton_admin";

export type AdminSessionTokenDependencies = {
  secret: string;
  now?: () => Date;
};

function encodeSecret(secret: string) {
  return new TextEncoder().encode(secret);
}

function currentDate(now?: () => Date) {
  return now?.() ?? new Date();
}

export async function signAdminSessionToken(
  dependencies: AdminSessionTokenDependencies,
) {
  const issuedAt = Math.floor(currentDate(dependencies.now).getTime() / 1000);

  return new SignJWT({})
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuer(TOKEN_ISSUER)
    .setAudience(ADMIN_AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ADMIN_SESSION_TTL_SECONDS)
    .sign(encodeSecret(dependencies.secret));
}

export async function verifyAdminSessionToken(
  token: string,
  dependencies: AdminSessionTokenDependencies,
) {
  await jwtVerify(token, encodeSecret(dependencies.secret), {
    algorithms: [JWT_ALGORITHM],
    issuer: TOKEN_ISSUER,
    audience: ADMIN_AUDIENCE,
    currentDate: currentDate(dependencies.now),
  });
}

export async function createAdminSession() {
  const token = await signAdminSessionToken({
    secret: getEnv().ADMIN_SESSION_SECRET,
  });
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
}

export async function readAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return false;
  }

  const secret = getEnv().ADMIN_SESSION_SECRET;

  try {
    await verifyAdminSessionToken(token, { secret });
    return true;
  } catch {
    return false;
  }
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE_NAME);
}
