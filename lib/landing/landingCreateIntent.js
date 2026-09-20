/**
 * 랜딩 CTA → 가입/로그인 → 작업실 첫 생성 화면으로 의도 전달
 * URL query가 auth 과정에서 사라져도 sessionStorage로 복원
 */
const STORAGE_KEY = "briclog-landing-create-intent";
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

function normalizeCreate(create) {
  const raw = String(create || "").trim().toLowerCase();
  if (!raw) return "blog";
  if (raw === "detail" || raw === "detail-page" || raw === "detailpage") return "detailPage";
  if (raw === "instagram") return "insta";
  if (raw === "image") return "plan";
  if (["blog", "place", "insta", "plan", "detailPage"].includes(raw)) return raw;
  return "blog";
}

/**
 * @param {{
 *   create?: string,
 *   topic?: string,
 *   trendContext?: string,
 *   brandName?: string,
 *   region?: string,
 * }} intent
 */
export function stashLandingCreateIntent(intent = {}) {
  if (typeof window === "undefined") return;
  const create = normalizeCreate(intent.create || "blog");
  const topic = String(intent.topic || intent.trendContext || "").trim();
  const brandName = String(intent.brandName || "").trim();
  const region = String(intent.region || "").trim();
  if (!create && !topic && !brandName && !region) return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        create,
        topic,
        brandName,
        region,
        at: Date.now(),
      })
    );
  } catch {
    /* ignore */
  }
}

export function peekLandingCreateIntent() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.at && Date.now() - parsed.at > MAX_AGE_MS) return null;
    return {
      create: normalizeCreate(parsed.create),
      topic: String(parsed.topic || "").trim() || undefined,
      brandName: String(parsed.brandName || "").trim() || undefined,
      region: String(parsed.region || "").trim() || undefined,
    };
  } catch {
    return null;
  }
}

export function consumeLandingCreateIntent() {
  if (typeof window === "undefined") return null;
  try {
    const intent = peekLandingCreateIntent();
    sessionStorage.removeItem(STORAGE_KEY);
    return intent;
  } catch {
    return null;
  }
}

/** URL search params에서 의도 추출·저장 (auth 전 호출) */
export function stashLandingIntentFromUrl(search = "") {
  if (typeof window === "undefined") return null;
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;
  const create = params.get("create") || "";
  const topic = params.get("topic") || params.get("trendContext") || "";
  const brandName = params.get("brandName") || "";
  const region = params.get("region") || "";
  if (!create && !topic && !brandName && !region) return null;
  const intent = { create, topic, brandName, region };
  stashLandingCreateIntent(intent);
  return {
    create: normalizeCreate(create),
    topic: topic.trim() || undefined,
    brandName: brandName.trim() || undefined,
    region: region.trim() || undefined,
  };
}
