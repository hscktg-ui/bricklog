/**
 * BRICLOG Experience + Opinion Engine
 *
 * 정보 → 설명 → 관찰 → 의견 순서
 * 주요 정보에는 관찰·경험·의견 중 최소 1개 연결
 * 건조한 사실 나열(「~특징입니다」「~조절할 수 있습니다」) 금지
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import { buildFlowerNarrativeParagraphs } from "@/lib/product/flowerNarrativeProse";
import { isFlowerRecommendationTopic } from "@/lib/product/flowerRecommendationProseEngine";
function splitExperienceSentences(text = "") {
  return String(text || "")
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8);
}

export const EXPERIENCE_OPINION_VERSION = "exp-opinion-v1";
export const EXPERIENCE_OPINION_PASS_RATE = 0.8;

/** 건조 사실 문장 — 관찰·경험 없이 스펙만 나열 */
export const DRY_FACT_BAN_RES = [
  /^.+은\s+.+(?:특징|특성)(?:입니다|이에요|이라)/,
  /^.+는\s+.+(?:특징|특성)(?:입니다|이에요|이라)/,
  /특징이라\s+(?:집들이|선물|개업)/,
  /조절할\s*수\s*있습니다/,
  /사용됩니다\.?\s*$/,
  /선택됩니다\.?\s*$/,
  /유리합니다\.?\s*$/,
];

const EXPERIENCE_OPINION_MARKERS = [
  {
    id: "observation",
    re: /느껴질|차이가|높은\s*편|쉬운\s*편|눈에\s*들어|눈에\s*띄|직접\s*확인|앉아\s*보면|한\s*다발|한\s*송이/,
  },
  {
    id: "experience",
    re: /실제로|앉아\s*보면|앉아\s*보|직접|한\s*다발|한\s*송이|현장에서|쇼룸에서|맞춰\s*보면/,
  },
  {
    id: "opinion",
    re: /생각보다|편안함|만족도|부담\s*없|무난|낫습니다|도움이\s*됩니다|좋은\s*편|편한\s*편/,
  },
];

const MAJOR_INFO_RE =
  /수국|해바라기|거베라|라넌큘러스|STRESSLESS|다이닝체어|좌판|등받이|만원|무인|24\s*시간|프랜차이즈/;

export function isBriclogExperienceOpinionEnforced() {
  if (process.env.BRICLOG_EXPERIENCE_OPINION === "false") return false;
  if (process.env.BRICLOG_EXPERIENCE_OPINION === "true") return true;
  return isBriclogResetQualityEnforced();
}

export function isDryFactSentence(text = "") {
  const t = String(text || "").trim();
  if (!t) return false;
  if (DRY_FACT_BAN_RES.some((re) => re.test(t))) {
    return !EXPERIENCE_OPINION_MARKERS.some((m) => m.re.test(t));
  }
  return false;
}

export function sentenceExperienceOpinionAxes(text = "") {
  const t = String(text || "");
  return EXPERIENCE_OPINION_MARKERS.filter((m) => m.re.test(t)).map((m) => m.id);
}

export function isMajorInfoSentence(text = "") {
  return MAJOR_INFO_RE.test(String(text || ""));
}

/** 제목·키워드 나열은 평가 대상에서 제외 */
function isAssessableProseSentence(text = "") {
  const t = String(text || "").trim();
  if (t.length < 20) return false;
  return /[.!?。]$/.test(t) || /(?:습니다|입니다|어요|해요|편입니다|낫습니다|됩니다)/.test(t);
}

export function assessSentenceExperienceGate(text = "") {
  const t = String(text || "").trim();
  if (!t || t.length < 16) return { ok: true, skipped: true };
  if (!isMajorInfoSentence(t)) return { ok: true, skipped: true };
  if (isDryFactSentence(t)) return { ok: false, reasons: ["dry_fact"] };
  const axes = sentenceExperienceOpinionAxes(t);
  if (axes.length < 1) return { ok: false, reasons: ["experience_opinion_missing"] };
  return { ok: true, axes };
}

/**
 * 꽃 — 정보·설명·관찰·의견 (문단당 2~3문장)
 */
export function buildFlowerExperienceOpinionParagraphs(p, input = {}) {
  return buildFlowerNarrativeParagraphs(p, input);
}

/**
 * 체어 — 관찰·경험 중심
 */
