import { createSupabasePublicClient } from "@/services/supabase/server";

const buckets = new Map();

async function hashRateLimitKey(key) {
  const value = new TextEncoder().encode(String(key));
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  return request.headers.get("x-real-ip") || "unknown";
}

function checkMemoryRateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + windowMs,
      source: "memory",
    };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      source: "memory",
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: limit - bucket.count,
    resetAt: bucket.resetAt,
    source: "memory",
  };
}

export async function checkRateLimit(
  key,
  { limit = 60, windowMs = 60_000 } = {},
) {
  try {
    const { data, error } = await createSupabasePublicClient().rpc(
      "check_api_rate_limit",
      {
        rate_key_arg: await hashRateLimitKey(key),
        limit_arg: Math.max(1, Math.min(Number(limit) || 60, 10_000)),
        window_seconds_arg: Math.max(
          1,
          Math.min(Math.ceil((Number(windowMs) || 60_000) / 1000), 86_400),
        ),
      },
    );
    if (error) throw error;

    return {
      allowed: Boolean(data?.allowed),
      remaining: Math.max(0, Number(data?.remaining) || 0),
      resetAt: data?.resetAt ? new Date(data.resetAt).getTime() : Date.now(),
      source: "database",
    };
  } catch {
    // Keeps the application usable before the migration is applied and during
    // a transient database outage. Sensitive routes add a second limit by
    // authenticated session or token, so this fallback never becomes identity.
    return checkMemoryRateLimit(key, { limit, windowMs });
  }
}
