import { ProjectRequest } from "@/feature/api/project/type/ProjectReuest"
import { getErrorMessage, isPrismaError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { fail, ok } from "@/lib/response"
import { isObjectId } from "@/lib/validate"
import { withImageUrl } from "@/lib/withImageUrl"

type RouteContext = {
  params: Promise<{ id: string }>
}

const projectSelect = {
  id: true,
  image: true,
  title: true,
  desc: true,
  technology: true,
  git_link: true,
  live_link: true,
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    if (!isObjectId(id)) return fail("Invalid id format", 400)

    const project = await prisma.project.findUnique({
      where: { id },
      select: projectSelect,
    })

    if (!project) return fail("Project not found", 404)
    return ok(withImageUrl(project), "Project retrieved")
  } catch (err: unknown) {
    console.error(err)
    return fail(getErrorMessage(err))
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    if (!isObjectId(id)) return fail("Invalid id format", 400)

    const { image, title, desc, technology, git_link, live_link } =
      (await req.json()) as Partial<ProjectRequest>

    if (!image && !title && !desc && !technology && !git_link && !live_link) {
      return fail("Nothing to update", 400)
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(image && { image }),
        ...(title && { title }),
        ...(desc && { desc }),
        ...(technology && { technology }),
        ...(git_link && { git_link }),
        ...(live_link && { live_link }),
      },
      select: projectSelect,
    })

    return ok(withImageUrl(project), "Project updated")
  } catch (err: unknown) {
    console.error(err)
    if (isPrismaError(err) && err.code === "P2025") {
      return fail("Project not found", 404)
    }
    return fail(getErrorMessage(err))
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    if (!isObjectId(id)) return fail("Invalid id format", 400)

    await prisma.project.delete({ where: { id } })
    return ok(null, "Project deleted")
  } catch (err: unknown) {
    console.error(err)
    if (isPrismaError(err) && err.code === "P2025") {
      return fail("Project not found", 404)
    }
    return fail(getErrorMessage(err))
  }
}