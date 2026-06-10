/**
 * BRICLOG V3 — RESEARCH → EXPLAIN → WRITE
 * 키워드→문장 변환 금지 · 모든 조사 결과는 설명·이유·활용 중 1+
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import { isUnmannedFlowerShop } from "@/lib/product/flowerRecommendationProseEngine";

export const EXPLAIN_ENGINE_VERSION = "explain-v3";

export const V3_KPI_WEIGHTS = {
  research: 30,
  explain: 40,
  writing: 20,
  seo: 10,
};

export const V3_EXPLAIN_PASS_RATE = 0.85;

/** 실제 정보 없는 문장 — FAIL */
export const HOLLOW_INFO_BAN_RES = [
  /비교해\s*보니\s*기준이\s*보였/,
  /확인해\s*보았습니다/,
  /정리해\s*보았습니다/,
  /고를\s*때\s*도움이\s*됩니다/,
  /기준이\s*달라집니다/,
  /좋은\s*선택이\s*될\s*수\s*있습니다/,
  /특별한\s*경험입니다/,
  /비교해\s*보니\s*기준이\s*보였어요/,
  /정리해\s*보았어요/,
  /고를\s*때\s*도움이\s*돼요/,
  /기준이\s*달라져요/,
  /좋은\s*선택이\s*될\s*수\s*있어요/,
  /특별한\s*경험/,
  /하나씩\s*비교해\s*봤어요\.?\s*$/,
  /톤만\s*맞췄어요\.?\s*$/,
  /무난했어요\.?\s*$/,
];

/** 키워드 → 문장 (설명 없이 이름만 동사에 붙임) */
export const KEYWORD_TO_SENTENCE_RES = [
  /(?:수국|해바라기|거베라|라넌큘러스|튤립|장미|안개꽃|리시안셔스|카네이션)(?:을|를)\s*(?:골랐|선택|비교|확인|봤)/,
  /(?:수국|해바라기|거베라)[·\s]+(?:수국|해바라기|거베라).{0,12}(?:골랐|선택|비교)/,
  /진열대에서\s*.+?\s*비교해\s*봤어요\.?\s*$/,
  /키오스크\s*화면으로\s*먼저\s*골랐어요/,
];

/** 설명 축 — 최소 1개 필요 */
const EXPLAIN_AXIS_RES = [
  { id: "why", re: /왜|이유|때문|덕분|라서|해서|때문에/ },
  { id: "feature", re: /특징|형태|색감|색|톤|향|질감|크기|밀도|지지|기울기|깊이|마감|쿠션|리클라인|무인|24\s*시간|만원|등받이|좌판|앉은\s*높이/ },
  { id: "when", re: /집들이|개업|선물|축하|여름|시즌|늦은\s*시간|처음|부담\s*없|식사|작업|다이닝|거실/ },
  { id: "advantage", re: /장점|쉬운|오래|풍성|밝고|선명|부담\s*없|빠르게|대기\s*없/ },
  { id: "difference", re: /차이|달랐|구분|나눠|비교\s*기준|조합|옵션/ },
];

const REAL_INFO_RES = [
  { id: "name", re: /수국|해바라기|거베라|라넌큘러스|튤립|장미|안개꽃|리시안셔스|STRESSLESS|다이닝체어|좌판|등받이/ },
  { id: "feature", re: /특징|형태|색|톤|향|질감|쿠션|리클라인|무인|키오스크|픽업/ },
  { id: "price", re: /만원|가격|가격대/ },
  { id: "use", re: /집들이|개업|선물|축하|식사|작업|다이닝|거실/ },
  { id: "care", re: /보관|관리|물\s*갈이|직사광선|시들/ },
  { id: "season", re: /여름|봄|가을|겨울|시즌/ },
  { id: "reason", re: /이유|때문|덕분|자주|많이/ },
  { id: "compare", re: /기준|차이|비교|조합|옵션|깊이|각도|높이/ },
];

