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

export type AdminSessionMetadata = {
  expiresAt: number;
  serverTime: number;
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
): Promise<AdminSessionMetadata> {
  const serverTime = currentDate(dependencies.now);
  const { payload } = await jwtVerify(
    token,
    encodeSecret(dependencies.secret),
    {
      algorithms: [JWT_ALGORITHM],
      issuer: TOKEN_ISSUER,
      audience: ADMIN_AUDIENCE,
      currentDate: serverTime,
    },
  );

  if (typeof payload.exp !== "number") {
    throw new Error("Admin session expiry is missing.");
  }

  return { expiresAt: payload.exp, serverTime: serverTime.getTime() };
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

export async function readAdminSessionMetadata(): Promise<AdminSessionMetadata | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const secret = getEnv().ADMIN_SESSION_SECRET;

  try {
    return await verifyAdminSessionToken(token, { secret });
  } catch {
    return null;
  }
}

export async function readAdminSession() {
  return (await readAdminSessionMetadata()) !== null;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE_NAME);
}
