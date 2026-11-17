import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import type { Role } from "@/app/generated/prisma/client";

export const ACCESS_TOKEN_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_SECONDS = 7 * 24 * 60 * 60; // 7 days

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET is not set");
}
const key = new TextEncoder().encode(jwtSecret);

export type AccessClaims = {
  userId: string;
  organisationId: string;
  role: Role;
};

// Makes the access token: who you are, which organisation, what role.
// Signed (can't be changed), NOT encrypted (anyone can read it).
export async function signAccessToken(claims: AccessClaims): Promise<string> {
  return new SignJWT({ org: claims.organisationId, role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_SECONDS}s`)
    .sign(key);
}

// Checks the signature and the expiry. Returns the claims, or null if anything is wrong.
export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return {
      userId: payload.sub as string,
      organisationId: payload.org as string,
      role: payload.role as Role,
    };
  } catch {
    return null; // edited, expired, or not a token at all
  }
}

// A fingerprint of the token. Same token, same fingerprint; it can't be turned back.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Two requests from the same browser can try to use the same card at the same moment.
// A card crossed out less than 30 seconds ago is treated as that race, not as theft.
const REUSE_GRACE_MS = 30 * 1000;

export type RotateResult =
  | { status: "rotated"; accessToken: string; refreshToken: string }
  | { status: "race" } // another request just used this card: not theft
  | { status: "invalid" }; // unknown, expired, or stolen: log out

// Swaps a refresh token for a fresh pair. Each refresh token works only once.
export async function rotateRefreshToken(token: string): Promise<RotateResult> {
  const row = await db.refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, organisationId: true, role: true } } },
  });
  if (!row || row.expiresAt < new Date()) {
    return { status: "invalid" };
  }

  if (row.revokedAt) {
    if (Date.now() - row.revokedAt.getTime() < REUSE_GRACE_MS) {
      return { status: "race" };
    }
    // A crossed-out card came back, so someone has a copy.
    // Cancel every card this user has; the real user logs in again with their password.
    await db.refreshToken.updateMany({
      where: { userId: row.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { status: "invalid" };
  }

  // Cross the old card out. "revokedAt: null" makes sure only one request wins.
  const claimed = await db.refreshToken.updateMany({
    where: { id: row.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (claimed.count === 0) {
    return { status: "race" };
  }

  const accessToken = await signAccessToken({
    userId: row.user.id,
    organisationId: row.user.organisationId,
    role: row.user.role,
  });
  const refreshToken = await createRefreshToken(row.user.id);
  return { status: "rotated", accessToken, refreshToken };
}

// Makes a refresh token: 32 random bytes. The database gets only its hash;
// the real token is returned so it can go into the cookie.
export async function createRefreshToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_SECONDS * 1000),
    },
  });
  return token;
}