const FLOWER_EXPLAIN = {
  수국: {
    explain:
      "수국은 풍성한 형태가 특징이라 집들이나 개업 선물용으로 자주 선택됩니다.",
    brandUnmanned:
      "그랩앤고플라워에서는 수국을 활용한 여름 꽃다발 문의가 많은 편입니다.",
    brandStaff:
      "매장에서는 수국 단품·꽃다발 모두 시즌 컬러를 나란히 볼 수 있습니다.",
  },
  해바라기: {
    explain:
      "해바라기는 밝고 선명한 색감 덕분에 축하 꽃다발에 많이 사용됩니다.",
    brandUnmanned:
      "24시간 무인 운영 특성상 늦은 시간 축하 꽃다발을 찾는 분들이 자주 고릅니다.",
    brandStaff: "주말·행사 시즌에는 해바라기 단품 수요가 늘어나는 편입니다.",
  },
  거베라: {
    explain:
      "거베라는 비교적 관리가 쉬운 편이라 꽃을 처음 구매하는 분들도 부담 없이 선택할 수 있습니다.",
    brandUnmanned:
      "만원대 꽃다발 라인업에서 거베라 조합을 바로 맞출 수 있어 첫 구매에 무난합니다.",
    brandStaff: "거베라는 실내에 두었을 때 색이 오래 가는 편으로 선물용으로 묻는 분이 많습니다.",
  },
  라넌큘러스: {
    explain:
      "라넌큘러스는 겹겹이 피는 형태가 특징이라 기념일 선물 톤을 살리기 좋습니다.",
    brandUnmanned: "무인 픽업이라 포장 톤만 미리 정해 두면 라넌큘러스 조합을 빠르게 받을 수 있습니다.",
    brandStaff: "여름철에는 라넌큘러스와 안개꽃을 섞은 톤을 자주 찾습니다.",
  },
  리시안셔스: {
    explain:
      "리시안셔스는 가는 줄기와 작은 꽃이 특징이라 부드러운 분위기의 꽃다발에 쓰입니다.",
    brandUnmanned: "키오스크에서 리시안셔스 포함 조합을 미리 고를 수 있습니다.",
    brandStaff: "리시안셔스는 부케·꽃다발 모두 시즌 재고가 달라 당일 확인이 필요합니다.",
  },
};

export function isBriclogExplainV3Enforced() {
  if (process.env.BRICLOG_EXPLAIN_V3 === "false") return false;
  if (process.env.BRICLOG_EXPLAIN_V3 === "true") return true;
  return isBriclogResetQualityEnforced();
}

export function isHollowInfoSentence(text = "") {
  const t = String(text || "").trim();
  if (!t) return true;
  return HOLLOW_INFO_BAN_RES.some((re) => re.test(t));
}

export function isKeywordToSentenceLeak(text = "") {
  const t = String(text || "").trim();
  if (!t) return false;
  return KEYWORD_TO_SENTENCE_RES.some((re) => re.test(t));
}

export function sentenceExplainAxes(text = "") {
  const t = String(text || "");
  return EXPLAIN_AXIS_RES.filter((a) => a.re.test(t)).map((a) => a.id);
}

export function sentenceRealInfoHits(text = "") {
  const t = String(text || "");
  return REAL_INFO_RES.filter((a) => a.re.test(t)).map((a) => a.id);
}

export function assessSentenceExplainGate(text = "", input = {}) {
  const t = String(text || "").trim();
  const reasons = [];
  if (!t || t.length < 12) reasons.push("too_short");
  if (isHollowInfoSentence(t)) reasons.push("hollow_info");
  if (isKeywordToSentenceLeak(t)) reasons.push("keyword_to_sentence");
  const axes = sentenceExplainAxes(t);
  if (axes.length < 1) reasons.push("explain_axis_missing");
  const info = sentenceRealInfoHits(t);
  if (info.length < 1) reasons.push("real_info_missing");
  return { ok: reasons.length === 0, reasons, axes, info };
}

