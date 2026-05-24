const TREND_STORE_KEY = "briclog-trend-performance-v1";

const EMPTY_STORE = { brands: {}, recentWinners: [] };

function normalizeStore(raw) {
  if (!raw || typeof raw !== "object") return { ...EMPTY_STORE };
  return {
    brands:
      raw.brands && typeof raw.brands === "object" ? raw.brands : {},
    recentWinners: Array.isArray(raw.recentWinners) ? raw.recentWinners : [],
  };
}

function loadStore() {
  if (typeof window === "undefined") return { ...EMPTY_STORE };
  try {
    const parsed = JSON.parse(
      localStorage.getItem(TREND_STORE_KEY) || "null"
    );
    return normalizeStore(parsed);
  } catch {
    return { ...EMPTY_STORE };
  }
}

function saveStore(data) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TREND_STORE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function recordGenerationSignal(brandId, channel, meta = {}) {
  if (!brandId) return;
  try {
    const store = loadStore();
    if (!store.brands) store.brands = {};
    if (!store.brands[brandId]) store.brands[brandId] = {};
    const ch = store.brands[brandId][channel] || {};
    if (meta.hook) ch.topHook = meta.hook;
    if (meta.opener) ch.topOpener = meta.opener;
    if (meta.title) ch.topTitle = meta.title;
    ch.lastAt = new Date().toISOString();
    store.brands[brandId][channel] = ch;
    store.recentWinners = [
      { brandId, channel, at: ch.lastAt },
      ...(store.recentWinners || []).slice(0, 19),
    ];
    saveStore(store);
  } catch {
    /* 생성 흐름 방해 금지 */
  }
}
