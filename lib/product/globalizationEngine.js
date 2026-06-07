/**
 * GLOBALIZATION SYSTEM — 다국어·국가별 콘텐츠 생태계 SSOT (단순 번역 금지)
 */
export const GLOBALIZATION_VERSION = "v1";

export const SUPPORTED_LOCALES = ["ko", "en", "ja", "zh"];

export const LOCALE_ECOSYSTEM = {
  ko: {
    label: "한국어",
    flag: "KR",
    search: ["Naver"],
    channels: ["blog", "place", "instagram"],
    copyTone: "존댓말·신뢰·지역 맥락",
    seo: "네이버 검색 의도·스마트플레이스",
  },
  en: {
    label: "English",
    flag: "EN",
    search: ["Google"],
    channels: ["blog", "linkedin", "medium"],
    copyTone: "clear, credible, benefit-led",
    seo: "Google intent · LinkedIn professional tone",
  },
  ja: {
    label: "日本語",
    flag: "JP",
    search: ["Google Japan"],
    channels: ["blog", "note"],
    copyTone: "丁寧・信頼・具体",
    seo: "Google Japan · note 読みやすさ",
  },
  zh: {
    label: "中文",
    flag: "CN",
    search: ["Baidu"],
    channels: ["blog", "xiaohongshu", "zhihu"],
    copyTone: "实用·可信·场景化",
    seo: "Baidu · 小红书种草 · 知乎深度",
  },
};

export function detectContentLocale(input = {}, headers = {}) {
  const explicit = String(input.locale || input.language || "").toLowerCase();
  if (SUPPORTED_LOCALES.includes(explicit)) return explicit;
  const accept = String(headers["accept-language"] || headers.acceptLanguage || "");
  if (/ja/i.test(accept)) return "ja";
  if (/zh/i.test(accept)) return "zh";
  if (/en/i.test(accept)) return "en";
  return "ko";
}

export function buildGlobalizationBrief(locale = "ko") {
  const eco = LOCALE_ECOSYSTEM[locale] || LOCALE_ECOSYSTEM.ko;
  return [
    "【GLOBALIZATION · 단순 번역 금지】",
    `언어: ${eco.label} (${eco.flag})`,
    `검색·채널: ${eco.search.join(" · ")} / ${eco.channels.join(" · ")}`,
    `카피·SEO·구조·CTA·예시 — ${eco.copyTone}`,
    eco.seo,
  ].join("\n");
}
