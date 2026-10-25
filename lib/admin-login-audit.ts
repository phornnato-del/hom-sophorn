import { prisma } from "@/lib/prisma";

function headerValue(request: Request, name: string, maxLength = 256) {
  const value = request.headers.get(name)?.trim();
  return value ? value.slice(0, maxLength) : null;
}

function vercelLocationValue(request: Request, name: string) {
  if (process.env.VERCEL !== "1") return null;
  const value = headerValue(request, name, 512);
  if (!value) return null;

  try {
    return decodeURIComponent(value).slice(0, 128);
  } catch {
    return value.slice(0, 128);
  }
}

function getOutcome(response: Response, data: unknown) {
  if (
    typeof data === "object" &&
    data !== null &&
    "data" in data &&
    typeof data.data === "object" &&
    data.data !== null
  ) {
    if ("authenticated" in data.data && data.data.authenticated === true) {
      return "success";
    }
    if ("requiresMfa" in data.data && data.data.requiresMfa === true) {
      return "mfa_required";
    }
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof data.message === "string"
  ) {
    const message = data.message.toLowerCase();
    if (message.includes("authenticator code")) return "mfa_failed";
    if (message.includes("name or password")) return "password_failed";
  }

  if (response.status === 429) return "blocked";
  if (response.status >= 500) return "server_error";
  if (response.status >= 400) return "rejected";

  return "rejected";
}

export async function recordAdminLoginAttempt(
  request: Request,
  response: Response,
  attemptedUsername?: string | null,
  stage = "request",
) {
  let data: unknown = null;
  try {
    data = await response.clone().json();
  } catch {
    // Some early encryption/configuration failures return non-JSON responses.
  }

  const forwardedFor = headerValue(request, "x-forwarded-for", 512);
  const ipAddress =
    headerValue(request, "x-real-ip", 128) ??
    forwardedFor?.split(",").at(-1)?.trim().slice(0, 128) ??
    "unknown";

  try {
    await prisma.adminLoginAttempt.create({
      data: {
        ipAddress,
        attemptedUsername: attemptedUsername?.trim().slice(0, 254) || null,
        country: vercelLocationValue(request, "x-vercel-ip-country"),
        region: vercelLocationValue(request, "x-vercel-ip-country-region"),
        city: vercelLocationValue(request, "x-vercel-ip-city"),
        timezone: vercelLocationValue(request, "x-vercel-ip-timezone"),
        userAgent: headerValue(request, "user-agent", 512),
        requestId:
          headerValue(request, "x-vercel-id", 256) ??
          headerValue(request, "x-request-id", 256),
        stage,
        outcome: getOutcome(response, data),
        statusCode:
          typeof data === "object" &&
          data !== null &&
          "code" in data &&
          typeof data.code === "number"
            ? data.code
            : response.status,
      },
    });
  } catch (error: unknown) {
    console.error("[admin login audit] Failed to store login attempt:", error);
  }
}
