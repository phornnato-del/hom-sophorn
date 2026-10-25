import { withApiEncryption } from "@/lib/encrypted-api-handler";
import { withAdminApiEncryption } from "@/lib/admin-api-handler";
import { ContactRequest } from "@/feature/api/contact/type/ContactRequest"
import { getErrorMessage } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { fail, ok } from "@/lib/response"
import { paginatedResult, parsePaginationParams } from "@/lib/pagination"

const contactSelect = {
  id: true,
  type: true,
  link: true,
}

async function getHandler(req: Request) {
  try {
    const parsed = parsePaginationParams(req.url)
    if ("error" in parsed) return fail(parsed.error, 400)
    const { page, pageSize, filter, skip } = parsed.params
    const where = filter
      ? {
          OR: [
            { type: { contains: filter, mode: "insensitive" as const } },
            { link: { contains: filter, mode: "insensitive" as const } },
          ],
        }
      : {}
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        select: contactSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.contact.count({ where }),
    ])

    return ok(paginatedResult(contacts, total, page, pageSize), "Contacts retrieved")
  } catch (error: unknown) {
    console.error(error)
    return fail(getErrorMessage(error))
  }
}

async function postHandler(req: Request) {
  try {
    const { type, link } = (await req.json()) as ContactRequest

    if (!type || !link) {
      return fail("All fields are required", 400)
    }

    const contact = await prisma.contact.create({
      data: { type, link },
      select: contactSelect,
    })

    return ok(contact, "Contact created", 201)
  } catch (error: unknown) {
    console.error(error)
    return fail(getErrorMessage(error))
  }
}

export const GET = withApiEncryption(getHandler);
export const POST = withAdminApiEncryption(postHandler);
