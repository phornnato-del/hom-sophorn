import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "admin_token";

type AdminTokenPayload = {
  sub: string;
  exp: number;
};

function getTokenSecret() {
  return process.env.ADMIN_TOKEN_SECRET;
}

export function hasTokenSecret() {
  return Boolean(getTokenSecret());
}

export function createAdminToken(userId: string, lifetimeSeconds: number) {
  const secret = getTokenSecret();
  if (!secret) throw new Error("Admin token signing secret is not configured");

  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload: AdminTokenPayload = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + lifetimeSeconds,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const unsignedToken = `${header}.${encodedPayload}`;
  const signature = createHmac("sha256", secret).update(unsignedToken).digest("base64url");

  return `${unsignedToken}.${signature}`;
}

export function getAdminTokenUserId(token: string | undefined): string | null {
  const secret = getTokenSecret();
  if (!secret || !token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSignature = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest();

  let suppliedSignature: Buffer;
  try {
    suppliedSignature = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const decodedHeader = JSON.parse(Buffer.from(header, "base64url").toString()) as { alg?: string };
    const decodedPayload = JSON.parse(Buffer.from(payload, "base64url").toString()) as AdminTokenPayload;
    const isValid =
      decodedHeader.alg === "HS256" &&
      typeof decodedPayload.sub === "string" &&
      decodedPayload.sub.length > 0 &&
      Number.isInteger(decodedPayload.exp) &&
      decodedPayload.exp > Math.floor(Date.now() / 1000);
    return isValid ? decodedPayload.sub : null;
  } catch {
    return null;
  }
}

export function isValidAdminToken(token: string | undefined) {
  return getAdminTokenUserId(token) !== null;
}