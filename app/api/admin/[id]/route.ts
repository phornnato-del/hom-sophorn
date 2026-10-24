import { withApiEncryption } from "@/lib/encrypted-api-handler";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/response";
import { isPrismaError, getErrorMessage } from "@/lib/errors";
import { isObjectId, publicUserFields } from "@/lib/validate";
import { isAllowedImagePath } from "@/lib/folders";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdateUserBody = {
  email?: string;
  name?: string;
  password?: string;
  role?: string;
  image?: string | null; 
};

async function getHandler(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!isObjectId(id)) return fail("Invalid id format", 400);

    const user = await prisma.user.findUnique({
      where: { id },
      select: publicUserFields,
    });

    if (!user) return fail("User not found", 404);
    return ok(user, "User retrieved");
  } catch (err: unknown) {
    console.error(err);
    return fail(getErrorMessage(err));
  }
}

async function postHandler(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!isObjectId(id)) return fail("Invalid id format", 400);

    const { email, name, password, role, image } =
      (await req.json()) as UpdateUserBody;

    if (!email && !name && !password && !role && image === undefined) {
      return fail("Nothing to update", 400);
    }

    if (image !== undefined && image !== null) {
      if (
        typeof image !== "string" ||
        (!image.startsWith("https://") && !isAllowedImagePath(image))
      ) {
        return fail("Invalid image URL", 400);
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(email && { email }),
        ...(name && { name }),
        ...(role && { role }),
        ...(image !== undefined && { image }),
        ...(password && { password: await bcrypt.hash(password, 10) }),
      },
      select: publicUserFields,
    });

    return ok(user, "User updated");
  } catch (err: unknown) {
    console.error(err);
    if (isPrismaError(err)) {
      if (err.code === "P2025") return fail("User not found", 404);
      if (err.code === "P2002") return fail("Email already exists", 409);
    }
    return fail(getErrorMessage(err));
  }
}

export const GET = withApiEncryption(getHandler);
export const POST = withApiEncryption(postHandler);
