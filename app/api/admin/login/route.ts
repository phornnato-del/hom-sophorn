import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_MFA_COOKIE,
  ADMIN_SESSION_COOKIE,
  createAdminToken,
  getAdminTokenUserId,
  hasTokenSecret,
} from "@/lib/admin-auth";
import {
  createMfaOtpAuthUrl,
  decryptMfaSecret,
  encryptMfaSecret,
  generateMfaSecret,
  verifyMfaCode,
} from "@/lib/admin-mfa";
import { fail, ok } from "@/lib/response";

type LoginBody = {
  name?: string;
  password?: string;
  remember?: boolean;
  code?: string;
};

export async function POST(req: Request) {
  if (!hasTokenSecret()) {
    return fail("Admin token signing secret is not configured on the server", 503);
  }

  let body: LoginBody;
  try {
    body = (await req.json()) as LoginBody;
  } catch {
    return fail("Invalid request body", 400);
  }

  if (typeof body.code === "string") {
    if (!/^\d{6}$/.test(body.code)) return fail("Enter the 6-digit authenticator code", 400);
    const cookieStore = await cookies();
    const pendingUserId = getAdminTokenUserId(
      cookieStore.get(ADMIN_MFA_COOKIE)?.value,
      "mfa-pending",
    );
    if (!pendingUserId) return fail("Your verification session expired. Sign in again.", 401);

    try {
      const admin = await prisma.user.findUnique({
        where: { id: pendingUserId, role: "admin" },
        select: { id: true, mfaSecret: true, mfaEnabled: true },
      });
      if (!admin?.mfaSecret) {
        return fail("Authenticator setup is unavailable. Sign in again to restart setup.", 401);
      }
      if (!verifyMfaCode(decryptMfaSecret(admin.mfaSecret), body.code)) {
        return fail("Invalid authenticator code", 401);
      }

      if (!admin.mfaEnabled) {
        await prisma.user.update({
          where: { id: admin.id },
          data: { mfaEnabled: true },
        });
      }

      const lifetimeSeconds = body.remember === true ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
      const response = ok({ authenticated: true }, "Login successful");
      response.cookies.set(ADMIN_SESSION_COOKIE, createAdminToken(admin.id, lifetimeSeconds), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: lifetimeSeconds,
      });
      response.cookies.set(ADMIN_MFA_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 0,
      });
      return response;
    } catch (err: unknown) {
      console.error(err);
      return fail("Unable to verify authenticator code", 500);
    }
  }

  const { name, password } = body;
  if (typeof name !== "string" || !name.trim() || typeof password !== "string" || !password) {
    return fail("Name and password are required", 400);
  }

  try {
    const admins = await prisma.user.findMany({
      where: { name: name.trim(), role: "admin" },
      select: { id: true, password: true, mfaSecret: true, mfaEnabled: true },
    });

    let authenticatedAdmin: (typeof admins)[number] | undefined;
    for (const admin of admins) {
      if (await bcrypt.compare(password, admin.password)) {
        authenticatedAdmin = admin;
        break;
      }
    }
    if (!authenticatedAdmin) return fail("Invalid name or password", 401);

    let otpauthUrl: string | undefined;
    const setupRequired =
      !authenticatedAdmin.mfaEnabled || !authenticatedAdmin.mfaSecret;
    if (setupRequired) {
      const secret = generateMfaSecret();
      await prisma.user.update({
        where: { id: authenticatedAdmin.id },
        data: { mfaSecret: encryptMfaSecret(secret) },
      });
      otpauthUrl = createMfaOtpAuthUrl(secret, name.trim());
    }

    const response = ok(
      { requiresMfa: true, setupRequired, otpauthUrl },
      "Authenticator verification required",
    );
    response.cookies.set(
      ADMIN_MFA_COOKIE,
      createAdminToken(authenticatedAdmin.id, 10 * 60, "mfa-pending"),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 10 * 60,
      },
    );

    return response;
  } catch (err: unknown) {
    console.error(err);
    return fail("Unable to sign in right now", 500);
  }
}

export async function DELETE() {
  const response = NextResponse.json({ code: 200, message: "Logged out", data: null });
  for (const cookie of [ADMIN_SESSION_COOKIE, ADMIN_MFA_COOKIE]) {
    response.cookies.set(cookie, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}