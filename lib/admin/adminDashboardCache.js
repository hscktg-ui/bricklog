/**
 * Short in-memory TTL for heavy admin dashboard extras.
 * Avoids duplicate 30d scans when stats + advisory load together or poll.
 */

const DEFAULT_TTL_MS = 45_000;

/** @type {{ at: number, key: string, value: any } | null} */
let extrasCache = null;
/** @type {{ key: string, promise: Promise<any> } | null} */
let extrasInflight = null;

export function getAdminExtrasCacheTtlMs() {
  const n = Number(process.env.BRICLOG_ADMIN_DASH_CACHE_MS);
  return Number.isFinite(n) && n >= 5_000 ? n : DEFAULT_TTL_MS;
}

/**
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} loader
 * @param {{ ttlMs?: number, force?: boolean }} [opts]
 * @returns {Promise<T>}
 */
export async function withAdminExtrasCache(key, loader, opts = {}) {
  const ttlMs = opts.ttlMs ?? getAdminExtrasCacheTtlMs();
  const now = Date.now();
  if (
    !opts.force &&
    extrasCache &&
    extrasCache.key === key &&
    now - extrasCache.at < ttlMs
  ) {
    return extrasCache.value;
  }
  if (!opts.force && extrasInflight && extrasInflight.key === key) {
    return extrasInflight.promise;
  }

  const promise = Promise.resolve()
    .then(() => loader())
    .then((value) => {
      extrasCache = { at: Date.now(), key, value };
      if (extrasInflight?.promise === promise) extrasInflight = null;
      return value;
    })
    .catch((err) => {
      if (extrasInflight?.promise === promise) extrasInflight = null;
      throw err;
    });

  extrasInflight = { key, promise };
  return promise;
}

export function clearAdminExtrasCache() {
  extrasCache = null;
  extrasInflight = null;
}
