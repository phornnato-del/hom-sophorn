import { withApiEncryption } from "@/lib/encrypted-api-handler";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/response";
import { isPrismaError, getErrorMessage } from "@/lib/errors";
import { publicUserFields } from "@/lib/validate";
import { UserRequest } from "@/feature/api/admin/type/Request";
import { withImageUrl } from "@/lib/withImageUrl";
import { paginatedResult, parsePaginationParams } from "@/lib/pagination";
import { isAllowedImagePath } from "@/lib/folders";
import {
  createMfaOtpAuthUrl,
  encryptMfaSecret,
  generateMfaSecret,
} from "@/lib/admin-mfa";
import { hasTokenSecret } from "@/lib/admin-auth";


async function getHandler(req: Request) {
  try {
    const parsed = parsePaginationParams(req.url);
    if ("error" in parsed) return fail(parsed.error, 400);
    const { page, pageSize, filter, skip } = parsed.params;
    const where = filter
      ? {
          OR: [
            { name: { contains: filter, mode: "insensitive" as const } },
            { email: { contains: filter, mode: "insensitive" as const } },
            { role: { contains: filter, mode: "insensitive" as const } },
          ],
        }
      : {};
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: publicUserFields,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);
    return ok(paginatedResult(users.map(withImageUrl), total, page, pageSize), "Users retrieved");
  } catch (err: unknown) {
    console.error(err);
    return fail(getErrorMessage(err));
  }
}

async function postHandler(req: Request) {
  try {
    if (!hasTokenSecret()) {
      return fail("Admin token signing secret is not configured on the server", 503);
    }
    const { email, name, password, image } = (await req.json()) as UserRequest;

    if (!email || !password) {
      return fail("Email and password are required", 400);
    }

    if (
      image &&
      (typeof image !== "string" ||
        (!image.startsWith("https://") && !isAllowedImagePath(image)))
    ) {
      return fail("Invalid image path or URL", 400);
    }

    const secret = generateMfaSecret();
    const user = await prisma.user.create({
      data: {
        email,
        name,
        image: image || null,
        password: await bcrypt.hash(password, 10),
        mfaSecret: encryptMfaSecret(secret),
        mfaEnabled: false,
      },
      select: publicUserFields,
    });

    return ok(
      {
        ...user,
        mfaSetupUri: createMfaOtpAuthUrl(secret, name?.trim() || email),
      },
      "User created. Verify an authenticator code to activate this account.",
      201,
    );
  } catch (err: unknown) {
    console.error(err);
    if (isPrismaError(err) && err.code === "P2002") {
      return fail("Email already exists", 409);
    }
    return fail(getErrorMessage(err));
  }
}

export const GET = withApiEncryption(getHandler);
export const POST = withApiEncryption(postHandler);
