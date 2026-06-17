/**
 * BRICLOG ENGINE V4 — 경험·비교·판단·감각 + 반복·업종·키워드 검수
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { detectExcessiveRepetition, applyRepetitionControl } from "@/lib/content/repetitionEngine";
import {
  detectIndustryContamination,
  stripIndustryContaminationFromPack,
} from "@/lib/product/industryContaminationEngine";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import {
  ANTI_SEO_SPAM_MAX_TOKEN_REPEAT,
  ANTI_SEO_SPAM_PRONOUNS,
  countTokenMentions,
  resolveAntiSeoTopicPronouns,
  softenTokenRepeats,
} from "@/lib/product/antiSeoSpamEngine";
import {
  hasUsableResearchFacts,
  weaveResearchFactsIntoPack,
} from "@/lib/content/researchGroundedHumanPack";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";

export const BRICLOG_ENGINE_V4_VERSION = "v4.1";

const V4_REPETITION_LIMITS = [
  { phrase: "비교해 보니", max: 2 },
  { phrase: "직접 보니", max: 2 },
  { phrase: "확인해 보니", max: 2 },
  { phrase: "살펴보니", max: 2 },
  { phrase: "체험해 보니", max: 2 },
  { phrase: "비교가 수월", max: 1 },
  { phrase: "안내를 고를", max: 1 },
];

const EXPERIENCE_MARKERS =
  /직접|체험|앉아|누워|만져|쇼룸|전시\s*장|현장|들어\s*가\s*보|눌러\s*보|눕|앉|메모해/;
const COMPARE_MARKERS = /비교|차이|기준|옵션|라인업|종\s*중|선택\s*포인트|모델/;
const JUDGMENT_MARKERS = /추천|아쉬|장점|단점|판단|골라|적합|부담|만족|편하/;
const FEELING_MARKERS = /느낌|인상|분위기|무게|쿠션|편안|답답|시원|따뜻|차분|지지/;

const FURNITURE_STRICT_FLOWER_LEAK_RES = [
  /향기(?:와|와\s*컬|를)?/,
  /여름\s*꽃|여름철(?:에는)?\s*어떤\s*꽃/,
  /어떤\s*꽃을\s*고/,
  /리본(?:·|과)?\s*카드|꽃\s*특징|꽃\s*보관|생화|꽃다발|포장·리본|리본\s*샘플/,
  /알레르기\s*·\s*원재료|원재료\s*표기|성분\s*·\s*원재료|급여\s*방법/,
];

const FURNITURE_BROAD_TEMPLATE_LEAK_RES = [
  /계절별\s*추천\s*조합|관리\s*난이도|선물\s*목적|생일\s*·\s*축하/,
  /색감·보관|색감과\s*유지\s*기간.*꽃|컬러\s*톤.*(?:꽃|선물)/,
  /메뉴\s*안내|메뉴에\s*직접\s*들어가/,
];

const FURNITURE_FLOWER_LEAK_RES = [
  ...FURNITURE_STRICT_FLOWER_LEAK_RES,
  ...FURNITURE_BROAD_TEMPLATE_LEAK_RES,
];

function countPhrase(text, phrase) {
  const hay = String(text || "");
  const needle = String(phrase || "");
  if (!needle) return 0;
  let count = 0;
  let pos = 0;
  const lowerHay = hay.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  while ((pos = lowerHay.indexOf(lowerNeedle, pos)) !== -1) {
    count += 1;
    pos += lowerNeedle.length || 1;
  }
  return count;
}

function countClosingHeadings(pack) {
  const headings = (pack?.sections || [])
    .map((s) => String(s.heading || "").trim())
    .filter(Boolean);
  const close = String(pack?.conclusion || "").trim();
  const closingRe = /^(마무리|정리|마치며|끝으로)/;
  let n = headings.filter((h) => closingRe.test(h)).length;
  if (close && closingRe.test(close.slice(0, 8))) n += 1;
  return n;
}

function dedupeClosingSections(pack) {
  if (!pack?.sections?.length) return pack;
  const closingRe = /^(마무리|정리|마치며|끝으로)/;
  let seenClosing = false;
  const sections = [];
  for (const sec of pack.sections) {
    const heading = String(sec.heading || "").trim();
    if (closingRe.test(heading)) {
      if (seenClosing) continue;
      seenClosing = true;
    }
    sections.push(sec);
  }
  let conclusion = pack.conclusion;
  if (conclusion && closingRe.test(String(conclusion).trim().slice(0, 8)) && seenClosing) {
    conclusion = "";
  }
  return { ...pack, sections, conclusion };
}

function scoreV4ParagraphRoles(text) {
  const t = String(text || "");
  return {
    experience: EXPERIENCE_MARKERS.test(t),
    compare: COMPARE_MARKERS.test(t),
    judgment: JUDGMENT_MARKERS.test(t),
    feeling: FEELING_MARKERS.test(t),
  };
}

function furnitureLeakPatterns(input = {}, { strictOnly = false } = {}) {
  const patterns = strictOnly
    ? [...FURNITURE_STRICT_FLOWER_LEAK_RES]
    : [...FURNITURE_FLOWER_LEAK_RES];
  const topicBlob = `${input.topic || ""} ${input.mainKeyword || ""}`;
  if (/라인업|3\s*종|전시/.test(topicBlob) && !/붙박이|붙박/.test(topicBlob)) {
    patterns.push(/붙박이\s*장|붙박이장/);
  }
  return patterns;
}

function stripForeignSentences(text, patterns) {
  const parts = String(text || "")
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\s/g, "").length >= 8);
  if (!parts.length) return String(text || "").trim();
  const kept = parts.filter(
    (sentence) => !patterns.some((re) => re.test(sentence))
  );
  return kept.join("\n\n").trim();
}

function stripFurnitureFlowerLeakFromPack(pack, input = {}, opts = {}) {
  if (resolveBriclogIndustryKey(input) !== "furniture") return pack;
  const patterns = furnitureLeakPatterns(input, opts);
  const beforeChars = getBlogFullText(pack).replace(/\s/g, "").length;
  const strip = (text) => stripForeignSentences(text, patterns);
  const next = {
    ...pack,
    sections: (pack.sections || []).map((sec) => ({
      ...sec,
      heading: strip(sec.heading || ""),
      body: strip(sec.body || ""),
    })),
    conclusion: pack.conclusion ? strip(pack.conclusion) : pack.conclusion,
  };
  const afterChars = getBlogFullText(next).replace(/\s/g, "").length;
  if (beforeChars >= 180 && afterChars < beforeChars * 0.72) {
    return pack;
  }
  return next;
}

function applyAntiSeoSofteningToPack(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic =
    String(input.topic || input.mainKeyword || "").trim().split(/[,，]/)[0] ||
    "";
  const topicAlts = resolveAntiSeoTopicPronouns(input);

  const soften = (text) => {
    let out = String(text || "");
    if (brand.length >= 2) {
      out = softenTokenRepeats(
        out,
        brand,
        ANTI_SEO_SPAM_PRONOUNS.brand,
        ANTI_SEO_SPAM_MAX_TOKEN_REPEAT
      );
    }
    if (region.length >= 2) {
      out = softenTokenRepeats(out, region, ANTI_SEO_SPAM_PRONOUNS.region, 2);
    }
    if (topic.length >= 4) {
      out = softenTokenRepeats(
        out,
        topic,
        topicAlts.length ? topicAlts : ANTI_SEO_SPAM_PRONOUNS.topic,
        ANTI_SEO_SPAM_MAX_TOKEN_REPEAT
      );
    }
    return out;
  };

  return {
    ...pack,
    sections: (pack.sections || []).map((sec) => ({
      ...sec,
      body: soften(sec.body),
      heading: soften(sec.heading),
    })),
    conclusion: pack.conclusion ? soften(pack.conclusion) : pack.conclusion,
  };
}

function enrichV4ThinRoles(pack, input = {}) {
  const assessment = assessBriclogEngineV4(pack, input);
  if (assessment.ok || !assessment.issues.some((i) => i.type === "v4_roles_thin")) {
    return pack;
  }
  if (!hasUsableResearchFacts(input)) return pack;
  return weaveResearchFactsIntoPack(pack, input);
}

/** @returns {{ ok: boolean, score: number, issues: object[], roles: object }}
 */
