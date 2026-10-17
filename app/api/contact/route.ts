import { ContactRequest } from "@/feature/api/contact/type/ContactRequest"
import { getErrorMessage } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { fail, ok } from "@/lib/response"

const contactSelect = {
  id: true,
  type: true,
  link: true,
}

export async function GET() {
  try {
    const contacts = await prisma.contact.findMany({
      select: contactSelect,
      orderBy: { createdAt: "desc" },
    })

    return ok(contacts, "Contacts retrieved")
  } catch (error: unknown) {
    console.error(error)
    return fail(getErrorMessage(error))
  }
}

export async function POST(req: Request) {
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