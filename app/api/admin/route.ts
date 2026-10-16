import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/response";
import { isPrismaError, getErrorMessage } from "@/lib/errors";
import { publicUserFields } from "@/lib/validate";
import { CreateUserBody } from "@/feature/api/admin/type/CreateUserBody";
import { withImageUrl } from "@/lib/withImageUrl";


export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: publicUserFields,
      orderBy: { createdAt: "desc" },
    });
    return ok(users.map(withImageUrl), "Users retrieved");
  } catch (err: unknown) {
    console.error(err);
    return fail(getErrorMessage(err));
  }
}

export async function POST(req: Request) {
  try {
    const { email, name, password, image } = (await req.json()) as CreateUserBody;

    if (!email || !password) {
      return fail("Email and password are required", 400);
    }

    if (image && (typeof image !== "string" )) {
      return fail("Invalid image pls check the image sent", 400);
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        image: image || null,
        password: await bcrypt.hash(password, 10),
      },
      select: publicUserFields,
    });

    return ok(user, "User created", 201);
  } catch (err: unknown) {
    console.error(err);
    if (isPrismaError(err) && err.code === "P2002") {
      return fail("Email already exists", 409);
    }
    return fail(getErrorMessage(err));
  }
}