export function assessBriclogEngineV4(pack, input = {}) {
  const text = getBlogFullText(pack);
  const issues = [];
  const roles = scoreV4ParagraphRoles(text);
  const roleHits = Object.values(roles).filter(Boolean).length;

  for (const { phrase, max } of V4_REPETITION_LIMITS) {
    const n = countPhrase(text, phrase);
    if (n > max) {
      issues.push({ type: "v4_repetition", phrase, count: n, max });
    }
  }

  const brand = String(input.brandName || "").trim();
  if (brand.length >= 3 && countTokenMentions(text, brand) > ANTI_SEO_SPAM_MAX_TOKEN_REPEAT + 2) {
    issues.push({
      type: "v4_keyword_spam",
      token: brand,
      count: countTokenMentions(text, brand),
    });
  }

  const rep = detectExcessiveRepetition(text, { maxPhrase: 3, maxParagraphDup: 4 });
  if (!rep.ok) {
    issues.push(...rep.issues.map((i) => ({ type: "repetition_engine", ...i })));
  }

  if (countClosingHeadings(pack) > 1) {
    issues.push({ type: "duplicate_closing" });
  }

  const industry = detectIndustryContamination(pack, input);
  if (!industry.ok) {
    issues.push({
      type: "industry_contamination",
      lockedKey: industry.lockedKey,
      count: industry.violations?.length || 0,
    });
  }

  if (resolveBriclogIndustryKey(input) === "furniture") {
    const leakHits = furnitureLeakPatterns(input, { strictOnly: true }).filter((re) =>
      re.test(text)
    );
    if (leakHits.length) {
      issues.push({ type: "furniture_flower_leak", count: leakHits.length });
    }
  }

  const industryKey = resolveBriclogIndustryKey(input);
  const needsRichRoles =
    industryKey === "furniture" ||
    /전시|쇼룸|체험|라인업/.test(`${input.topic || ""} ${input.mainKeyword || ""}`);
  if (needsRichRoles && roleHits < 2) {
    issues.push({ type: "v4_roles_thin", roleHits, needsRichRoles: true });
  }

  const score = Math.max(
    0,
    100 -
      issues.filter((i) => i.type === "v4_repetition").length * 8 -
      issues.filter((i) => i.type === "industry_contamination").length * 15 -
      issues.filter((i) => i.type === "duplicate_closing").length * 10 -
      issues.filter((i) => i.type === "v4_roles_thin").length * 5 -
      issues.filter((i) => i.type === "furniture_flower_leak").length * 12 -
      issues.filter((i) => i.type === "v4_keyword_spam").length * 6
  );

  return {
    version: BRICLOG_ENGINE_V4_VERSION,
    ok: issues.length === 0,
    score,
    issues,
    roles,
    industryKey,
  };
}

