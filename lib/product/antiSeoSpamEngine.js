/**
 * ANTI SEO SPAM ENGINE — 키워드 반복 삽입 금지 SSOT
 */

import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { resolveIndustryTopicPronouns } from "@/lib/content/placeholderContaminationEngine";

export const ANTI_SEO_SPAM_VERSION = "v1";

/** 동일 토큰(지역·브랜드·주제) 본문 최대 허용 반복 */
export const ANTI_SEO_SPAM_MAX_TOKEN_REPEAT = 3;

export const ANTI_SEO_SPAM_CORE = `【ANTI SEO SPAM ENGINE】
지역명 · 브랜드명 · 주제명 반복 삽입 금지.
동일 키워드 3회 이상 반복 시 동의어 · 대명사 · 상황 설명으로 치환.
브랜드명은 필요한 위치에만 등장.
SEO는 키워드 반복이 아니라 문맥 연관성으로 확보한다.`;

export const ANTI_SEO_SPAM_PRONOUNS = {
  brand: ["매장", "쇼룸", "브랜드"],
  region: ["현장", "근처", "이 지역"],
  /** @deprecated — resolveAntiSeoTopicPronouns(input) 사용 */
  topic: ["이번 안내", "관련 내용", "이번 주제"],
};

/** 업종·주제 맥락 topic 대명사 (가구 「전시 소식」 카페 주입 방지) */
export function resolveAntiSeoTopicPronouns(input = {}) {
  return resolveIndustryTopicPronouns(input);
}

export function isAntiSeoSpamEnforced() {
  return isBriclogMissionEnforced();
}

export function buildAntiSeoSpamPromptBlock() {
  return ANTI_SEO_SPAM_CORE;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {string} text
 * @param {string} token
 */
export function countTokenMentions(text, token) {
  const t = String(token || "").trim();
  if (t.length < 2) return 0;
  return (String(text || "").match(new RegExp(escapeRegExp(t), "gi")) || []).length;
}

/**
 * @param {string} text
 * @param {string} token
 * @param {string[]} substitutes
 * @param {number} [maxRepeat]
 */
function buildTokenRepeatRegex(token) {
  const escaped = escapeRegExp(token);
  if (/\s/.test(token)) {
    return new RegExp(escaped, "gi");
  }
  return new RegExp(`(?<![가-힣])${escaped}(?![가-힣])`, "gi");
}

export function softenTokenRepeats(
  text,
  token,
  substitutes = [],
  maxRepeat = ANTI_SEO_SPAM_MAX_TOKEN_REPEAT
) {
  const t = String(token || "").trim();
  if (!t || t.length < 2 || !substitutes.length) return text;
  let n = 0;
  const re = buildTokenRepeatRegex(t);
  return String(text || "").replace(re, (match) => {
    n += 1;
    if (n <= maxRepeat) return match;
    const sub = substitutes[(n - maxRepeat - 1) % substitutes.length];
    return sub;
  });
}

/**
 * @param {string} fullText
 * @param {{ brandName?: string, region?: string, topic?: string, mainKeyword?: string }} input
 */
export function scoreAntiSeoSpam(fullText, input = {}) {
  if (!isAntiSeoSpamEnforced()) {
    return { ok: true, overused: [], score: 10 };
  }
  const tokens = [
    { key: "brand", value: input.brandName, label: "브랜드명" },
    { key: "region", value: input.region, label: "지역명" },
    {
      key: "topic",
      value: input.topic || input.mainKeyword,
      label: "주제명",
    },
  ].filter((t) => String(t.value || "").trim().length >= 2);

  const overused = tokens
    .map(({ key, value, label }) => {
      const count = countTokenMentions(fullText, value);
      return count > ANTI_SEO_SPAM_MAX_TOKEN_REPEAT
        ? { key, label, token: value, count }
        : null;
    })
    .filter(Boolean);

  return {
    ok: overused.length === 0,
    overused,
    score: overused.length === 0 ? 10 : Math.max(0, 10 - overused.length * 3),
  };
}
