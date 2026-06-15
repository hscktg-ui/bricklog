/**
 * 조사·고유명 주제 프로필 — 스트레스리스 외 업종·브랜드·제품·시술·메뉴명 SSOT
 */
import { topicRaw, isResearchHeavyTopicInput } from "@/lib/content/topicFacetEngine";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import {
  extractFurnitureProductLabel,
  isFurnitureChairProductTopic,
} from "@/lib/product/furnitureProductProseEngine";
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";

export const RESEARCH_PROPER_NOUN_VERSION = "v2-multi";

const GENERIC_MODEL_CODE_RES = [
  /\bSTRESSLESS(?:\s+[A-Z0-9]{2,}){1,4}\b/gi,
  /\bTEMPUR(?:\s+[A-Z0-9-]{2,}){0,3}\b/gi,
  /\b(?:Galaxy|iPhone|iPad|MacBook|AirPods|Surface|ThinkPad)\s+[A-Za-z0-9+\s-]{2,28}\b/gi,
  /\b(?:갤럭시|아이폰|아이패드|맥북)\s*[A-Za-z0-9가-힣+\s-]{2,24}\b/gi,
  /\bSM-[A-Z0-9]{3,}\b/gi,
  /\b[A-Z]{2,}(?:\s+[A-Z0-9]{2,}){1,3}\b/g,
];

const FLOWER_NAME_RES = [
  /수국/,
  /해바라기/,
  /장미/,
  /튤립/,
  /거베라/,
  /라넌큘러스/,
  /리시안셔스/,
  /안개꽃/,
  /프리지아/,
  /국화/,
  /카네이션/,
  /아네모네/,
];

const ALIAS_GROUPS = [
  {
    id: "stressless",
    test: /stressless|스트레스리스/i,
    tokens: ["STRESSLESS", "스트레스리스", "Stressless"],
  },
  {
    id: "tempur",
    test: /tempur|템퍼/i,
    tokens: ["TEMPUR", "Tempur", "템퍼"],
  },
  {
    id: "proaid",
    test: /proaid|프로애드/i,
    tokens: ["PROAID", "프로애드"],
  },
  {
    id: "opimo",
    test: /opimo|오피모/i,
    tokens: ["오피모", "OPIMO"],
  },
  {
    id: "galaxy",
    test: /galaxy|갤럭시/i,
    tokens: ["Galaxy", "갤럭시", "GALAXY"],
  },
  {
    id: "iphone",
    test: /iphone|아이폰/i,
    tokens: ["iPhone", "아이폰", "IPHONE"],
  },
];

const INDUSTRY_SPEC_RES = {
  furniture:
    /제로지|리클라이|좌판|등받이|쿠션|모션|매트리스|프레임|헤드보드|쇼룸|체어|다이닝|모션\s*베드/gi,
  flower:
    /수국|해바라기|장미|튤립|거베라|라넌큘러스|리시안셔스|안개꽃|프리지아|국화|카네이션|드라이플라워|꽃다발/gi,
  salon:
    /슈링크|리쥬란|보톡스|필러|레이저|토닝|리프팅|두피|펌|염색|클리닉|시술\s*명|관리\s*코스/gi,
  hospital:
    /임플란트|라미네이트|교정|스케일링|지르코니아|틀니|CEREC|치아\s*미백|사랑니/gi,
  cafe:
    /원두|핸드드립|브루잉|시그니처|블렌드|라떼|에스프레소|드립백|로스팅|콜드브루/gi,
  tea_cafe: /보이차|우롱차|히비스커스|티\s*블렌드|다실|찻잎/gi,
  restaurant:
    /시그니처|코스|오믈렛|파스타|스테이크|한정\s*메뉴|셰프\s*추천|와인\s*페어링/gi,
  snack: /급여|단백질|원재료|알레르기|유통기한|성분|펫푸드|수제\s*간식/gi,
  pet_cafe: /견종|소형견|대형견|놀이터|간식\s*바|견종\s*별/gi,
  education: /커리큘럼|수강|특강|레벨|반\s*편성|교재|입시/gi,
  craft: /원데이|공예|도자기|가죽|향수|클래스|체험\s*키트/gi,
  default: /예약|픽업|상담|무인|쇼룸|프랜차이즈|배송|조립|A\/S/gi,
};

