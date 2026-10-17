import { ProjectRequest } from "@/feature/api/project/type/ProjectReuest"
import { getErrorMessage } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { fail, ok } from "@/lib/response"
import { withImageUrl } from "@/lib/withImageUrl"

const projectSelect = {
  id: true,
  image: true,
  title: true,
  desc: true,
  technology: true,
  git_link: true,
  live_link: true,
}

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      select: projectSelect,
      orderBy: { createdAt: "desc" },
    })

    return ok(projects.map(withImageUrl), "Projects retrieved")
  } catch (error: unknown) {
    console.error(error)
    return fail(getErrorMessage(error))
  }
}

export async function POST(req: Request) {
  try {
    const { image, title, desc, technology, git_link, live_link } =
      (await req.json()) as ProjectRequest

    if (!image || !title || !desc || !technology || !git_link || !live_link) {
      return fail("All fields are required", 400)
    }

    const project = await prisma.project.create({
      data: { image, title, desc, technology, git_link, live_link },
      select: projectSelect,
    })

    return ok(withImageUrl(project), "Project created", 201)
  } catch (error: unknown) {
    console.error(error)
    return fail(getErrorMessage(error))
  }
}