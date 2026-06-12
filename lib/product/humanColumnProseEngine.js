/**
 * Human Column Prose SSOT — 카탈로그·체크리스트 → 사람 칼럼 서사
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import {
  stripCatalogContaminationFromBlogPack,
  stripCatalogContaminationHeading,
  isCatalogContaminationSentence,
  EDITOR_V95_CATALOG_RES,
} from "@/lib/product/catalogContaminationGuard";
import {
  deriveTopicWritingContext,
  topicWritingFacet,
} from "@/lib/content/topicFacetEngine";
import {
  isFlowerRecommendationTopic,
  scrubFlowerRecommendationPack,
} from "@/lib/product/flowerRecommendationProseEngine";
import { buildFlowerRecommendationSectionHeadings } from "@/lib/product/flowerNarrativeProse";
import { rewriteSignatureHeading } from "@/lib/product/signatureWritingEngine";
import { stripGlobalExactDuplicateSentences } from "@/lib/content/duplicateKillerEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";

export const HUMAN_COLUMN_PROSE_VERSION = "human-column-prose-v1";

const CATALOG_HEADING_RES = [
  /보러\s*갔을\s*때/,
  /확인\s*포인트/,
  /선택지로\s*볼\s*때/,
  /짚을\s*점/,
  /종류별로\s*보면/,
  /무인[·•]\s*픽업\s*포인트/,
  /고를\s*때\s*기준\s*정리/,
];

const CATALOG_BODY_RES = [
  /조사해\s*둔\s*내용/,
  /생각보다\s*.+\s*만족도/,
  /비교해\s*보니\s*가격보다/,
  /직접\s*확인해\s*보니\s*색감/,
  /꽃\s*이름[·•]\s*포장/,
  /키오스크\s*주문\s*후\s*픽업함/,
  /전화[·•]\s*방문으로\s*확인/,
  /안내를\s*볼\s*때\s*조사/,
  /자주\s*문의하는\s*시즌[·•]\s*목적별/,
  /만원대\s*꽃다발\s*라인에서\s*거베라\s*조합/,
  /실제로\s*라넌큘러스\s*한\s*송이만/,
  /관리\s*부담이\s*비교적\s*적어\s*실내에\s*두었을\s*때\s*색이/,
  /밝은\s*톤\s*덕분에\s*사진[·•]인증샷/,
  /그랩앤고\s*안내/,
  /메모해\s*두었어요\.?\s*$/,
  /기준으로\s*비교해\s*봤어요/,
];

function isCatalogHeading(heading = "") {
  const h = String(heading || "").trim();
  if (!h) return true;
  if (CATALOG_HEADING_RES.some((re) => re.test(h))) return true;
  const dashes = (h.match(/[\u2013\u2014-]/g) || []).length;
  return dashes >= 2 && /확인|포인트|볼\s*때|정리/.test(h);
}

function rewriteHeadingToNatural(heading, input, index = 0) {
  let h = stripCatalogContaminationHeading(heading);
  h = rewriteSignatureHeading(h, input);

  if (isCatalogHeading(h)) {
    if (isFlowerRecommendationTopic(input)) {
      const pool = buildFlowerRecommendationSectionHeadings(input);
      return pool[index % pool.length];
    }
    const topic = topicWritingFacet(input) || "이용";
    const pool = [
      `${topic}, 알아보게 된 이유`,
      `${topic} — 직접 보면서 느낀 점`,
      `${topic} 고를 때 헷갈리는 부분`,
      "마무리",
    ];
    return pool[index % pool.length];
  }
  return h || buildFlowerRecommendationSectionHeadings(input)[0] || "이어서";
}

export function buildSplitContinuationHeading(baseHeading, splitIndex, input = {}) {
  const base = stripCatalogContaminationHeading(String(baseHeading || "").trim());
  if (/보러\s*갔을|확인\s*포인트|선택지로/.test(base) || !base) {
    return rewriteHeadingToNatural("", input, splitIndex + 1);
  }
  if (splitIndex === 0) return base;
  return `${base} — 이어서`;
}

function isCatalogBodySentence(s = "") {
  const t = String(s || "").trim();
  if (!t || t.length < 8) return false;
  if (isCatalogContaminationSentence(t)) return true;
  return CATALOG_BODY_RES.some((re) => re.test(t));
}

function stripCatalogBody(text = "") {
  const kept = [];
  for (const raw of splitKoreanSentences(String(text || ""))) {
    const s = raw.trim();
    if (!s || s.length < 6) continue;
    if (isCatalogBodySentence(s)) continue;
    kept.push(s);
  }
  return kept.join("\n\n").trim();
}

function dedupeParagraphsGlobally(sections) {
  const seen = new Set();
  return sections
    .map((sec) => {
      const paras = String(sec.body || "")
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter((p) => {
          if (p.replace(/\s/g, "").length < 12) return false;
          const key = p.replace(/\s/g, "").slice(0, 64);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      return { ...sec, body: paras.join("\n\n").trim() };
    })
    .filter((s) => s.body.replace(/\s/g, "").length >= 16);
}

function dedupeDuplicateHeadings(sections, input) {
  const seen = new Set();
  return sections.map((sec, i) => {
    let heading = String(sec.heading || "").trim();
    const key = heading.replace(/\s/g, "").toLowerCase();
    if (key && seen.has(key)) {
      heading = rewriteHeadingToNatural("", input, i + 1);
    }
    if (key) seen.add(key);
    return { ...sec, heading };
  });
}

/** @param {object} pack @param {object} [input] */
export function scoreHumanColumnProseContamination(pack, input = {}) {
  const full = getBlogFullText(pack);
  let hits = 0;
  for (const re of [...CATALOG_HEADING_RES, ...CATALOG_BODY_RES, ...EDITOR_V95_CATALOG_RES]) {
    if (re.test(full)) hits += 1;
  }
  const headings = (pack?.sections || []).map((s) => s.heading).filter(Boolean);
  const unique = new Set(headings.map((h) => h.replace(/\s/g, "")));
  if (headings.length > unique.size) hits += 2;

  return { ok: hits === 0, hits, score: Math.max(0, 100 - hits * 12) };
}

