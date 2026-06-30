/**
 * 글값 노출 SSOT — 기획·조사·설명 (점수 숨김, 증거·계획 노출)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countPlaceholderContamination } from "@/lib/content/placeholderContaminationEngine";
import { buildContentOperatingPlan } from "@/lib/product/briclogBrandContentOS";
import {
  runResearchFirstPipeline,
  formatResearchFirstBrief,
} from "@/lib/product/briclogResearchFirstPipeline";
import { collectSubstantiveResearchFacts } from "@/lib/product/editorGradeResearchGate";
import { assessExplainQuality } from "@/lib/product/briclogExplainEngine";

export const DELIVERY_VALUE_EXPOSURE_VERSION = "delivery-value-v1";

function pickResearchLines(dossier = {}, input = {}) {
  const lines = [];
  for (const row of dossier.organized?.lines || []) {
    const text = String(row?.text || row?.fact || row || "").trim();
    if (text.length >= 8) lines.push(text.slice(0, 120));
    if (lines.length >= 3) return lines;
  }
  for (const row of collectSubstantiveResearchFacts(input)) {
    const text = String(row?.text || row?.fact || "").trim();
    if (text.length >= 6) lines.push(text.slice(0, 120));
    if (lines.length >= 3) break;
  }
  for (const hit of dossier.brandFacts || []) {
    const text = String(hit?.value || hit || "").trim();
    if (text.length >= 4) lines.push(text.slice(0, 120));
    if (lines.length >= 3) break;
  }
  return lines.slice(0, 3);
}

function resolveExplainLine(plan = {}, dossier = {}, pack = null, input = {}) {
  const why = plan.whyWrite?.[0];
  if (why?.outcome) return String(why.outcome).trim().slice(0, 160);
  if (why?.reason) return String(why.reason).trim().slice(0, 160);
  const intent = dossier.searchIntent?.primary || dossier.searchIntent?.label;
  if (intent) {
    return `독자는 「${String(intent).slice(0, 48)}」 맥락에서 브랜드를 비교·선택하려 합니다.`;
  }
  if (pack?.sections?.length) {
    const eq = assessExplainQuality(pack, input);
    if (eq.explained >= 2) {
      return "조사 팩트마다 이유·활용이 연결된 설명형 문장으로 정리했습니다.";
    }
  }
  return "브랜드·지역·주제 축에 맞춰 현장에서 확인한 내용만 담았습니다.";
}

export function slimResearchDossierForApi(dossier = null) {
  if (!dossier) return null;
  return {
    version: dossier.version,
    writable: dossier.writable,
    writingAllowed: dossier.writingAllowed,
    operatingHeadline: dossier.operatingPlan?.operatingHeadline || null,
    factCount: dossier.factCount,
    coveredCount: dossier.organized?.coveredCount,
    outlineSectionCount: dossier.outline?.sections?.length || 0,
    failReasons: dossier.failReasons || [],
    brief: formatResearchFirstBrief(dossier).slice(0, 600) || null,
  };
}

/**
 * @param {object} input
 * @param {object|null} dossier
 * @param {object|null} pack
 */
export function buildDeliveryValueExposure(input = {}, dossier = null, pack = null) {
  const d = dossier || input.researchFirstDossier || runResearchFirstPipeline(input);
  const plan = d.operatingPlan || buildContentOperatingPlan(input);
  const researchLines = pickResearchLines(d, input);
  const explainLine = resolveExplainLine(plan, d, pack, input);

  const checks = [
    {
      id: "plan",
      label: "이번 달 쓸 주제·채널 방향",
      ok: Boolean(plan.whatToWrite?.length),
    },
    {
      id: "research",
      label: `조사 ${researchLines.length}건 반영`,
      ok: researchLines.length >= 2,
    },
    {
      id: "axes",
      label: "브랜드·지역·주제 축",
      ok: Boolean(input.brandName && input.topic),
    },
  ];

  if (pack?.sections?.length) {
    const ph = countPlaceholderContamination(getBlogFullText(pack));
    checks.push({
      id: "clean",
      label: "공허·placeholder 없음",
      ok: ph.total === 0,
    });
  }

  return {
    version: DELIVERY_VALUE_EXPOSURE_VERSION,
    operatingHeadline: plan.operatingHeadline || null,
    operatingItems: (plan.whatToWrite || []).slice(0, 3).map((item) => ({
      channel: item.channelLabel || item.channel,
      topic: item.topic,
      reason: item.reason || null,
    })),
    researchLines,
    explainLine,
    checks,
    dossierWritable: d.writable !== false,
    researchMustKnow: (plan.researchMustKnow || []).slice(0, 3),
  };
}

/**
 * API·pack meta — dossier-first 산출물 첨부
 */
export function attachDeliveryValueToBlogResult(result = {}, input = {}, dossier = null) {
  const d = dossier || input.researchFirstDossier || null;
  const slim = slimResearchDossierForApi(d);
  const exposure = buildDeliveryValueExposure(input, d, result.blogContent || null);

  const meta = {
    ...(result.meta || {}),
    dossierFirst: true,
    researchDossier: slim,
    deliveryValue: exposure,
  };

  if (!result.blogContent?.sections?.length) {
    return { ...result, meta };
  }

  return {
    ...result,
    meta,
    blogContent: {
      ...result.blogContent,
      _meta: {
        ...(result.blogContent._meta || {}),
        deliveryValueExposure: exposure,
        researchDossierSlim: slim,
      },
    },
  };
}
