/**
 * BRICLOG CONTENT DOCTRINE — 콘텐츠 목표·발행 기준 SSOT
 * 문장 수·톤·SEO보다 사실 전달·설명력·주제 증명을 우선한다.
 */
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { assessBrandWikiReadiness } from "@/lib/evolution/brandWikiEngine";
import { hasUsableResearchFacts } from "@/lib/content/researchGroundedHumanPack";
import { resolveContentPersona } from "@/lib/persona/contentPersona";
import {
  BRICLOG_CONTENT_DOCTRINE_VERSION,
  BRICLOG_CONTENT_NORTH_STAR,
  BRICLOG_CONTENT_DOCTRINE_LINES,
  BRICLOG_CONTENT_DOCTRINE_BRIEF,
} from "@/lib/product/briclogContentDoctrineConstants";

export {
  BRICLOG_CONTENT_DOCTRINE_VERSION,
  BRICLOG_CONTENT_NORTH_STAR,
  BRICLOG_CONTENT_DOCTRINE_LINES,
  BRICLOG_CONTENT_DOCTRINE_BRIEF,
};

export function isContentDoctrineEnforced() {
  return isBriclogMissionEnforced();
}

export function buildContentDoctrinePromptBlock() {
  if (!isContentDoctrineEnforced()) return "";
  return BRICLOG_CONTENT_DOCTRINE_BRIEF;
}

function resolveSpeakerLabel(input = {}) {
  const persona = resolveContentPersona(input);
  const v4 = String(input.v4Speaker || persona.v4Speaker || "").trim();
  const map = {
    brand_intro: "브랜드 소개·철학 화자",
    real_use: "직접 체험·방문 화자",
    expert_guide: "업종 안내·비교 화자",
    owner_voice: "매장·운영자 화자",
    customer_story: "고객 경험 화자",
  };
  if (v4 && v4 !== "auto" && map[v4]) return map[v4];
  return (
    input.contentPersonaLabel ||
    persona.label ||
    "브랜드 에디터 화자"
  );
}

function resolvePurposeLabel(input = {}) {
  return (
    String(input.publishPurpose || "").trim() ||
    String(input.contentPurpose || "").trim() ||
    String(input.publishPurposeBrief || "")
      .split("\n")[0]
      ?.replace(/^【.*?】\s*/, "")
      .trim() ||
    "독자가 주제를 이해하도록 돕기"
  );
}

/** LLM 작성 전 — 화자·목적·설명 기준 브리프 */
export function buildSpeakerPurposeExplainBrief(input = {}) {
  if (!isContentDoctrineEnforced()) return "";
  const brand = String(input.brandName || input.brandMemory?.brandName || "").trim();
  const topic = String(input.topic || input.mainKeyword || "").trim();
  const region = String(input.region || "").trim();
  const speaker = resolveSpeakerLabel(input);
  const purpose = resolvePurposeLabel(input);
  const wiki = input.brandWikiReadiness || assessBrandWikiReadiness(input);
  const gaps = (wiki.explainGaps || wiki.wiki?.explainGaps || []).slice(0, 4);

  const lines = [
    `【SPEAKER · PURPOSE · EXPLAIN · ${BRICLOG_CONTENT_DOCTRINE_VERSION}】`,
    `North Star: ${BRICLOG_CONTENT_NORTH_STAR}`,
    `화자: ${speaker} — 이 시선으로만 쓴다. 다른 업종·타인 경험 흉내 금지.`,
    `발행 목적: ${purpose} — 문장마다 이 목적에 기여하는지 확인.`,
    `주제: ${topic || "-"} | 브랜드: ${brand || "-"} | 지역: ${region || "-"}`,
    "작성 순서: (1) 조사·위키·팩트를 화자 관점으로 이해 → (2) 목적에 맞는 설명 구조 선택 → (3) 검증된 사실만 본문에 녹임.",
    "금지: 범용 가구·매장 안내, 조사 메타 문장, 분량 패딩, 구어 흉내.",
  ];
  if (gaps.length) {
    lines.push(`반드시 설명할 공백: ${gaps.join(" · ")}`);
  }
  if (input.brandWikiBrief) {
    lines.push(`위키 요약 참고:\n${String(input.brandWikiBrief).slice(0, 900)}`);
  }
  return lines.join("\n");
}

/**
 * 발행·fallback 전 — 주제 설명 가능 여부
 * @param {Record<string, unknown>} input
 */
export function assessContentExplainabilityForPublish(input = {}) {
  if (!isContentDoctrineEnforced()) {
    return { ok: true, reasons: [], topicExplainable: true };
  }
  const wiki = input.brandWikiReadiness || assessBrandWikiReadiness(input);
  const researchOk = hasUsableResearchFacts(input);
  const reasons = [...(wiki.reasons || [])];
  if (!wiki.topicExplainable && !researchOk) {
    reasons.push("content_doctrine_not_explainable");
  }
  const ok =
    wiki.topicExplainable ||
    researchOk ||
    (wiki.verifiedFactCount >= 2 && wiki.hasBrandAnchor !== false);

  return {
    ok,
    topicExplainable: wiki.topicExplainable,
    researchOk,
    verifiedFactCount: wiki.verifiedFactCount,
    reasons: [...new Set(reasons)],
    userMessage: ok
      ? null
      : "주제를 설명할 수 있는 조사·팩트가 부족해 발행을 보류했습니다. 브랜드·지역·주제를 구체적으로 입력하거나 조사를 보강해 주세요.",
  };
}
