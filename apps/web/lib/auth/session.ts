import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import {
  ACCESS_TOKEN_SECONDS,
  REFRESH_TOKEN_SECONDS,
  createRefreshToken,
  hashToken,
  signAccessToken,
  verifyAccessToken,
} from "@/lib/auth/tokens";

// The same safety rules for every login cookie. Also used by proxy.ts.
export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true, // browser JavaScript can't read it
    secure: process.env.NODE_ENV === "production", // HTTPS only on the live site
    sameSite: "lax" as const, // not sent along with most requests from other sites
    path: "/", // sent to every page of this app
    maxAge, // seconds until the browser deletes it
  };
}

// Called right after the password check passes.
export async function startSession(user: {
  id: string;
  organisationId: string;
  role: Role;
}) {
  const accessToken = await signAccessToken({
    userId: user.id,
    organisationId: user.organisationId,
    role: user.role,
  });
  const refreshToken = await createRefreshToken(user.id);

  const cookieStore = await cookies();
  cookieStore.set("access_token", accessToken, cookieOptions(ACCESS_TOKEN_SECONDS));
  cookieStore.set("refresh_token", refreshToken, cookieOptions(REFRESH_TOKEN_SECONDS));
}

// Called on log out. Crosses the refresh token out in the database,
// then removes both cookies from this browser.
export async function endSession() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (refreshToken) {
    await db.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
}

// Who is making this request? Returns the user, or null if not logged in.
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;

  const claims = await verifyAccessToken(token);
  if (!claims) return null;

  // The token proves who you are. The database gives the latest email and role.
  return db.user.findUnique({
    where: { id: claims.userId },
    select: { id: true, email: true, role: true, organisationId: true },
  });
}

// For pages and actions that need a logged-in user. Not logged in → go to /login.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

// The keycard check, for actions only some roles may do. Wrong role → refuse.
export async function requireRole(...allowed: Role[]) {
  const user = await requireUser();
  if (!allowed.includes(user.role)) {
    throw new Error("You don't have permission to do this.");
  }
  return user;
}