const RESEARCH_TOPIC_HINT_RE =
  /추천|비교|선택|스펙|모델|라인업|시리즈|종류|가이드|설명|정리|고르는\s*법|어떤|뭐\s*살|사야\s*할|메뉴|시술|치료|임플란트|교정|꽃\s*이름|여름\s*꽃|봄\s*꽃|가을\s*꽃|겨울\s*꽃/i;

function industrySpecRe(key = "default") {
  return INDUSTRY_SPEC_RES[key] || INDUSTRY_SPEC_RES.default;
}

function blob(input = {}) {
  return [
    topicRaw(input),
    input.topic,
    input.mainKeyword,
    input.includePhrases,
    input.storeFeatures,
    input.brandDescription,
    input.industry,
  ]
    .filter(Boolean)
    .join(" ");
}

export function isResearchProperNounTopic(input = {}) {
  if (isResearchHeavyTopicInput(input)) return true;
  if (isFurnitureChairProductTopic(input)) return true;

  const raw = topicRaw(input) || "";
  const text = blob(input);
  const key = resolveBriclogIndustryKey(input);

  if (GENERIC_MODEL_CODE_RES.some((re) => re.test(raw) || re.test(text))) {
    return true;
  }

  if (key === "flower" && RESEARCH_TOPIC_HINT_RE.test(raw)) return true;
  if (key === "salon" && /시술|관리|케어|두피|네일|추천|비교/.test(raw)) return true;
  if (key === "hospital" && /임플란트|교정|치료|미백|라미네|사랑니/.test(raw)) {
    return true;
  }
  if (
    (key === "cafe" || key === "tea_cafe" || key === "restaurant") &&
    /메뉴|시그니처|원두|코스|추천|브루잉|블렌드/.test(raw)
  ) {
    return true;
  }
  if (key === "snack" && /급여|성분|원재료|알레르기|추천/.test(raw)) return true;
  if (key === "education" && /커리큘럼|과목|특강|입시|레벨/.test(raw)) return true;
  if (key === "craft" && /원데이|체험|클래스|공예/.test(raw)) return true;

  if (ALIAS_GROUPS.some((g) => g.test.test(text))) return true;

  return /[A-Z]{2,}\s*[A-Z0-9]{2,}/.test(raw);
}

export function isBrandSpecificTopicInput(input = {}) {
  return isResearchProperNounTopic(input);
}

export function resolveResearchProperNounProfile(input = {}) {
  const industryKey = resolveBriclogIndustryKey(input);
  const aliasGroups = ALIAS_GROUPS.filter((g) => g.test.test(blob(input)));
  return {
    version: RESEARCH_PROPER_NOUN_VERSION,
    industryKey,
    specRe: industrySpecRe(industryKey),
    aliasGroups,
    requiresResearch: isResearchProperNounTopic(input),
    productLabel: extractResearchProductLabel(input),
  };
}

export function extractResearchProductLabel(input = {}) {
  const raw = topicRaw(input) || String(input.topic || input.mainKeyword || "").trim();
  if (!raw) return "";

  if (isFurnitureChairProductTopic(input)) {
    return extractFurnitureProductLabel(input);
  }

  for (const re of GENERIC_MODEL_CODE_RES) {
    re.lastIndex = 0;
    const m = raw.match(re);
    if (m?.[0]) return m[0].trim();
  }

  const key = resolveBriclogIndustryKey(input);
  if (key === "flower" && RESEARCH_TOPIC_HINT_RE.test(raw)) {
    return raw.split(/[,，]/)[0]?.trim().slice(0, 28) || raw.slice(0, 28);
  }

  const commaParts = raw.split(/[,，·|/]/).map((s) => s.trim()).filter(Boolean);
  if (commaParts.length > 1 && commaParts[0].length >= 4) {
    return commaParts[0].slice(0, 32);
  }

  return raw.slice(0, 32);
}

function extractModelCodes(text = "") {
  const found = [];
  const seen = new Set();
  for (const re of GENERIC_MODEL_CODE_RES) {
    re.lastIndex = 0;
    for (const m of String(text || "").match(re) || []) {
      const t = m.trim();
      const key = t.toLowerCase();
      if (t.length >= 3 && !seen.has(key)) {
        seen.add(key);
        found.push(t);
      }
    }
  }
  return found;
}

