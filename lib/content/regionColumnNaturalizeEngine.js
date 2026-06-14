/**
 * Region Column Naturalize — SEO 지역 언급은 유지하되 칼럼처럼 읽히게 (반복·제목 도배 억제)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import {
  ANTI_SEO_SPAM_MAX_REGION_REPEAT,
  ANTI_SEO_SPAM_PRONOUNS,
  countTokenMentions,
  softenTokenRepeats,
} from "@/lib/product/antiSeoSpamEngine";
import { applyAntiSeoSpamGate } from "@/lib/content/antiSeoSpamGate";

export const REGION_COLUMN_NATURALIZE_VERSION = "region-column-v1";
/** 본문 전체 지역명 상한 (칼럼 톤) */
export const REGION_COLUMN_MENTION_CAP = 2;

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function resolveRegionMentionCap(input = {}) {
  const prof = input.personaEngineProfile || {};
  const fromPersona = typeof prof.regionMentionMax === "number" ? prof.regionMentionMax : 3;
  return Math.min(fromPersona, REGION_COLUMN_MENTION_CAP);
}

function capRegionInText(text, region, max, state, substitutes) {
  if (!region || region.length < 2) return text;
  const re = new RegExp(escapeRegExp(region), "gi");
  return String(text || "").replace(re, (match) => {
    state.n += 1;
    if (state.n <= max) return match;
    return substitutes[(state.n - max - 1) % substitutes.length];
  });
}

/** 본문 전역 — 지역명 max회만 유지, 이후 대명사 치환 */
export function capRegionMentionsOnPack(pack, input = {}, maxTotal) {
  const region = String(input.region || "").trim();
  if (!region || region.length < 2) return pack;
  const max = maxTotal ?? resolveRegionMentionCap(input);
  const state = { n: 0 };
  const subs = ANTI_SEO_SPAM_PRONOUNS.region;
  const cap = (t) => capRegionInText(t, region, max, state, subs);

  return {
    ...pack,
    title: cap(pack.title),
    representativeTitle: cap(pack.representativeTitle || pack.title),
    sections: (pack.sections || []).map((sec) => ({
      ...sec,
      heading: cap(sec.heading),
      body: cap(sec.body),
    })),
    conclusion: pack.conclusion ? cap(pack.conclusion) : pack.conclusion,
    intro: pack.intro ? cap(pack.intro) : pack.intro,
  };
}

/** 2번째 섹션부터 소제목에서 지역명 제거 — 칼럼형 흐름 */
export function stripRegionFromLateHeadings(pack, input = {}) {
  const region = String(input.region || "").trim();
  if (!region || region.length < 2 || !pack?.sections?.length) return pack;

  const sections = pack.sections.map((sec, idx) => {
    if (idx === 0) return sec;
    let heading = String(sec.heading || "");
    if (!new RegExp(escapeRegExp(region), "i").test(heading)) return sec;
    const re = new RegExp(escapeRegExp(region), "gi");
    heading = heading
      .replace(re, "")
      .replace(/\s+/g, " ")
      .replace(/^[\s·\-–—]+|[\s·\-–—]+$/g, "")
      .trim();
    return { ...sec, heading: heading || sec.heading };
  });
  return { ...pack, sections };
}

/** 지역+브랜드 한 덩어리 SEO 패턴 완화 (「서울 강남○○」 연속) */
function softenRegionBrandStacks(text, input = {}) {
  const region = String(input.region || "").trim();
  const brand = String(input.brandName || "").trim();
  if (!region || !brand) return text;
  const stack = `${region}${brand}`.replace(/\s/g, "");
  if (stack.length < 4) return text;
  let out = String(text || "");
  const re = new RegExp(
    `${escapeRegExp(region)}\\s*${escapeRegExp(brand)}`,
    "gi"
  );
  let hits = 0;
  out = out.replace(re, () => {
    hits += 1;
    return hits <= 1 ? `${region} ${brand}` : brand;
  });
  return out;
}

function softenRegionBrandStacksOnPack(pack, input = {}) {
  const mapText = (t) => softenRegionBrandStacks(t, input);
  return {
    ...pack,
    title: mapText(pack.title),
    representativeTitle: mapText(pack.representativeTitle || pack.title),
    sections: (pack.sections || []).map((sec) => ({
      ...sec,
      heading: mapText(sec.heading),
      body: mapText(sec.body),
    })),
    conclusion: pack.conclusion ? mapText(pack.conclusion) : pack.conclusion,
  };
}

export function scoreRegionColumnNaturalize(fullText, input = {}) {
  const region = String(input.region || "").trim();
  if (!region) return { ok: true, skipped: true, count: 0 };
  const count = countTokenMentions(fullText, region);
  const cap = resolveRegionMentionCap(input);
  return {
    ok: count <= cap,
    count,
    cap,
    region,
  };
}

/**
 * 송출 직전 — 지역 반복 완화 + 소제목 정리 (길이 패딩 없음)
 * @param {object} pack
 * @param {object} [input]
 */
export function applyRegionColumnNaturalizePass(pack, input = {}) {
  if (!pack?.sections?.length || !isBriclogMissionEnforced()) return pack;

  let next = applyAntiSeoSpamGate(pack, { input, ...input });
  next = softenRegionBrandStacksOnPack(next, input);
  next = capRegionMentionsOnPack(next, input, resolveRegionMentionCap(input));
  next = stripRegionFromLateHeadings(next, input);

  const full = getBlogFullText(next);
  if (countTokenMentions(full, input.region) > ANTI_SEO_SPAM_MAX_REGION_REPEAT) {
    next = {
      ...next,
      sections: (next.sections || []).map((sec) => ({
        ...sec,
        body: softenTokenRepeats(
          sec.body,
          input.region,
          ANTI_SEO_SPAM_PRONOUNS.region,
          ANTI_SEO_SPAM_MAX_REGION_REPEAT
        ),
        heading: softenTokenRepeats(
          sec.heading,
          input.region,
          ANTI_SEO_SPAM_PRONOUNS.region,
          1
        ),
      })),
      conclusion: next.conclusion
        ? softenTokenRepeats(
            next.conclusion,
            input.region,
            ANTI_SEO_SPAM_PRONOUNS.region,
            ANTI_SEO_SPAM_MAX_REGION_REPEAT
          )
        : next.conclusion,
    };
  }

  const score = scoreRegionColumnNaturalize(getBlogFullText(next), input);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      regionColumnNaturalize: true,
      regionColumnNaturalizeVersion: REGION_COLUMN_NATURALIZE_VERSION,
      regionMentionCount: score.count,
      regionMentionCap: score.cap,
      regionColumnNaturalizeOk: score.ok,
    },
  };
}
