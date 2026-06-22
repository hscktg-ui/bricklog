/**
 * Human Prose Delivery — Vision 2030
 * 정보 나열 → 한 줄기 칼럼 (설명·경험 수리 + 문단 연결)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { applyExplainRepairToPack } from "@/lib/product/briclogExplainEngine";
import { applyExperienceRepairToPack } from "@/lib/product/briclogExperienceOpinionEngine";
import { applyNarrativeArcShape } from "@/lib/product/narrativeArcShapeEngine";
import { stripGlobalExactDuplicateSentences } from "@/lib/content/duplicateKillerEngine";
import { stripTemplateBoilerplateFromPack } from "@/lib/content/templateBoilerplateEngine";
import { resolvePersonaEngineProfile } from "@/lib/persona/personaEngineProfile";
import { applyResearchArcLengthDeliveryPass } from "@/lib/content/researchArcLengthDeliveryEngine";
import { applyVisitReviewUnifiedProsePass } from "@/lib/content/visitReviewUnifiedProseEngine";

export const HUMAN_PROSE_DELIVERY_VERSION = "human-prose-v3";

const FLOW_OPENERS = [
  "이어서 ",
  "그다음 ",
  "같은 흐름으로 ",
  "현장 기준으로 ",
  "독자 입장에서 보면 ",
];

const LIST_LINE_RE = /^(?:[-•*]\s|\d+[.)]\s)/;

function splitParagraphs(body = "") {
  return String(body || "")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.replace(/\s/g, "").length >= 8);
}

function pickFlowOpeners(input = {}) {
  const profile = resolvePersonaEngineProfile(input);
  const tone = String(profile?.tone || "").trim();
  if (/친근|대화|카페|동네/.test(tone)) {
    return ["그다음 ", "솔직히 ", "현장에서 보면 ", "이어서 ", "그 흐름으로 "];
  }
  if (/전문|리포트|브랜드/.test(tone)) {
    return ["이어서 ", "같은 기준으로 ", "현장 기준으로 ", "정리하면 ", "마지막으로 "];
  }
  return FLOW_OPENERS;
}

function demoteListDump(paragraph = "") {
  const lines = paragraph.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) {
    if (lines.every((l) => LIST_LINE_RE.test(l) || l.length < 48)) {
      const prose = lines
        .map((l) => l.replace(LIST_LINE_RE, "").trim())
        .filter(Boolean)
        .map((l, i) => (i === 0 ? l : `${FLOW_OPENERS[i % FLOW_OPENERS.length]}${l}`))
        .join(" ");
      return prose.endsWith(".") ? prose : `${prose}.`;
    }
  }
  const inlineBullets = String(paragraph || "").match(/-\s+[^-]{4,}/g);
  if (inlineBullets && inlineBullets.length >= 2) {
    const items = String(paragraph || "")
      .split(/\s*-\s+/)
      .map((l) => l.trim())
      .filter((l) => l.length >= 4);
    if (items.length >= 2) {
      const prose = items
        .map((l, i) => (i === 0 ? l : `${FLOW_OPENERS[i % FLOW_OPENERS.length]}${l}`))
        .join(" ");
      return prose.endsWith(".") ? prose : `${prose}.`;
    }
  }
  return paragraph;
}

const GLUE_OPENER_RE =
  /^(이어서|그다음|같은|현장|독자|정리하면|솔직히|그 흐름|마지막으로)/;
const MAX_FORCED_FLOW_OPENERS = 1;

function connectParagraphFlow(paragraphs = [], input = {}) {
  if (paragraphs.length <= 1) return paragraphs;
  const openers = pickFlowOpeners(input);
  let forcedCount = 0;
  return paragraphs.map((para, idx) => {
    if (idx === 0) return para;
    const trimmed = para.trim();
    if (GLUE_OPENER_RE.test(trimmed)) {
      return para;
    }
    if (forcedCount >= MAX_FORCED_FLOW_OPENERS) return para;
    forcedCount += 1;
    const opener = openers[idx % openers.length];
    const lower =
      trimmed.charAt(0) === trimmed.charAt(0).toLowerCase()
        ? trimmed
        : trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
    return `${opener}${lower}`;
  });
}

export function isHumanProseDeliveryEnabled() {
  if (process.env.BRICLOG_HUMAN_PROSE_DELIVERY === "false") return false;
  return isBriclogMissionEnforced();
}

/** @param {object} pack @param {object} [input] */
export function assessHumanProseDelivery(pack, input = {}) {
  const full = getBlogFullText(pack);
  const paras = full.split(/\n\n+/).filter((p) => p.trim().length >= 12);
  const listBlocks = paras.filter((p) =>
    p.split(/\n+/).filter(Boolean).every((l) => LIST_LINE_RE.test(l.trim()))
  ).length;
  const shortParas = paras.filter((p) => p.replace(/\s/g, "").length < 40).length;
  const listRatio = paras.length ? listBlocks / paras.length : 0;
  const shortLimit =
    paras.length <= 6
      ? Math.max(2, Math.ceil(paras.length * 0.85))
      : Math.max(1, Math.floor(paras.length * 0.35));
  return {
    ok: listRatio <= 0.15 && shortParas <= shortLimit,
    listRatio,
    shortParas,
    totalParas: paras.length,
    version: HUMAN_PROSE_DELIVERY_VERSION,
  };
}

export function applyHumanProseDeliveryPass(pack, input = {}) {
  if (!pack?.sections?.length || !isHumanProseDeliveryEnabled()) return pack;

  let next = applyResearchArcLengthDeliveryPass(pack, input);
  next = applyExplainRepairToPack(next, input);
  next = applyExperienceRepairToPack(next, input);
  next = applyVisitReviewUnifiedProsePass(next, input);

  const sections = (next.sections || []).map((sec) => {
    let paras = splitParagraphs(sec.body);
    paras = paras.map((p) => demoteListDump(p));
    paras = connectParagraphFlow(paras, input);
    return { ...sec, body: paras.join("\n\n") };
  });

  next = { ...next, sections };
  next = applyNarrativeArcShape(next, input, { force: true });
  next = stripGlobalExactDuplicateSentences(next);
  next = stripTemplateBoilerplateFromPack(next, input);

  const assessed = assessHumanProseDelivery(next, input);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      humanProseDeliveryPass: true,
      humanProseDeliveryVersion: HUMAN_PROSE_DELIVERY_VERSION,
      humanProseDeliveryOk: assessed.ok,
      humanProseListRatio: assessed.listRatio,
    },
  };
}
