/**
 * BRICLOG Experience + Opinion Engine
 *
 * 정보 → 설명 → 관찰 → 의견 순서
 * 주요 정보에는 관찰·경험·의견 중 최소 1개 연결
 * 건조한 사실 나열(「~특징입니다」「~조절할 수 있습니다」) 금지
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
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

function isUnmannedFlower(input = {}) {
  const blob = `${input.storeFeatures || ""} ${input.brandName || ""}`;
  return /무인|24\s*시간|키오스크|그랩앤고/i.test(blob);
}

const FLOWER_EXPERIENCE = {
  수국: (brand, unmanned) => [
    "집들이 꽃다발을 맞출 때 수국은 풍성한 형태 때문에 선물용으로 활용하기 좋습니다.",
    "실제로 한 다발만으로도 풍성해 보이는 느낌이 있어, 선물용 만족도가 높은 편입니다.",
    unmanned
      ? `${brand}에서는 24시간 무인 픽업으로 수국 조합 꽃다발을 바로 받을 수 있습니다.`
      : `${brand} 진열대에서 수국 톤을 나란히 보면 선물용 만족도 차이가 눈에 들어옵니다.`,
  ],
  해바라기: (brand, unmanned) => [
    "축하 꽃다발을 맞출 때 해바라기는 밝은 톤 덕분에 분위기를 살리기 좋습니다.",
    "밝은 톤 덕분에 사진·인증샷에서도 잘 보이는 편이라, 생각보다 선물 만족도가 높습니다.",
    unmanned
      ? `24시간 무인이라 늦은 시간 축하 꽃다발을 바로 맞출 수 있습니다.`
      : `${brand}에서 주말·행사 시즌에는 해바라기 단품 재고 구성이 달라질 수 있습니다.`,
  ],
  거베라: (brand, unmanned) => [
    "꽃을 처음 구매할 때 거베라는 관리 부담이 비교적 적어 부담 없이 고르기 좋습니다.",
    "관리 부담이 비교적 적어 실내에 두었을 때 색이 오래 가는 편이라, 첫 구매 만족도가 높습니다.",
    unmanned
      ? `만원대 꽃다발 라인에서 거베라 조합을 바로 맞출 수 있어, 생각보다 부담 없이 고르는 편입니다.`
      : `${brand}에서 거베라는 선물용 포장 톤 비교가 먼저 이뤄집니다.`,
  ],
  라넌큘러스: (brand, unmanned) => [
    "기념일 선물 톤을 살리려면 라넌큘러스 겹겹이 피는 형태가 도움이 됩니다.",
    "실제로 라넌큘러스 한 송이만 넣어도 분위기가 살아나, 생각보다 소량 구성 만족도가 높습니다.",
    unmanned
      ? `무인 픽업이라 포장 톤만 정해 두면 라넌큘러스 조합을 빠르게 받을 수 있습니다.`
      : `${brand}에서는 라넌큘러스·안개꽃 믹스 톤을 여름철 시즌 컬러로 맞출 수 있습니다.`,
  ],
};

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
  const brand = p.brand || String(input.brandName || "").trim();
  const regionBit = p.regionBit || "";
  const unmanned = isUnmannedFlower(input);
  const lines = [];

  for (const name of ["수국", "해바라기", "거베라", "라넌큘러스"]) {
    const block = FLOWER_EXPERIENCE[name]?.(brand, unmanned) || [];
    lines.push(...block);
  }

  if (unmanned) {
    lines.push(
      `${regionBit}${brand}는 24시간 무인이라 늦은 시간에도 축하·선물용 꽃다발을 맞출 수 있어, 실제로 해바라기·거베라 조합 문의가 잦습니다.`,
      `만원대 꽃다발 라인이 있어 첫 구매·소액 선물 때 생각보다 가격 부담을 줄이기 좋은 편입니다.`,
      `키오스크 주문 후 픽업함 수령이라 대기 없이 마무리할 수 있어, 짧은 일정에도 실제로 맞추기 편한 편입니다.`
    );
  }

  lines.push(
    "여름철 꽃은 직사광선을 피하고 시원한 곳에 두면 색이 오래 가는 편이라, 보관 위치를 미리 정해 두는 편이 낫습니다."
  );

  return lines;
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

export function assessExperienceOpinionQuality(pack, input = {}) {
  const bodyText = (pack.sections || []).map((s) => String(s.body || "")).join("\n");
  const full = bodyText.trim() || getBlogFullText(pack);
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
