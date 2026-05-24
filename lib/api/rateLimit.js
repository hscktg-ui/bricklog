/**
 * 간단한 인메모리 rate limit (출시 전 최소 방어 — Redis 미사용)
 */
const buckets = new Map();

export function checkRateLimit(key, { max = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, count: 0 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > max) {
    return { ok: false, retryAfterMs: windowMs - (now - bucket.start) };
  }
  return { ok: true, remaining: max - bucket.count };
}

export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "anonymous";
}
