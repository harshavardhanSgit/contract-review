import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_TOKEN_SECONDS,
  REFRESH_TOKEN_SECONDS,
  rotateRefreshToken,
  verifyAccessToken,
} from "@/lib/auth/tokens";
import { cookieOptions } from "@/lib/auth/session";

// Runs before every page and Server Action. One job only: if the access token
// has expired but a refresh token is present, swap it for a fresh pair.
// It does NOT decide who may see what; getCurrentUser() still does that.
export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  if (accessToken && (await verifyAccessToken(accessToken))) {
    return NextResponse.next(); // wristband still valid: nothing to do
  }

  const refreshToken = request.cookies.get("refresh_token")?.value;
  if (!refreshToken) {
    return NextResponse.next(); // not logged in
  }

  const result = await rotateRefreshToken(refreshToken);

  if (result.status === "race") {
    return NextResponse.next(); // another request is already swapping it
  }

  if (result.status === "invalid") {
    const response = NextResponse.next();
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    return response;
  }

  // Let this same request see the new access token...
  request.cookies.set("access_token", result.accessToken);
  const response = NextResponse.next({ request: { headers: request.headers } });
  // ...and tell the browser to store both new cookies.
  response.cookies.set("access_token", result.accessToken, cookieOptions(ACCESS_TOKEN_SECONDS));
  response.cookies.set("refresh_token", result.refreshToken, cookieOptions(REFRESH_TOKEN_SECONDS));
  return response;
}

// Skip static files and images; run on pages and Server Actions.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