export function buildChairExperienceOpinionParagraphs(p, input = {}, product) {
  const brand = p.brand || String(input.brandName || "").trim();
  const regionBit = p.regionBit || "";
  const topicLine =
    String(input.topic || input.mainKeyword || "").trim() || product;

  return [
    `${topicLine}는 스트레스리스 라인의 다이닝체어로, 거실·식탁 겸용 공간에서 리클라인과 팔걸이 조절이 핵심입니다. 실제로 앉아보면 좌판 깊이·등받이 각도 차이가 먼저 느껴집니다.`,
    `식사·작업을 오래 하면 좌판 깊이와 등받이 각도 차이가 먼저 느껴집니다. 실제로 앉아보면 체형마다 편안한 지점이 달라지는 부분입니다.`,
    `의자를 고를 때 생각보다 좌판 높이 차이가 크게 느껴질 수 있습니다. 실제로 앉아보면 체형에 따라 편안함 차이가 생기는 부분입니다.`,
    `${topicLine}는 거실·식탁 겸용 공간에서 자세를 바꿀 때 리클라인 반응이 체감되는 편이라, 팔걸이·등받이 각도를 먼저 비교하는 편이 낫습니다.`,
    `${regionBit}${brand} 프랜차이즈 쇼룸에서는 스트레스리스 체어 모델 구성이 지점마다 달라, 앉은 높이·등받이 지지를 나란히 비교해 보는 편이 좋습니다.`,
    `팔걸이와 좌판 쿠션 밀도 차이는 식탁 높이·팔꿈치 각도에 영향을 주므로, 실제 테이블 높이에 맞춰 앉아 보는 것이 선택 기준입니다.`,
    `가죽·패브릭 마감은 관리 방법과 내구성이 달라 보이므로, ${brand}에서 안내하는 소재별 관리 조건을 같이 보면 거실 톤과도 맞추기 쉽습니다.`,
    `배송·조립·A/S 범위는 행사·계약 시점마다 차이가 있어, ${regionBit}${brand}에서 받은 조건을 메모해 두면 이후 비교에 도움이 됩니다.`,
  ];
}

function assessParagraphExperienceBlock(text = "") {
  const t = String(text || "").trim();
  if (!t || t.length < 16) return { ok: true, skipped: true };
  if (isDryFactSentence(t)) return { ok: false, reasons: ["dry_fact"] };
  if (!isMajorInfoSentence(t)) return { ok: true, skipped: true };
  const hasMarker = EXPERIENCE_OPINION_MARKERS.some((m) => m.re.test(t));
  return hasMarker ? { ok: true } : { ok: false, reasons: ["experience_opinion_missing"] };
}

export function assessExperienceOpinionQuality(pack, input = {}) {
  const bodyText = (pack.sections || []).map((s) => String(s.body || "")).join("\n");
  const full = bodyText.trim() || getBlogFullText(pack);

  if (isFlowerRecommendationTopic(input)) {
    const blocks = full
      .split(/\n\n+/)
      .map((s) => s.trim())
      .filter((s) => s.replace(/\s/g, "").length >= 16);
    if (!blocks.length) {
      return { ok: false, rate: 0, total: 0, withExperience: 0, dryFacts: 0 };
    }
    let major = 0;
    let withExperience = 0;
    let dryFacts = 0;
    const failures = [];
    for (const block of blocks) {
      if (isDryFactSentence(block)) {
        dryFacts += 1;
        failures.push(`dry:${block.slice(0, 40)}`);
        continue;
      }
      if (!isMajorInfoSentence(block)) continue;
      major += 1;
      const gate = assessParagraphExperienceBlock(block);
      if (gate.ok && !gate.skipped) withExperience += 1;
      else if (!gate.ok) failures.push(...(gate.reasons || []).map((r) => `${r}:${block.slice(0, 32)}`));
    }
    const rate = major > 0 ? withExperience / major : 1;
    return {
      ok: rate >= EXPERIENCE_OPINION_PASS_RATE && dryFacts === 0,
      rate,
      major,
      withExperience,
      dryFacts,
      failures: failures.slice(0, 12),
    };
  }

  const sentences = splitExperienceSentences(full);
  if (!sentences.length) {
    return { ok: false, rate: 0, total: 0, withExperience: 0, dryFacts: 0 };
  }

  let major = 0;
  let withExperience = 0;
  let dryFacts = 0;
  const failures = [];

  for (const s of sentences) {
    if (isDryFactSentence(s)) {
      dryFacts += 1;
      failures.push(`dry:${s.slice(0, 40)}`);
      continue;
    }
    if (!isMajorInfoSentence(s) || !isAssessableProseSentence(s)) continue;
    major += 1;
    const gate = assessSentenceExperienceGate(s);
    if (gate.ok && !gate.skipped) withExperience += 1;
    else if (!gate.ok) failures.push(...(gate.reasons || []).map((r) => `${r}:${s.slice(0, 32)}`));
  }

  const rate = major > 0 ? withExperience / major : 1;
  return {
    ok: rate >= EXPERIENCE_OPINION_PASS_RATE && dryFacts === 0,
    rate,
    major,
    withExperience,
    dryFacts,
    failures: failures.slice(0, 12),
  };
}

export function isExperienceOpinionDefect(text = "", input = {}) {
  if (!isBriclogExperienceOpinionEnforced()) return false;
  const t = String(text || "").trim();
  if (!t) return true;
  if (isDryFactSentence(t)) return true;
  if (!isMajorInfoSentence(t) || !isAssessableProseSentence(t)) return false;
  const gate = assessSentenceExperienceGate(t);
  return !gate.ok && !gate.skipped;
}

export function filterExperienceOpinionDefects(lines = [], input = {}) {
  return lines.filter((line) => !isExperienceOpinionDefect(line, input));
}
