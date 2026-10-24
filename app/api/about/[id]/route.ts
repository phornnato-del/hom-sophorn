import { withApiEncryption } from "@/lib/encrypted-api-handler";
import { AboutRequest } from "@/feature/api/about/type/AboutReques";
import { getErrorMessage, isPrismaError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { isObjectId } from "@/lib/validate";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdateAboutBody = Partial<AboutRequest>;

const aboutFields = {
  id: true,
  tag: true,
  title: true,
  desc: true,
  Lanuage: true,
  createdAt: true,
} as const;

async function getHandler(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!isObjectId(id)) return fail("Invalid id format", 400);

    const about = await prisma.about.findUnique({
      where: { id },
      select: aboutFields,
    });

    if (!about) return fail("About not found", 404);
    return ok(about, "About retrieved");
  } catch (err: unknown) {
    console.error(err);
    return fail(getErrorMessage(err));
  }
}

async function postHandler(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!isObjectId(id)) return fail("Invalid id format", 400);

    const { tag, title, desc, Lanuage } =
      (await req.json()) as UpdateAboutBody;

    if (!tag && !title && !desc && !Lanuage) {
      return fail("Nothing to update", 400);
    }

    const about = await prisma.about.update({
      where: { id },
      data: {
        ...(tag && { tag }),
        ...(title && { title }),
        ...(desc && { desc }),
        ...(Lanuage && { Lanuage }),
      },
      select: aboutFields,
    });

    return ok(about, "About updated");
  } catch (err: unknown) {
    console.error(err);
    if (isPrismaError(err) && err.code === "P2025") {
      return fail("About not found", 404);
    }
    return fail(getErrorMessage(err));
  }
}

async function deleteHandler(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!isObjectId(id)) return fail("Invalid id format", 400);

    await prisma.about.delete({ where: { id } });
    return ok(null, "About entry deleted");
  } catch (err: unknown) {
    console.error(err);
    if (isPrismaError(err) && err.code === "P2025") {
      return fail("About not found", 404);
    }
    return fail(getErrorMessage(err));
  }
}

export const GET = withApiEncryption(getHandler);
export const POST = withApiEncryption(postHandler);
export const DELETE = withApiEncryption(deleteHandler);
