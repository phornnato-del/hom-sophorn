import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { withApiEncryption } from "@/lib/encrypted-api-handler";

async function getHandler() {
  try {
    const attempts = await prisma.adminLoginAttempt.findMany({
      select: {
        id: true,
        ipAddress: true,
        attemptedUsername: true,
        country: true,
        region: true,
        city: true,
        timezone: true,
        userAgent: true,
        stage: true,
        outcome: true,
        statusCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return ok(
      {
        attempts: attempts.map((attempt) => ({
          ...attempt,
          createdAt: attempt.createdAt.toISOString(),
        })),
      },
      "Recent login attempts retrieved",
    );
  } catch (error: unknown) {
    console.error("[admin login audit] Failed to load login attempts:", error);
    return fail("Unable to load login activity");
  }
}

export const GET = withApiEncryption(getHandler);
