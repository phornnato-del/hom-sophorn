import { cookies } from "next/headers";
import { withApiEncryption } from "@/lib/encrypted-api-handler";
import {
  ADMIN_SESSION_COOKIE,
  getAdminTokenUserId,
} from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/response";

export function withAdminApiEncryption<
  TContext = { params: Promise<Record<string, string>> },
>(
  handler: (request: Request, context: TContext) => Promise<Response>,
) {
  return withApiEncryption<TContext>(async (request, context) => {
    const cookieStore = await cookies();
    const userId = getAdminTokenUserId(
      cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
    );
    if (!userId) return fail("Admin sign-in required", 401);

    try {
      const admin = await prisma.user.findUnique({
        where: { id: userId, role: "admin" },
        select: { id: true },
      });
      if (!admin) return fail("Admin sign-in required", 401);
    } catch (error: unknown) {
      console.error("[admin api] Failed to validate admin session:", error);
      return fail("Unable to verify admin access. Please try again later.", 503);
    }

    return handler(request, context);
  });
}