export function splitExplainSentences(text = "") {
  return String(text || "")
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8);
}

export function buildFlowerExplainedLine(flowerName, input = {}, p = {}) {
  const brand = p.brand || String(input.brandName || "").trim();
  const row = FLOWER_EXPLAIN[flowerName];
  if (!row) return "";
  const unmanned = isUnmannedFlowerShop(input);
  const explain = row.explain;
  let brandLine = unmanned ? row.brandUnmanned : row.brandStaff;
  if (brand && !brandLine.includes(brand)) {
    brandLine = brandLine.replace(/그랩앤고플라워|매장/, brand);
  }
  return `${explain} ${brandLine}`.replace(/\s+/g, " ").trim();
}

export function buildFlowerExplainParagraphs(p, input = {}) {
  const flowers = ["수국", "해바라기", "거베라", "라넌큘러스"];
  const regionBit = p.regionBit || "";
  const brand = p.brand || String(input.brandName || "").trim();
  const unmanned = isUnmannedFlowerShop(input);
  const lines = [
    `여름철 꽃 추천을 찾다 보면 이름만 나열한 글과, 왜 그 꽃을 쓰는지 설명한 글의 차이가 큽니다.`,
    ...flowers.map((name) => buildFlowerExplainedLine(name, input, p)).filter(Boolean),
  ];
  if (unmanned) {
    lines.push(
      `${regionBit}${brand}는 24시간 무인이라 늦은 시간에도 축하·선물용 꽃다발을 맞출 수 있어, 해바라기·거베라 조합 문의가 잦습니다.`
    );
    lines.push(
      `만원대 꽃다발 라인이 있어 첫 구매·소액 선물 때 가격 부담을 줄이기 좋습니다.`
    );
    lines.push(
      `키오스크 주문 후 픽업함 수령이라 대기 없이 마무리할 수 있어, 짧은 일정에 맞추기 수월합니다.`
    );
  } else {
    lines.push(
      `${regionBit}${brand}에서는 시즌 꽃을 진열대에서 색·줄기 길이 기준으로 나란히 볼 수 있습니다.`
    );
  }
  lines.push(
    `여름철 꽃은 직사광선을 피하고 시원한 곳에 두면 색이 오래 가는 편이라, 보관 위치를 미리 정해 두면 좋습니다.`
  );
  return lines;
}

export function buildChairExplainedParagraphs(p, input = {}, product) {
  const brand = p.brand || String(input.brandName || "").trim();
  const regionBit = p.regionBit || "";
  const topicLine =
    String(input.topic || input.mainKeyword || "").trim() || `${product}`;
  return [
    `식사·작업을 한자리에서 오래 하면 의자 지지가 먼저 불편해지는 이유는, 좌판 깊이와 등받이 각도가 체형마다 맞는 지점이 다르기 때문입니다.`,
    `${topicLine}는 리클라인과 좌판 높이를 한자리에서 조절하는 스트레스리스 다이닝체어 라인으로, 거실·식탁 겸용 공간에서 자세를 바꿀 때 유리합니다.`,
    `${regionBit}${brand} 프랜차이즈 쇼룸에서는 스트레스리스 체어 전시 구성이 지점마다 달라, 당일 전시 모델 기준으로 앉은 높이·등받이 지지를 확인하는 것이 좋습니다.`,
    `팔걸이와 좌판 쿠션 밀도 차이는 식탁 높이·팔꿈치 각도에 영향을 주므로, 실제 테이블 옆에서 앉아 보는 것이 선택 기준입니다.`,
    `가죽·패브릭 마감은 관리 방법과 내구성이 달라, 거실 톤과 맞추기 전에 소재별 관리 조건을 함께 보는 편이 낫습니다.`,
    `배송·조립·A/S 범위는 행사·계약 시점에 따라 달라질 수 있어, 안내 받은 조건을 사진으로 남겨 두면 이후 비교에 도움이 됩니다.`,
  ];
}

