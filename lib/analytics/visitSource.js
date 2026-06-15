/** Admin·방문 집계용 유입 채널 분류 */

export const VISIT_SOURCE_CHANNELS = [
  "google_organic",
  "naver_organic",
  "daum_organic",
  "google_ads",
  "naver_ads",
  "social",
  "direct",
  "referral",
  "internal",
  "unknown",
];

export const VISIT_SOURCE_LABELS = {
  google_organic: "Google 검색",
  naver_organic: "네이버 검색",
  daum_organic: "다음 검색",
  google_ads: "Google 광고",
  naver_ads: "네이버 광고",
  social: "SNS·메신저",
  direct: "직접 입력·북마크",
  referral: "외부 링크",
  internal: "사이트 내부",
  unknown: "기타",
};

/**
 * @param {{ referrer?: string, utmSource?: string, utmMedium?: string, utmCampaign?: string }} input
 */
export function classifyVisitSource(input = {}) {
  const referrer = String(input.referrer || "").trim();
  const utmSource = String(input.utmSource || "").trim().toLowerCase();
  const utmMedium = String(input.utmMedium || "").trim().toLowerCase();
  const ref = referrer.toLowerCase();

  if (utmMedium === "cpc" || utmMedium === "ppc" || utmMedium === "paid") {
    if (utmSource.includes("naver")) return "naver_ads";
    if (utmSource.includes("google")) return "google_ads";
    return "referral";
  }

  if (utmMedium === "social" || utmSource === "instagram" || utmSource === "kakao") {
    return "social";
  }

  if (ref) {
    if (/briclog\.ai|localhost|127\.0\.0\.1/.test(ref)) return "internal";
    if (/google\.(co\.kr|com)/.test(ref) && !/\/ads\b/.test(ref)) return "google_organic";
    if (/search\.naver|naver\.com\/search|m\.search\.naver/.test(ref)) {
      return "naver_organic";
    }
    if (/search\.daum|daum\.net/.test(ref)) return "daum_organic";
    if (
      /instagram\.|facebook\.|fb\.|t\.co|threads\.|tiktok\.|kakao\.|band\.us|linkedin\./.test(
        ref
      )
    ) {
      return "social";
    }
    if (ref !== "direct") return "referral";
  }

  if (utmSource.includes("google")) return "google_organic";
  if (utmSource.includes("naver")) return "naver_organic";
  if (utmSource) return "referral";

  return "direct";
}

/**
 * @param {string} search
 */
export function parseUtmFromSearch(search = "") {
  const raw = String(search || "").replace(/^\?/, "");
  if (!raw) return {};
  const params = new URLSearchParams(raw);
  return {
    utmSource: params.get("utm_source") || "",
    utmMedium: params.get("utm_medium") || "",
    utmCampaign: params.get("utm_campaign") || "",
  };
}

/**
 * @param {Record<string, string>} [query]
 */
export function pickUtmFromQuery(query = {}) {
  return {
    utmSource: String(query.utm_source || query.utmSource || "").slice(0, 120),
    utmMedium: String(query.utm_medium || query.utmMedium || "").slice(0, 120),
    utmCampaign: String(query.utm_campaign || query.utmCampaign || "").slice(0, 200),
  };
}
