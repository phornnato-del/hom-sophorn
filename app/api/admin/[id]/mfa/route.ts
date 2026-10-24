import { withApiEncryption } from "@/lib/encrypted-api-handler";
import { prisma } from "@/lib/prisma";
import { isObjectId } from "@/lib/validate";
import {
  createMfaOtpAuthUrl,
  decryptMfaSecret,
  encryptMfaSecret,
  generateMfaSecret,
  verifyMfaCode,
} from "@/lib/admin-mfa";
import { fail, ok } from "@/lib/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type MfaRequest = {
  action?: "verify";
  code?: string;
};

async function postHandler(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!isObjectId(id)) return fail("Invalid id format", 400);

    const body = (await req.json()) as MfaRequest;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, mfaSecret: true },
    });
    if (!user || user.role !== "admin") return fail("Admin user not found", 404);

    if (body.action === "verify") {
      if (typeof body.code !== "string" || !/^\d{6}$/.test(body.code)) {
        return fail("Enter the 6-digit authenticator code", 400);
      }
      if (
        !user.mfaSecret ||
        !verifyMfaCode(decryptMfaSecret(user.mfaSecret), body.code)
      ) {
        return fail("Invalid authenticator code", 401);
      }

      await prisma.user.update({
        where: { id },
        data: { mfaEnabled: true },
      });
      return ok({ mfaEnabled: true }, "Authenticator enabled");
    }

    const secret = generateMfaSecret();
    await prisma.user.update({
      where: { id },
      data: { mfaSecret: encryptMfaSecret(secret), mfaEnabled: false },
    });
    return ok(
      {
        otpauthUrl: createMfaOtpAuthUrl(secret, user.name?.trim() || user.email),
      },
      "Authenticator setup started",
    );
  } catch (error: unknown) {
    console.error(error);
    return fail("Unable to update authenticator setup");
  }
}

export const POST = withApiEncryption(postHandler);
