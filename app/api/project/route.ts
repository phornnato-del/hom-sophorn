import { withApiEncryption } from "@/lib/encrypted-api-handler";
import { ProjectRequest } from "@/feature/api/project/type/ProjectReuest"
import { getErrorMessage } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { fail, ok } from "@/lib/response"
import { withImageUrl } from "@/lib/withImageUrl"
import { paginatedResult, parsePaginationParams } from "@/lib/pagination"

const projectSelect = {
  id: true,
  image: true,
  title: true,
  desc: true,
  technology: true,
  git_link: true,
  live_link: true,
}

async function getHandler(req: Request) {
  try {
    const parsed = parsePaginationParams(req.url)
    if ("error" in parsed) return fail(parsed.error, 400)
    const { page, pageSize, filter, skip } = parsed.params
    const where = filter
      ? {
          OR: [
            { title: { contains: filter, mode: "insensitive" as const } },
            { desc: { contains: filter, mode: "insensitive" as const } },
            { technology: { contains: filter, mode: "insensitive" as const } },
            { git_link: { contains: filter, mode: "insensitive" as const } },
            { live_link: { contains: filter, mode: "insensitive" as const } },
            { image: { contains: filter, mode: "insensitive" as const } },
          ],
        }
      : {}
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        select: projectSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.project.count({ where }),
    ])

    return ok(paginatedResult(projects.map(withImageUrl), total, page, pageSize), "Projects retrieved")
  } catch (error: unknown) {
    console.error(error)
    return fail(getErrorMessage(error))
  }
}

async function postHandler(req: Request) {
  try {
    const { image, title, desc, technology, git_link, live_link } =
      (await req.json()) as ProjectRequest

    if (!image || !title || !desc || !technology) {
      return fail("Image, title, description, and technologies are required", 400)
    }

    const project = await prisma.project.create({
      data: {
        image,
        title,
        desc,
        technology,
        git_link: git_link ?? "",
        live_link: live_link ?? "",
      },
      select: projectSelect,
    })

    return ok(withImageUrl(project), "Project created", 201)
  } catch (error: unknown) {
    console.error(error)
    return fail(getErrorMessage(error))
  }
}

export const GET = withApiEncryption(getHandler);
export const POST = withApiEncryption(postHandler);
