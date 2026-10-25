import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  getAdminTokenUserId,
} from "@/lib/admin-auth";
import { encryptApiError } from "@/lib/api-encryption";
import { prisma } from "@/lib/prisma";
import { checkAdminAccessRateLimit } from "@/lib/rate-limit";

function clearAdminSession(response: Response) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.headers.append(
    "Set-Cookie",
    `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`,
  );
  return response;
}

async function rateLimitedResponse(request: NextRequest, retryAfter: number) {
  const response = request.nextUrl.pathname.startsWith("/api/")
    ? await encryptApiError(
        request,
        429,
        "Too many unauthenticated admin requests. Try again later.",
      )
    : new NextResponse(
        "Too many unauthenticated admin requests. Try again later.",
        { status: 429 },
      );
  response.headers.set("Retry-After", String(retryAfter));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const existingBlock = checkAdminAccessRateLimit(request, false, pathname);
  if (!existingBlock.allowed) {
    return rateLimitedResponse(request, existingBlock.retryAfter);
  }

  if (pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const userId = getAdminTokenUserId(token);
  if (userId) {
    try {
      const admin = await prisma.user.findUnique({
        where: { id: userId, role: "admin" },
        select: { id: true },
      });
      if (admin) return NextResponse.next();
    } catch (error: unknown) {
      console.error("[admin auth] Failed to validate current admin account:", error);
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return encryptApiError(
          request,
          503,
          "Unable to verify admin session. Please try again later.",
        );
      }
      return new NextResponse("Unable to verify admin session. Please try again later.", {
        status: 503,
      });
    }
  }

  const attempt = checkAdminAccessRateLimit(request, true, pathname);
  if (!attempt.allowed) return rateLimitedResponse(request, attempt.retryAfter);

  if (pathname.startsWith("/api/")) {
    return clearAdminSession(await encryptApiError(
      request,
      401,
      "Not logged in. Please sign in to continue.",
    ));
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return clearAdminSession(NextResponse.redirect(loginUrl));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};