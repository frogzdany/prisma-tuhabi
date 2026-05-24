// Minimal in-memory sliding-window rate limiter for the triage endpoint.
//
// Trade-off: in-memory means each Vercel serverless instance keeps its own
// counter, so a determined attacker hitting different cold-started instances
// could exceed the limit. Acceptable for a hackathon demo where the goal is
// "prevent accidental bill blow-up", not perfect enforcement. For production,
// swap this for Upstash Redis or Vercel KV (see notes at the bottom of the
// file).

interface Hit {
  /** Epoch ms timestamps of recent requests, sorted ascending. */
  times: number[];
}

const store = new Map<string, Hit>();

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining requests in the current window after this call (0 if blocked). */
  remaining: number;
  /** Epoch ms when the oldest in-window request will fall out of the window. */
  resetAt: number;
  /** Seconds the client should wait before retrying. 0 when allowed. */
  retryAfterSec: number;
}

export interface RateLimitOptions {
  /** Number of requests allowed inside the window. Default 10. */
  limit?: number;
  /** Window size in milliseconds. Default 1 hour. */
  windowMs?: number;
}

export function checkRateLimit(
  key: string,
  { limit = 10, windowMs = 60 * 60 * 1000 }: RateLimitOptions = {}
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hit = store.get(key) ?? { times: [] };

  // Drop expired timestamps so the window slides cleanly.
  while (hit.times.length > 0 && hit.times[0] < cutoff) {
    hit.times.shift();
  }

  if (hit.times.length >= limit) {
    const oldest = hit.times[0] ?? now;
    const resetAt = oldest + windowMs;
    store.set(key, hit);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterSec: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }

  hit.times.push(now);
  store.set(key, hit);

  // Opportunistic GC — keep the store from growing unbounded across IPs.
  // Cheap because it only triggers on a tiny fraction of requests.
  if (Math.random() < 0.01) gc(now - windowMs);

  const remaining = Math.max(0, limit - hit.times.length);
  const oldest = hit.times[0] ?? now;
  return {
    allowed: true,
    remaining,
    resetAt: oldest + windowMs,
    retryAfterSec: 0,
  };
}

function gc(cutoff: number) {
  for (const [k, hit] of store.entries()) {
    while (hit.times.length > 0 && hit.times[0] < cutoff) hit.times.shift();
    if (hit.times.length === 0) store.delete(k);
  }
}

/**
 * Extract the best-effort client IP from a Next.js request's headers.
 * Vercel sets `x-forwarded-for` (comma-separated, client first). We fall back
 * to `x-real-ip` and finally to a literal "anonymous" so the limiter still
 * groups unattributable traffic together.
 */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "anonymous";
}

// --- Notes ----------------------------------------------------------------
// To upgrade to durable rate limiting on Vercel:
//   1. Add a Vercel KV (Upstash Redis) integration to the project.
//   2. `npm i @upstash/ratelimit @upstash/redis`
//   3. Replace `checkRateLimit` with a Ratelimit.slidingWindow(...) call.
// The shape of `RateLimitResult` mirrors what `@upstash/ratelimit` returns,
// so swapping the implementation should not touch the API route.