function extractFlowerNames(text = "") {
  return FLOWER_NAME_RES.filter((re) => re.test(text)).map((re) =>
    String(text.match(re)?.[0] || "").trim()
  ).filter(Boolean);
}

function aliasTokensForInput(input = {}) {
  const text = blob(input);
  const tokens = [];
  for (const group of ALIAS_GROUPS) {
    if (group.test.test(text)) tokens.push(...group.tokens);
  }
  return tokens;
}

function matchesAliasToken(tokenText = "", fullNorm = "") {
  const t = String(tokenText || "").toLowerCase();
  if (!t) return false;
  if (fullNorm.includes(t)) return true;
  const group = ALIAS_GROUPS.find((g) =>
    g.tokens.some((tok) => tok.toLowerCase() === t)
  );
  if (group) {
    return group.tokens.some((tok) => fullNorm.includes(tok.toLowerCase()));
  }
  return false;
}

export function collectResearchProperNounTokens(input = {}) {
  const tokens = [];
  const seen = new Set();
  const profile = resolveResearchProperNounProfile(input);
  const add = (text, kind = "generic", weight = 1) => {
    const t = String(text || "").trim();
    const key = t.toLowerCase().replace(/\s+/g, " ");
    if (t.length < 2 || t.length > 48 || !key || seen.has(key)) return;
    seen.add(key);
    tokens.push({ text: t, kind, weight });
  };

  add(input.brandName, "brand", 2);
  add(input.region, "region", 1);

  const raw = topicRaw(input) || String(input.topic || input.mainKeyword || "").trim();
  if (profile.productLabel) add(profile.productLabel, "product", 3);

  for (const code of extractModelCodes(raw)) add(code, "model", 3);
  for (const code of extractModelCodes(blob(input))) add(code, "model", 2);

  for (const part of raw.split(/[,，·|/\n]+/)) {
    const t = part.trim();
    if (t.length >= 4 && t.length <= 36) add(t, "topicPhrase", 2);
  }

  for (const alias of aliasTokensForInput(input)) add(alias, "alias", 2);

  if (profile.industryKey === "flower") {
    for (const name of extractFlowerNames(raw)) add(name, "flower", 2);
    for (const row of collectMergedResearchFacts(input, input.v2AxisParsed, input.research)) {
      const f = String(row?.fact || row || "");
      for (const name of extractFlowerNames(f)) add(name, "flower", 2);
    }
  }

  for (const row of collectMergedResearchFacts(
    input,
    input.v2AxisParsed,
    input.research
  )) {
    const f = String(row?.fact || row || "").trim();
    if (f.length < 5) continue;
    add(f.slice(0, Math.min(28, f.length)), "research", 2);
    for (const code of extractModelCodes(f)) add(code, "model", 3);
    for (const m of f.match(profile.specRe) || []) add(m, "spec", 1);
  }

  for (const part of String(input.storeFeatures || "").split(/[,，·|/\n]+/)) {
    const t = part.trim();
    if (t.length >= 3 && t.length <= 28) add(t, "store", 1);
  }

  for (const m of blob(input).match(profile.specRe) || []) {
    if (String(m).length >= 2) add(m, "spec", 1);
  }

  return tokens;
}

