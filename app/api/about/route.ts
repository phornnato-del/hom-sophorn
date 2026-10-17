import { AboutRequest } from "@/feature/api/about/type/AboutReques";
import { getErrorMessage } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { paginatedResult, parsePaginationParams } from "@/lib/pagination";

const aboutFields = {
  id: true,
  tag: true,
  title: true,
  desc: true,
  Lanuage: true,
  createdAt: true,
} as const;

export async function GET(req: Request) {
  try {
    const parsed = parsePaginationParams(req.url);
    if ("error" in parsed) return fail(parsed.error, 400);
    const { page, pageSize, filter, skip } = parsed.params;
    const where = filter
      ? {
          OR: [
            { tag: { contains: filter, mode: "insensitive" as const } },
            { title: { contains: filter, mode: "insensitive" as const } },
            { desc: { contains: filter, mode: "insensitive" as const } },
            { Lanuage: { contains: filter, mode: "insensitive" as const } },
          ],
        }
      : {};
    const [abouts, total] = await Promise.all([
      prisma.about.findMany({
        where,
        select: aboutFields,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.about.count({ where }),
    ]);

    return ok(paginatedResult(abouts, total, page, pageSize), "About retrieved");
  } catch (error: unknown) {
    console.error(error);
    return fail(getErrorMessage(error));
  }
}

export async function POST(req: Request) {
  try {
    const { tag, title, desc, Lanuage } = (await req.json()) as AboutRequest;

    if (!tag || !title || !desc || !Lanuage) {
      return fail("All fields are required", 400);
    }

    const about = await prisma.about.create({
      data: { tag, title, desc, Lanuage },
      select: aboutFields,
    });

    return ok(about, "About created", 201);
  } catch (error: unknown) {
    console.error(error);
    return fail(getErrorMessage(error));
  }
}