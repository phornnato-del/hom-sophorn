import { getErrorMessage } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { withImageUrl } from "@/lib/withImageUrl";

export async function GET() {
  try {
    const [projects, about, banners, contacts, admins, recentProjects] =
      await Promise.all([
        prisma.project.count(),
        prisma.about.count(),
        prisma.banner.count(),
        prisma.contact.count(),
        prisma.user.count({ where: { role: "admin" } }),
        prisma.project.findMany({
          select: {
            id: true,
            title: true,
            technology: true,
            image: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

    return ok(
      {
        counts: { projects, about, banners, contacts, admins },
        recentProjects: recentProjects.map(withImageUrl),
        generatedAt: new Date().toISOString(),
      },
      "Dashboard data retrieved",
    );
  } catch (error: unknown) {
    console.error(error);
    return fail(getErrorMessage(error));
  }
}
