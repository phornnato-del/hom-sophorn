import { ContactRequest } from "@/feature/api/contact/type/ContactRequest"
import { getErrorMessage, isPrismaError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { fail, ok } from "@/lib/response"
import { isObjectId } from "@/lib/validate"

type RouteContext = {
  params: Promise<{ id: string }>
}

const contactSelect = {
  id: true,
  type: true,
  link: true,
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    if (!isObjectId(id)) return fail("Invalid id format", 400)

    const contact = await prisma.contact.findUnique({
      where: { id },
      select: contactSelect,
    })

    if (!contact) return fail("Contact not found", 404)
    return ok(contact, "Contact retrieved")
  } catch (err: unknown) {
    console.error(err)
    return fail(getErrorMessage(err))
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    if (!isObjectId(id)) return fail("Invalid id format", 400)

    const { type, link } = (await req.json()) as Partial<ContactRequest>

    if (!type && !link) {
      return fail("Nothing to update", 400)
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        ...(type && { type }),
        ...(link && { link }),
      },
      select: contactSelect,
    })

    return ok(contact, "Contact updated")
  } catch (err: unknown) {
    console.error(err)
    if (isPrismaError(err) && err.code === "P2025") {
      return fail("Contact not found", 404)
    }
    return fail(getErrorMessage(err))
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    if (!isObjectId(id)) return fail("Invalid id format", 400)

    await prisma.contact.delete({ where: { id } })
    return ok(null, "Contact deleted")
  } catch (err: unknown) {
    console.error(err)
    if (isPrismaError(err) && err.code === "P2025") {
      return fail("Contact not found", 404)
    }
    return fail(getErrorMessage(err))
  }
}