/**
 * 조사 설명률 — 개수가 아닌 설명 포함 비율
 */
export function assessExplainQuality(pack, input = {}) {
  const full = getBlogFullText(pack);
  const sentences = splitExplainSentences(full);
  if (!sentences.length) {
    return {
      ok: false,
      rate: 0,
      total: 0,
      explained: 0,
      hollow: 0,
      keywordLeaks: 0,
      brandConnected: 0,
      failures: ["no_sentences"],
    };
  }

  let explained = 0;
  let hollow = 0;
  let keywordLeaks = 0;
  let brandConnected = 0;
  const brand = String(input.brandName || "").trim();
  const failures = [];

  for (const s of sentences) {
    if (isHollowInfoSentence(s)) {
      hollow += 1;
      failures.push(`hollow:${s.slice(0, 40)}`);
      continue;
    }
    if (isKeywordToSentenceLeak(s)) {
      keywordLeaks += 1;
      failures.push(`keyword:${s.slice(0, 40)}`);
      continue;
    }
    const gate = assessSentenceExplainGate(s, input);
    if (gate.ok) explained += 1;
    else failures.push(...gate.reasons.map((r) => `${r}:${s.slice(0, 32)}`));
    if (brand.length >= 2 && s.includes(brand)) brandConnected += 1;
  }

  const rate = explained / sentences.length;
  const brandRate = brand.length >= 2 ? brandConnected / sentences.length : 1;

  return {
    ok: rate >= V3_EXPLAIN_PASS_RATE && hollow === 0 && keywordLeaks === 0,
    rate,
    total: sentences.length,
    explained,
    hollow,
    keywordLeaks,
    brandConnected,
    brandRate,
    failures: failures.slice(0, 12),
  };
}

export function assessV3ContentQuality(pack, input = {}, opts = {}) {
  const explain = assessExplainQuality(pack, input);
  const researchRate = opts.researchExplainRate ?? (input.researchFirstDossier?.organized?.coveredCount ? 0.9 : 0.7);
  const writingOk = explain.hollow === 0 && explain.keywordLeaks === 0;
  const seoScore = opts.seoScore ?? 0.75;

  const breakdown = {
    research: Math.round(V3_KPI_WEIGHTS.research * researchRate),
    explain: Math.round(V3_KPI_WEIGHTS.explain * explain.rate),
    writing: writingOk ? V3_KPI_WEIGHTS.writing : Math.round(V3_KPI_WEIGHTS.writing * 0.4),
    seo: Math.round(V3_KPI_WEIGHTS.seo * seoScore),
  };
  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const pass = explain.ok && score >= 85;

  return {
    version: EXPLAIN_ENGINE_VERSION,
    score,
    pass,
    breakdown,
    weights: V3_KPI_WEIGHTS,
    explain,
    shouldWithhold: !pass && isBriclogExplainV3Enforced(),
  };
}

export function isExplainEngineDefect(text = "", input = {}) {
  if (!isBriclogExplainV3Enforced()) return false;
  const t = String(text || "").trim();
  if (!t) return true;
  if (isHollowInfoSentence(t) || isKeywordToSentenceLeak(t)) return true;
  const gate = assessSentenceExplainGate(t, input);
  if (!gate.ok && gate.reasons.includes("hollow_info")) return true;
  if (!gate.ok && gate.reasons.includes("keyword_to_sentence")) return true;
  if (t.length >= 24 && gate.reasons.includes("explain_axis_missing") && gate.reasons.includes("real_info_missing")) {
    return true;
  }
  return false;
}

export function filterExplainDefectSentences(lines = [], input = {}) {
  return lines.filter((line) => !isExplainEngineDefect(line, input));
}
