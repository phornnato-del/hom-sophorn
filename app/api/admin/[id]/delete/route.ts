import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/response";
import { isPrismaError, getErrorMessage } from "@/lib/errors";
import { isObjectId } from "@/lib/validate";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!isObjectId(id)) return fail("Invalid id format", 400);

    await prisma.user.delete({ where: { id } });
    return ok(null, "User deleted");
  } catch (err: unknown) {
    console.error(err);
    if (isPrismaError(err) && err.code === "P2025") {
      return fail("User not found", 404);
    }
    return fail(getErrorMessage(err));
  }
}