export function normalizeProperNounMatchText(text = "") {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function properNounTokenMatchesFull(token, fullNorm) {
  const t = normalizeProperNounMatchText(token.text);
  if (!t) return false;
  if (fullNorm.includes(t)) return true;

  if (token.kind === "alias") {
    return matchesAliasToken(token.text, fullNorm);
  }

  if (token.kind === "model" || token.kind === "product") {
    const parts = t.split(/\s+/).filter((p) => p.length >= 2);
    if (parts.length >= 2 && parts.every((p) => fullNorm.includes(p))) return true;
    if (parts.length === 1 && parts[0].length >= 4 && fullNorm.includes(parts[0])) {
      return true;
    }
  }

  if ((token.kind === "research" || token.kind === "store") && t.length >= 8) {
    return fullNorm.includes(t.slice(0, 8));
  }

  if (token.kind === "flower" && t.length >= 2) {
    return fullNorm.includes(t);
  }

  return false;
}

export function scoreResearchProperNounAnchoring(fullText = "", input = {}) {
  const tokens = collectResearchProperNounTokens(input);
  if (!tokens.length) {
    return {
      score: 52,
      hits: [],
      misses: [],
      productRatio: 0,
      researchRatio: 0,
      tokenCount: 0,
      brandSpecific: false,
      profile: resolveResearchProperNounProfile(input),
    };
  }

  const fullNorm = normalizeProperNounMatchText(fullText);
  const hits = tokens.filter((t) => properNounTokenMatchesFull(t, fullNorm));
  const misses = tokens.filter((t) => !properNounTokenMatchesFull(t, fullNorm));

  const productPool = tokens.filter((t) =>
    ["product", "model", "topicPhrase", "alias", "category", "flower"].includes(t.kind)
  );
  const productHitCount = hits.filter((t) =>
    ["product", "model", "topicPhrase", "alias", "category", "flower"].includes(t.kind)
  ).length;
  const productRatio = productPool.length ? productHitCount / productPool.length : 0;

  const researchPool = tokens.filter((t) =>
    ["research", "spec", "store"].includes(t.kind)
  );
  const researchHitCount = hits.filter((t) =>
    ["research", "spec", "store"].includes(t.kind)
  ).length;
  const researchRatio = researchPool.length ? researchHitCount / researchPool.length : 0;

  const weightedTotal = tokens.reduce((sum, t) => sum + (t.weight || 1), 0);
  const weightedHits = hits.reduce((sum, t) => sum + (t.weight || 1), 0);
  const weightedRatio = weightedTotal ? weightedHits / weightedTotal : 0;

  const profile = resolveResearchProperNounProfile(input);
  let score = 42 + weightedRatio * 46;
  if (hits.some((t) => t.kind === "brand")) score += 8;
  if (productRatio >= 0.45) score += 10;
  if (productRatio >= 0.7) score += 6;
  if (researchRatio >= 0.35) score += 8;

  if (profile.industryKey === "flower" && productHitCount >= 3) score += 8;
  if (profile.industryKey === "salon" || profile.industryKey === "hospital") {
    if (researchHitCount >= 2) score += 6;
  }
  if (/mint\s*lb|d200|제로지|리클라|갤럭시|iphone|sm-/i.test(fullNorm)) score += 4;

  return {
    score: Math.min(96, Math.max(38, Math.round(score))),
    hits: hits.map((t) => t.text),
    misses: misses.slice(0, 8).map((t) => t.text),
    productRatio,
    researchRatio,
    weightedRatio,
    tokenCount: tokens.length,
    brandSpecific: isResearchProperNounTopic(input),
    profile,
  };
}

export function scoreResearchFactAnchoringForInput(fullText = "", input = {}) {
  const facts = collectMergedResearchFacts(
    input,
    input.v2AxisParsed,
    input.research
  );
  if (!facts.length) {
    return { score: 52, anchored: 0, total: 0, ratio: 0 };
  }

  const fullNorm = normalizeProperNounMatchText(fullText);
  const profile = resolveResearchProperNounProfile(input);
  let anchored = 0;
  let total = 0;

  for (const row of facts) {
    const f = String(row?.fact || row || "").trim();
    if (f.length < 4) continue;
    total += 1;

    const candidates = [
      f,
      f.slice(0, Math.min(16, f.length)),
      ...extractModelCodes(f),
      ...(f.match(profile.specRe) || []),
      ...extractFlowerNames(f),
      ...String(f)
        .split(/[·|,，/|\n]+/)
        .map((p) => p.trim())
        .filter((p) => p.length >= 4 && p.length <= 24),
    ].filter(Boolean);

    const matched = candidates.some((t) => {
      const n = normalizeProperNounMatchText(t);
      if (n.length < 3) return false;
      if (fullNorm.includes(n)) return true;
      if (matchesAliasToken(t, fullNorm)) return true;
      const words = n.split(/\s+/).filter((w) => w.length >= 3);
      if (words.length >= 1 && words.every((w) => fullNorm.includes(w))) return true;
      return n.length >= 6 && fullNorm.includes(n.slice(0, 6));
    });

    if (matched) anchored += 1;
  }

  if (!total) return { score: 52, anchored: 0, total: 0, ratio: 0 };

  const ratio = anchored / total;
  let score = 44 + ratio * 52;
  if (ratio >= 0.55) score += 6;
  if (ratio >= 0.75) score += 4;

  return {
    score: Math.min(96, Math.max(38, Math.round(score))),
    anchored,
    total,
    ratio,
  };
}
