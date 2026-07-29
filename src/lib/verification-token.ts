import "server-only";

import { jwtVerify, SignJWT } from "jose";

import { getEnv } from "@/lib/env";

const JWT_ALGORITHM = "HS256";
const TOKEN_ISSUER = "ecobadminton-rsvp";
const VERIFICATION_AUDIENCE = "rsvp-submit";
const VERIFICATION_TTL_SECONDS = 15 * 60;

export type VerificationTokenDependencies = {
  secret: string;
  now?: () => Date;
};

function encodeSecret(secret: string) {
  return new TextEncoder().encode(secret);
}

function currentDate(now?: () => Date) {
  return now?.() ?? new Date();
}

function runtimeDependencies(): VerificationTokenDependencies {
  return { secret: getEnv().RSVP_VERIFICATION_SECRET };
}

export async function signVerificationToken(
  guestId: string,
  dependencies: VerificationTokenDependencies = runtimeDependencies(),
) {
  const issuedAt = Math.floor(currentDate(dependencies.now).getTime() / 1000);

  return new SignJWT({})
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuer(TOKEN_ISSUER)
    .setAudience(VERIFICATION_AUDIENCE)
    .setSubject(guestId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + VERIFICATION_TTL_SECONDS)
    .sign(encodeSecret(dependencies.secret));
}

export async function verifyVerificationToken(
  token: string,
  dependencies: VerificationTokenDependencies = runtimeDependencies(),
) {
  const { payload } = await jwtVerify(token, encodeSecret(dependencies.secret), {
    algorithms: [JWT_ALGORITHM],
    issuer: TOKEN_ISSUER,
    audience: VERIFICATION_AUDIENCE,
    currentDate: currentDate(dependencies.now),
  });

  if (!payload.sub) {
    throw new Error("Verification token is missing its guest subject.");
  }

  return payload.sub;
}
