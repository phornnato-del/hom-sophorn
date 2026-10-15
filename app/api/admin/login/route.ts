import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_SESSION_COOKIE,
  createAdminToken,
  hasTokenSecret,
} from "@/lib/admin-auth";
import { fail, ok } from "@/lib/response";

type LoginBody = {
  name?: string;
  password?: string;
  remember?: boolean;
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

  const { name, password, remember = false } = body;
  if (typeof name !== "string" || !name.trim() || typeof password !== "string" || !password) {
    return fail("Name and password are required", 400);
  }

  try {
    const admins = await prisma.user.findMany({
      where: { name: name.trim(), role: "admin" },
      select: { id: true, password: true },
    });

    let authenticatedUserId: string | undefined;
    for (const admin of admins) {
      if (await bcrypt.compare(password, admin.password)) {
        authenticatedUserId = admin.id;
        break;
      }
    }
    if (!authenticatedUserId) return fail("Invalid name or password", 401);

    const lifetimeSeconds = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
    const token = createAdminToken(authenticatedUserId, lifetimeSeconds);
    const response = ok({ authenticated: true }, "Login successful");
    response.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: lifetimeSeconds,
    });

    return response;
  } catch (err: unknown) {
    console.error(err);
    return fail("Unable to sign in right now", 500);
  }
}

export async function DELETE() {
  const response = NextResponse.json({ code: 200, message: "Logged out", data: null });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}