function softenV4PhraseLimits(pack) {
  if (!pack?.sections?.length) return pack;
  const mapBody = (text) => {
    let out = String(text || "");
    for (const { phrase, max } of V4_REPETITION_LIMITS) {
      let seen = 0;
      const re = new RegExp(phrase, "g");
      out = out.replace(re, (match) => {
        seen += 1;
        return seen <= max ? match : "";
      });
    }
    return out.replace(/\n{3,}/g, "\n\n").trim();
  };
  return {
    ...pack,
    sections: (pack.sections || []).map((sec) => ({
      ...sec,
      body: mapBody(sec.body),
      heading: mapBody(sec.heading),
    })),
    conclusion: pack.conclusion ? mapBody(pack.conclusion) : pack.conclusion,
  };
}

export function stripFurnitureIndustryLeakFromPack(pack, input = {}) {
  return stripFurnitureFlowerLeakFromPack(pack, input, { strictOnly: false });
}

/** V4 송출 패스 — 반복·업종 오염·마무리·키워드·꽃집 잔재 완화 */
export function applyBriclogEngineV4DeliveryPass(pack, input = {}) {
  if (!pack?.sections?.length) return pack;

  const inboundChars = countBlogBodyCharsWithSpaces(pack);
  let next = dedupeClosingSections(pack);
  const before = getBlogFullText(next);
  const preStrip = assessBriclogEngineV4(next, input);
  if (
    preStrip.issues.some(
      (i) =>
        i.type === "furniture_flower_leak" ||
        i.type === "industry_contamination"
    )
  ) {
    next = stripFurnitureFlowerLeakFromPack(next, input, { strictOnly: true });
  }
  next = softenV4PhraseLimits(next);
  next = applyAntiSeoSofteningToPack(next, input);
  next = applyRepetitionControl(next, "blog");
  if (!detectIndustryContamination(next, input).ok) {
    next = stripIndustryContaminationFromPack(next, input);
  }
  if (
    assessBriclogEngineV4(next, input).issues.some(
      (i) => i.type === "furniture_flower_leak"
    )
  ) {
    next = stripFurnitureFlowerLeakFromPack(next, input, { strictOnly: true });
  }
  next = dedupeClosingSections(next);
  next = enrichV4ThinRoles(next, input);

  const assessment = assessBriclogEngineV4(next, input);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      briclogEngineV4: assessment,
      briclogEngineV4Pass: true,
      briclogEngineV4CharsBefore: before.length,
      briclogEngineV4CharsAfter: getBlogFullText(next).length,
      briclogEngineV4InboundChars: inboundChars,
      briclogEngineV4OutboundChars: countBlogBodyCharsWithSpaces(next),
    },
  };
}
