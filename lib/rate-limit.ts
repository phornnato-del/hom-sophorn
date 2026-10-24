type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = {
  entries: Map<string, RateLimitEntry>;
  lastCleanupAt: number;
};

const WINDOW_MS = 60_000;
const MAX_ENTRIES = 10_000;
const CLEANUP_INTERVAL_MS = 60_000;

const globalForRateLimit = globalThis as typeof globalThis & {
  adminLoginRateLimit?: RateLimitStore;
};

const store = (globalForRateLimit.adminLoginRateLimit ??= {
  entries: new Map(),
  lastCleanupAt: 0,
});

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim();

  return clientIp || "unknown";
}

export function checkAdminLoginRateLimit(request: Request) {
  const now = Date.now();

  if (now - store.lastCleanupAt >= CLEANUP_INTERVAL_MS) {
    for (const [key, entry] of store.entries) {
      if (entry.resetAt <= now) store.entries.delete(key);
    }
    store.lastCleanupAt = now;
  }

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
