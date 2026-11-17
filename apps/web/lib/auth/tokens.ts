import "server-only";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/app/generated/prisma/client";

export const ACCESS_TOKEN_SECONDS = 15 * 60; // 15 minutes

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
