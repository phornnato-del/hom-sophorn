import { AboutRequest } from "@/feature/api/about/type/AboutReques";
import { getErrorMessage } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";

const aboutFields = {
  id: true,
  tag: true,
  title: true,
  desc: true,
  Lanuage: true,
  createdAt: true,
} as const;

export async function GET() {
  try {
    const abouts = await prisma.about.findMany({
      select: aboutFields,
      orderBy: { createdAt: "desc" },
    });

    return ok(abouts, "About retrieved");
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