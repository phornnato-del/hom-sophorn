import { BannerRequest } from "@/feature/api/banner/type/BannerRequest";
import { getErrorMessage, isPrismaError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { isObjectId } from "@/lib/validate";
import { withImageUrl } from "@/lib/withImageUrl";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!isObjectId(id)) return fail("Invalid id format", 400);

    const banner = await prisma.banner.findUnique({
      where: { id },
      select: {id: true,name: true, tag: true, title: true, slogan: true, desc: true, link: true, image: true},
    });

    if (!banner) return fail("Banner not found", 404);
    return ok(withImageUrl(banner), "Banner retrieved");
  } catch (err: unknown) {
    console.error(err);
    return fail(getErrorMessage(err));
  }
}


export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!isObjectId(id)) return fail("Invalid id format", 400);

    const { tag, title, slogan, desc, link, name, image } =
      (await req.json()) as BannerRequest;

    if (!tag && !title && !slogan && !desc && !link && image === undefined) {
      return fail("Nothing to update", 400);
    }

    const banner = await prisma.banner.update({
      where: { id },
      data: {
        ...(tag && { tag }),
        ...(title && { title }),
        ...(slogan && { slogan }),
        ...(desc && { desc }),
        ...(link && { link }),
        ...(name && { name }),
        ...(image !== undefined && { image }),
      },
      select: {id: true,name: true, tag: true, title: true, slogan: true, desc: true, link: true, image: true},
    });

    return ok(withImageUrl(banner), "Banner updated");
  } catch (err: unknown) {
    console.error(err);
    if (isPrismaError(err)) {
      if (err.code === "P2025") return fail("Banner not found", 404);
    }
    return fail(getErrorMessage(err));
  }
}       
     