import { withApiEncryption } from "@/lib/encrypted-api-handler";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/response";
import { isPrismaError, getErrorMessage } from "@/lib/errors";
import { isObjectId } from "@/lib/validate";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function postHandler(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!isObjectId(id)) return fail("Invalid id format", 400);

    // 1. get the image pathname before deleting
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { image: true },
    });
    if (!existing) return fail("User not found", 404);

    // 2. delete the user
    await prisma.user.delete({ where: { id } });

    // 3. delete the image file (don't fail the request if this errors)
    if (existing.image && !existing.image.startsWith("http")) {
      try {
        await del(existing.image);
      } catch (e) {
        console.error("Failed to delete blob:", e);
      }
    }

    return ok(null, "User deleted");
  } catch (err: unknown) {
    console.error(err);
    if (isPrismaError(err) && err.code === "P2025") {
      return fail("User not found", 404);
    }
    return fail(getErrorMessage(err));
  }
}

export const POST = withApiEncryption(postHandler);