export function needsHumanColumnProsePass(pack, input = {}) {
  if (!pack?.sections?.length || !isBriclogMissionEnforced()) return false;
  if (pack._meta?.humanColumnProsePass) {
    return !scoreHumanColumnProseContamination(pack, input).ok;
  }
  return !scoreHumanColumnProseContamination(pack, input).ok;
}

/**
 * @param {object} pack
 * @param {object} [input]
 * @param {{ force?: boolean }} [options]
 */
export function applyHumanColumnProsePass(pack, input = {}, options = {}) {
  if (!pack?.sections?.length) return pack;
  if (!isBriclogMissionEnforced() && !options.force) return pack;
  if (pack._meta?.humanColumnProsePass && !options.force) {
    const score = scoreHumanColumnProseContamination(pack, input);
    if (score.ok) return pack;
  }

  let next = stripCatalogContaminationFromBlogPack(pack);
  if (isFlowerRecommendationTopic(input)) {
    next = scrubFlowerRecommendationPack(next, input);
  }

  let sections = (next.sections || []).map((sec, i) => ({
    ...sec,
    heading: rewriteHeadingToNatural(sec.heading, input, i),
    body: stripCatalogBody(sec.body),
  }));

  sections = dedupeParagraphsGlobally(sections);
  sections = dedupeDuplicateHeadings(sections, input);

  let title = String(next.title || "").trim();
  if (/보러\s*갔을\s*때|확인\s*포인트/.test(title)) {
    const p = deriveTopicWritingContext(input);
    const facet = topicWritingFacet(input) || p.topicFacet;
    title = `${p.regionBit}${p.brand}, ${facet} 직접 보고 정리해봤습니다`
      .replace(/\s+/g, " ")
      .trim();
  }

  let intro = next.intro ? stripCatalogBody(next.intro) : next.intro;
  let conclusion = next.conclusion ? stripCatalogBody(next.conclusion) : next.conclusion;

  next = stripGlobalExactDuplicateSentences({
    ...next,
    title,
    intro,
    conclusion,
    sections,
  });

  const score = scoreHumanColumnProseContamination(next, input);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      humanColumnProsePass: true,
      humanColumnProseVersion: HUMAN_COLUMN_PROSE_VERSION,
      humanColumnProseScore: score,
    },
  };
}

export function buildHumanColumnNarrativeBrief(input = {}) {
  if (!isBriclogMissionEnforced()) return "";
  const topic = topicWritingFacet(input) || "주제";
  const flower = isFlowerRecommendationTopic(input);
  return `【사람 칼럼 · 서사형 본문 — 카탈로그·체크리스트 금지】
- 「${topic}」을 읽는 사람 칼럼처럼 씁니다. FAQ·확인 포인트·「보러 갔을 때」·「생각보다 만족도」·「조사해 둔 내용」 문장 금지.
- 소제목은 질문·주제형(예: 「여름에는 어떤 꽃을 많이 고를까?」「여름철 꽃은 보관도 중요합니다」). 브랜드명+주제+확인포인트 반복 금지.
- 도입: 계절·상황·방문 계기 2~3문장 → 본문: 꽃/제품별 2~4문장 서사 → 마무리: 실용 추천 1~2문장.
${flower ? "- 꽃 추천: 수국·해바라기·거베라·라넌큘러스를 각각 장면·용도와 연결해 설명. 만족도·키오스크·픽업함 나열 금지." : ""}`;
}
