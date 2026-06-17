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
import { resolvePersonaEngineProfile } from "@/lib/persona/personaEngineProfile";
import { applyResearchArcLengthDeliveryPass } from "@/lib/content/researchArcLengthDeliveryEngine";

export const HUMAN_PROSE_DELIVERY_VERSION = "human-prose-v2";

const FLOW_OPENERS = [
  "이어서 ",
  "그다음 ",
  "한편 ",
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
    return ["그다음 ", "솔직히 ", "현장에서 보면 ", "한편 ", "이어서 "];
  }
  if (/전문|리포트|브랜드/.test(tone)) {
    return ["이어서 ", "같은 기준으로 ", "현장 기준으로 ", "한편 ", "정리하면 "];
  }
  return FLOW_OPENERS;
}

function demoteListDump(paragraph = "") {
  const lines = paragraph.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return paragraph;
  if (!lines.every((l) => LIST_LINE_RE.test(l) || l.length < 48)) return paragraph;
  const prose = lines
    .map((l) => l.replace(LIST_LINE_RE, "").trim())
    .filter(Boolean)
    .map((l, i) => (i === 0 ? l : `${FLOW_OPENERS[i % FLOW_OPENERS.length]}${l}`))
    .join(" ");
  return prose.endsWith(".") ? prose : `${prose}.`;
}

function connectParagraphFlow(paragraphs = [], input = {}) {
  if (paragraphs.length <= 1) return paragraphs;
  const openers = pickFlowOpeners(input);
  return paragraphs.map((para, idx) => {
    if (idx === 0) return para;
    const trimmed = para.trim();
    if (/^(이어서|그다음|한편|같은|현장|독자|정리하면|솔직히)/.test(trimmed)) {
      return para;
    }
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
  return {
    ok: listRatio <= 0.15 && shortParas <= Math.max(1, Math.floor(paras.length * 0.35)),
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

  const sections = (next.sections || []).map((sec) => {
    let paras = splitParagraphs(sec.body);
    paras = paras.map((p) => demoteListDump(p));
    paras = connectParagraphFlow(paras, input);
    return { ...sec, body: paras.join("\n\n") };
  });

  next = { ...next, sections };
  next = applyNarrativeArcShape(next, input, { force: true });
  next = stripGlobalExactDuplicateSentences(next);

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
