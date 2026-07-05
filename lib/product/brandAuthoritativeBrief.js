/**
 * 브랜드 깊이 — Writer authoritative brief (사후 inject 대신 쓰기 전 SSOT)
 */
import { hasConcreteFactSignal } from "@/lib/content/researchFactMetaFilter";
import {
  collectSubstantiveResearchFacts,
  formatSubstantiveResearchFactsForPrompt,
} from "@/lib/product/editorGradeResearchGate";
import { splitContextBeatParts } from "@/lib/product/generationContextBeat";

function factText(row) {
  return String(typeof row === "string" ? row : row?.fact || row?.text || "").trim();
}

function collectInputDepthPoints(input = {}) {
  const out = [];
  for (const blob of [
    input.storeFeatures,
    input.includePhrases,
    input.brandDescription,
  ]) {
    for (const part of splitContextBeatParts(blob)) {
      if (part.length >= 4) out.push(part);
    }
    for (const part of String(blob || "")
      .split(/[,，/\n|]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 4)) {
      out.push(part);
    }
  }
  const seen = new Set();
  return out.filter((p) => {
    const k = p.slice(0, 48).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** 입력·조사에 구체 브랜드 단서가 있는지 */
export function hasRichBrandDepthInput(input = {}) {
  const blob = [
    input.storeFeatures,
    input.includePhrases,
    input.brandDescription,
  ]
    .filter(Boolean)
    .join(" · ");
  if (blob.trim().length < 8) return false;
  if (hasConcreteFactSignal(blob, input)) return true;
  return blob.trim().length >= 20;
}

/** Writer 프롬프트 상단 — 브랜드만의 정보 */
export function buildBrandDepthAuthoritativeBrief(input = {}) {
  const brand = String(input.brandName || "").trim();
  const points = collectInputDepthPoints(input);

  const brandAxisFacts = collectSubstantiveResearchFacts(input)
    .filter((row) => {
      const axis = String(row?.axis || "").toLowerCase();
      const src = String(row?.source || "").toLowerCase();
      return (
        axis === "brand" ||
        /store_features|brand_description|include_phrases/.test(src)
      );
    })
    .map(factText)
    .filter((t) => t.length >= 8);

  const merged = [...points];
  for (const f of brandAxisFacts) {
    if (!merged.some((m) => m.includes(f.slice(0, 12)) || f.includes(m.slice(0, 12)))) {
      merged.push(f);
    }
  }

  if (!merged.length) return "";

  const lines = [
    "【브랜드 깊이 — Writer 필수 반영】",
    "아래는 이 브랜드·매장만의 확인된 정보입니다. 각 항목을 본문에 이유·활용과 연결해 녹이세요. 업종 일반론·키워드 나열·추정 금지.",
  ];
  merged.slice(0, 12).forEach((p, i) => {
    lines.push(`${i + 1}. ${p}`);
  });
  if (brand) {
    lines.push(
      `모든 섹션에서 ${brand} 맥락이 끊기지 않게 이어 쓰세요. 건조 스펙(「~특징입니다」) 대신 관찰·경험·의견 중 하나를 붙이세요.`
    );
  }
  return lines.join("\n");
}

/** enrichInputForGeneration · normalize 경로 */
export function attachBrandDepthAuthoritativeBrief(input = {}) {
  const brief = buildBrandDepthAuthoritativeBrief(input);
  if (!brief) return input;

  const prior = String(
    input._canonicalBrief || input.canonicalBrief || ""
  ).trim();
  const mergedCanonical = prior ? `${prior}\n\n${brief}` : brief;

  return {
    ...input,
    _brandDepthBrief: brief,
    _brandDepthBriefUsed: true,
    brandDepthAuthoritativeBrief: brief,
    _canonicalBrief: mergedCanonical,
    brandDepthFactsPrompt: formatSubstantiveResearchFactsForPrompt(input, 12),
  };
}
