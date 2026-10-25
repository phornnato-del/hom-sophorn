import { isIP } from "node:net";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/request-ip";

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

type IpLocation = {
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  source: string | null;
};

type IpWhoIsResponse = {
  success?: boolean;
  country?: unknown;
  region?: unknown;
  city?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  timezone?: { id?: unknown } | null;
};

type CachedLocation = {
  expiresAt: number;
  location: IpLocation;
};

const LOCATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_LOCATION_CACHE_ENTRIES = 5_000;
const globalForLocationCache = globalThis as typeof globalThis & {
  ipLocationCache?: Map<string, CachedLocation>;
};
const locationCache = (globalForLocationCache.ipLocationCache ??= new Map());

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 128)
    : null;
}

function numberValue(value: unknown, min: number, max: number) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
    ? value
    : null;
}

async function lookupIpLocation(ipAddress: string): Promise<IpLocation> {
  const fallback: IpLocation = {
    country: null,
    region: null,
    city: null,
    timezone: null,
    latitude: null,
    longitude: null,
    source: null,
  };
  if (isIP(ipAddress) === 0 || ipAddress === "unknown") return fallback;

  const now = Date.now();
  const cached = locationCache.get(ipAddress);
  if (cached && cached.expiresAt > now) return cached.location;
  if (cached) locationCache.delete(ipAddress);

  try {
    const response = await fetch(
      `https://ipwho.is/${encodeURIComponent(ipAddress)}`,
      { cache: "no-store", signal: AbortSignal.timeout(2500) },
    );
    if (!response.ok) {
      throw new Error(`IP geolocation provider returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as IpWhoIsResponse;
    if (data.success !== true) return fallback;

    const location: IpLocation = {
      country: stringValue(data.country),
      region: stringValue(data.region),
      city: stringValue(data.city),
      timezone:
        typeof data.timezone === "object" && data.timezone !== null
          ? stringValue(data.timezone.id)
          : null,
      latitude: numberValue(data.latitude, -90, 90),
      longitude: numberValue(data.longitude, -180, 180),
      source: null,
    };
    if (location.latitude !== null && location.longitude !== null) {
      location.source = "ipwho.is";
      if (locationCache.size >= MAX_LOCATION_CACHE_ENTRIES) {
        const oldestKey = locationCache.keys().next().value;
        if (oldestKey) locationCache.delete(oldestKey);
      }
      locationCache.set(ipAddress, {
        location,
        expiresAt: now + LOCATION_CACHE_TTL_MS,
      });
    }
    return location;
  } catch (error: unknown) {
    console.error("[admin login audit] IP geolocation lookup failed:", error);
    return fallback;
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

  const ipAddress = getClientIp(request).slice(0, 128);
  const providerLocation = await lookupIpLocation(ipAddress);
  const country = vercelLocationValue(request, "x-vercel-ip-country");
  const region = vercelLocationValue(request, "x-vercel-ip-country-region");
  const city = vercelLocationValue(request, "x-vercel-ip-city");
  const timezone = vercelLocationValue(request, "x-vercel-ip-timezone");

  try {
    await prisma.adminLoginAttempt.create({
      data: {
        ipAddress,
        attemptedUsername: attemptedUsername?.trim().slice(0, 254) || null,
        country: country ?? providerLocation.country,
        region: region ?? providerLocation.region,
        city: city ?? providerLocation.city,
        timezone: timezone ?? providerLocation.timezone,
        latitude: providerLocation.latitude,
        longitude: providerLocation.longitude,
        locationSource: providerLocation.source,
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
