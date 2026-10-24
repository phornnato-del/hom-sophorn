import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ADMIN_SESSION_COOKIE, getAdminTokenUserId } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/response";
import { imageSrc } from "@/lib/imageSrc";

export async function GET() {
  const cookieStore = await cookies();
  const userId = getAdminTokenUserId(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!userId) return fail("Not logged in. Please sign in to continue.", 401);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId, role: "admin" },
      select: { name: true, image: true },
    });
    if (!user) return fail("Admin account not found", 404);

    return ok(
      { name: user.name, imageUrl: user.image ? imageSrc(user.image) : null },
      "Admin profile retrieved",
    );
  } catch (error: unknown) {
    console.error(error);
    return fail("Unable to load admin profile");
  }
}
