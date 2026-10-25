type RateLimitEntry = {
  count: number;
  resetAt: number;
  blockedUntil?: number;
};

type RateLimitStore = {
  entries: Map<string, RateLimitEntry>;
  lastCleanupAt: number;
};

const WINDOW_MS = 60_000;
const MAX_ENTRIES = 10_000;
const CLEANUP_INTERVAL_MS = 60_000;
const ADMIN_ACCESS_WINDOW_MS = 10 * 60_000;
const ADMIN_ACCESS_BLOCK_MS = 60 * 60_000;
const ADMIN_ACCESS_MAX_ATTEMPTS = 4;

const globalForRateLimit = globalThis as typeof globalThis & {
  adminLoginRateLimit?: RateLimitStore;
  adminAccessRateLimit?: RateLimitStore;
};

const store = (globalForRateLimit.adminLoginRateLimit ??= {
  entries: new Map(),
  lastCleanupAt: 0,
});
const accessStore = (globalForRateLimit.adminAccessRateLimit ??= {
  entries: new Map(),
  lastCleanupAt: 0,
});

function getClientKey(request: Request): string {
  const clientIp = request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();

  return clientIp || "unknown";
}

function cleanupExpiredEntries(rateLimitStore: RateLimitStore, now: number) {
  if (now - rateLimitStore.lastCleanupAt < CLEANUP_INTERVAL_MS) return;

  for (const [key, entry] of rateLimitStore.entries) {
    if (Math.max(entry.resetAt, entry.blockedUntil ?? 0) <= now) {
      rateLimitStore.entries.delete(key);
    }
  }
  rateLimitStore.lastCleanupAt = now;
}

export function checkAdminAccessRateLimit(
  request: Request,
  countAttempt: boolean,
  pathname: string,
) {
  const now = Date.now();
  cleanupExpiredEntries(accessStore, now);

  const key = getClientKey(request);
  let entry = accessStore.entries.get(key);
  if (entry?.blockedUntil && entry.blockedUntil > now) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((entry.blockedUntil - now) / 1000)),
    };
  }

  if (!countAttempt) return { allowed: true, retryAfter: 0 };

  if (!entry || entry.resetAt <= now) {
    if (accessStore.entries.size >= MAX_ENTRIES) {
      console.warn("[admin access] Rate-limit capacity reached; denying request", {
        ip: key,
        pathname,
      });
      return { allowed: false, retryAfter: Math.ceil(ADMIN_ACCESS_WINDOW_MS / 1000) };
    }

    entry = { count: 0, resetAt: now + ADMIN_ACCESS_WINDOW_MS };
    accessStore.entries.set(key, entry);
  }

  entry.count += 1;
  const blocked = entry.count >= ADMIN_ACCESS_MAX_ATTEMPTS;
  if (blocked) entry.blockedUntil = now + ADMIN_ACCESS_BLOCK_MS;
  console.warn("[admin access] Unauthenticated admin request", {
    ip: key,
    pathname,
    attempt: entry.count,
    blocked,
  });

  return {
    allowed: !blocked,
    retryAfter: Math.max(
      1,
      Math.ceil(((entry.blockedUntil ?? entry.resetAt) - now) / 1000),
    ),
  };
}

export function checkAdminLoginRateLimit(request: Request) {
  const now = Date.now();

  cleanupExpiredEntries(store, now);

  const key = getClientKey(request);
  let entry = store.entries.get(key);

  if (!entry || entry.resetAt <= now) {
    if (store.entries.size >= MAX_ENTRIES) {
      for (const [storedKey, storedEntry] of store.entries) {
        if (storedEntry.resetAt <= now) store.entries.delete(storedKey);
      }
    }

    if (store.entries.size >= MAX_ENTRIES) {
      return { allowed: false, retryAfter: 60 };
    }

    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.entries.set(key, entry);
  }

  if (entry.count >= 50) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: 50 - entry.count,
    retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}
