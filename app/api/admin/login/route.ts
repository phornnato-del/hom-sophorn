import { withApiEncryption } from "@/lib/encrypted-api-handler";
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
import { recordAdminLoginAttempt } from "@/lib/admin-login-audit";
import {
  checkAdminAccessRateLimit,
  checkAdminLoginRateLimit,
} from "@/lib/rate-limit";

type LoginBody = {
  name?: string;
  password?: string;
  remember?: boolean;
  code?: string;
};

const MAX_ADMIN_LOGIN_FAILURES = 3;
const ADMIN_LOGIN_BLOCK_MS = 60 * 60 * 1000;

function failedLoginResponse(
  request: Request,
  message: string,
  status = 401,
) {
  const rateLimit = checkAdminAccessRateLimit(
    request,
    true,
    new URL(request.url).pathname,
  );
  if (!rateLimit.allowed) {
    const response = fail("Too many sign-in attempts. Try again later.", 429);
    response.headers.set("Retry-After", String(rateLimit.retryAfter));
    return response;
  }

  return fail(message, status);
}

function blockedLoginResponse(retryAfter: number) {
  const response = fail("Too many failed sign-in attempts. Try again later.", 429);
  response.headers.set("Retry-After", String(retryAfter));
  return response;
}

async function getAccountLockoutResponse(
  userId: string,
  attempts: number,
  blockedUntil: Date | null,
) {
  const now = new Date();
  if (blockedUntil && blockedUntil > now) {
    return blockedLoginResponse(
      Math.max(1, Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000)),
    );
  }

  if (attempts < MAX_ADMIN_LOGIN_FAILURES) return null;

  if (blockedUntil && blockedUntil <= now) {
    await prisma.user.updateMany({
      where: { id: userId, attempts: { gte: MAX_ADMIN_LOGIN_FAILURES } },
      data: { attempts: 0, attemptBlockedUntil: null },
    });
    return null;
  }

  const lockUntil = new Date(now.getTime() + ADMIN_LOGIN_BLOCK_MS);
  await prisma.user.updateMany({
    where: {
      id: userId,
      attempts: { gte: MAX_ADMIN_LOGIN_FAILURES },
      attemptBlockedUntil: null,
    },
    data: { attemptBlockedUntil: lockUntil },
  });
  return blockedLoginResponse(Math.ceil(ADMIN_LOGIN_BLOCK_MS / 1000));
}

async function recordAdminLoginFailure(userId: string) {
  await prisma.user.updateMany({
    where: {
      id: userId,
      attempts: { lt: MAX_ADMIN_LOGIN_FAILURES },
      OR: [
        { attemptBlockedUntil: null },
        { attemptBlockedUntil: { lte: new Date() } },
      ],
    },
    data: { attempts: { increment: 1 } },
  });
}

async function postHandler(req: Request) {
  const rateLimit = checkAdminLoginRateLimit(req);
  if (!rateLimit.allowed) {
    const response = fail("Too many sign-in requests. Please try again later.", 429);
    response.headers.set("Retry-After", String(rateLimit.retryAfter));
    return response;
  }

  if (!hasTokenSecret()) {
    return fail("Admin token signing secret is not configured on the server", 503);
  }

  let body: LoginBody;
  try {
    body = (await req.json()) as LoginBody;
  } catch {
    return failedLoginResponse(req, "Invalid request body", 400);
  }

  if (typeof body.code === "string") {
    const cookieStore = await cookies();
    const pendingUserId = getAdminTokenUserId(
      cookieStore.get(ADMIN_MFA_COOKIE)?.value,
      "mfa-pending",
    );
    if (!pendingUserId) {
      return failedLoginResponse(
        req,
        "Your verification session expired. Sign in again.",
      );
    }

    try {
      const admin = await prisma.user.findUnique({
        where: { id: pendingUserId, role: "admin" },
        select: {
          id: true,
          mfaSecret: true,
          mfaEnabled: true,
          attempts: true,
          attemptBlockedUntil: true,
        },
      });
      if (admin) {
        const lockoutResponse = await getAccountLockoutResponse(
          admin.id,
          admin.attempts,
          admin.attemptBlockedUntil,
        );
        if (lockoutResponse) return lockoutResponse;
      }
      if (!/^\d{6}$/.test(body.code)) {
        if (admin) await recordAdminLoginFailure(admin.id);
        return failedLoginResponse(
          req,
          "Enter the 6-digit authenticator code",
          400,
        );
      }
      if (!admin?.mfaSecret) {
        return failedLoginResponse(
          req,
          "Authenticator setup is unavailable. Sign in again to restart setup.",
          401,
        );
      }
      if (!verifyMfaCode(decryptMfaSecret(admin.mfaSecret), body.code)) {
        await recordAdminLoginFailure(admin.id);
        return failedLoginResponse(req, "Invalid authenticator code");
      }

      await prisma.user.update({
        where: { id: admin.id },
        data: { mfaEnabled: true, attempts: 0, attemptBlockedUntil: null },
      });

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
    return failedLoginResponse(req, "Name and password are required", 400);
  }

  try {
    const admins = await prisma.user.findMany({
      where: { name: name.trim(), role: "admin" },
      select: {
        id: true,
        password: true,
        mfaSecret: true,
        mfaEnabled: true,
        attempts: true,
        attemptBlockedUntil: true,
      },
    });

    for (const admin of admins) {
      const lockoutResponse = await getAccountLockoutResponse(
        admin.id,
        admin.attempts,
        admin.attemptBlockedUntil,
      );
      if (lockoutResponse) return lockoutResponse;
    }

    let authenticatedAdmin: (typeof admins)[number] | undefined;
    for (const admin of admins) {
      if (await bcrypt.compare(password, admin.password)) {
        authenticatedAdmin = admin;
        break;
      }
    }
    if (!authenticatedAdmin) {
      if (admins.length > 0) {
        await prisma.user.updateMany({
          where: {
            name: name.trim(),
            role: "admin",
            attempts: { lt: MAX_ADMIN_LOGIN_FAILURES },
            OR: [
              { attemptBlockedUntil: null },
              { attemptBlockedUntil: { lte: new Date() } },
            ],
          },
          data: { attempts: { increment: 1 } },
        });
      }
      return failedLoginResponse(req, "Invalid name or password");
    }

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

async function deleteHandler() {
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

export async function POST(request: Request) {
  let auditAttemptRecorded = false;
  const encryptedHandler = withApiEncryption<undefined>(
    async (decryptedRequest: Request) => {
      let attemptedUsername: string | null = null;
      let stage = "request";
      try {
        const body: unknown = await decryptedRequest.clone().json();
        if (typeof body === "object" && body !== null) {
          if ("code" in body) stage = "mfa";
          else if ("name" in body || "password" in body) stage = "password";
          if ("name" in body && typeof body.name === "string") {
            attemptedUsername = body.name;
          }
        }
      } catch {
        // Invalid request bodies are still audited with the available request metadata.
      }

      const response = await postHandler(decryptedRequest);
      await recordAdminLoginAttempt(
        decryptedRequest,
        response,
        attemptedUsername,
        stage,
      );
      auditAttemptRecorded = true;
      return response;
    },
  );

  const response = await encryptedHandler(request, undefined);
  if (!auditAttemptRecorded) {
    await recordAdminLoginAttempt(request, response);
  }
  return response;
}

export const DELETE = withApiEncryption(deleteHandler);
