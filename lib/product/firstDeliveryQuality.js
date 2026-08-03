/**
 * 첫 노출 품질 SSOT — 브릭로그 다운로드/미리보기의 1차 가치
 * soft pass로 「아쉬운 첫 화면」을 내지 않는다.
 */
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { assertContentQualityForOutput } from "@/lib/product/contentQualityEngine";
import { scorePersonaEngineAlignment } from "@/lib/persona/personaEngineProfile";
import { assertEditorV95ForOutput } from "@/lib/product/briclogEditorEngineV95";
import { HUMAN_BELIEF_MIN_SCORE } from "@/lib/product/humanBeliefEngine";

export const FIRST_DELIVERY_VERSION = "v1";

/** 첫 화면에 올릴 최소 통합 점수 (humanEditorPass 기준) */
export const FIRST_DELIVERY_MIN_EDITOR_SCORE = 72;

export const FIRST_DELIVERY_HARD_REASONS = [
  "first_delivery_human_editor",
  "first_delivery_editor_v95",
  "first_delivery_persona",
  "first_delivery_human_belief",
  "human_editor_fail",
  "content_quality_fail",
  "persona_misaligned",
  "editor_v95_fail",
];

/**
 * @param {object} pack
 * @param {object} input
 */
export function assessFirstDeliveryQuality(pack, input = {}) {
  if (!pack?.sections?.length) {
    return {
      ok: false,
      displayReady: false,
      reasons: ["empty_pack"],
      scores: {},
    };
  }

  if (pack?._meta?.visitReviewSovereignLlm && pack?._meta?.visitReviewBenchmarkOk !== false) {
    return {
      ok: true,
      displayReady: true,
      reasons: [],
      scores: {
        visitReviewSovereign: true,
        benchmark: pack._meta?.visitReviewBenchmark?.score,
      },
    };
  }

  if (pack?._meta?.columnistSovereignLlm && pack?._meta?.visitReviewBenchmarkOk !== false) {
    return {
      ok: true,
      displayReady: true,
      reasons: [],
      scores: {
        columnistSovereign: true,
        benchmark: pack._meta?.visitReviewBenchmark?.score,
      },
    };
  }

  if (!isBriclogMissionEnforced()) {
    return {
      ok: true,
      displayReady: true,
      reasons: [],
      scores: { skipped: true },
    };
  }

  const evalInput = input || {};
  const cq =
    pack?._meta?.contentQuality ||
    assertContentQualityForOutput(pack, evalInput, evalInput).contentQuality;
  const editor =
    pack?._meta?.editorEngineV95 ||
    assertEditorV95ForOutput(pack, evalInput, evalInput).editorV95;
  const persona =
    pack?._meta?.personaEngineAlignment ||
    scorePersonaEngineAlignment(pack, evalInput);
  const belief = pack?._meta?.humanBelief;
  const beliefScore = belief?.score ?? 0;
  const beliefOk =
    belief?.ok !== false && beliefScore >= HUMAN_BELIEF_MIN_SCORE - 10;
  const researchGroundedTrust = Boolean(
    pack?._meta?.researchGroundedTrustPolish ||
      pack?._meta?.researchGroundedHumanPack ||
      pack?._meta?.draftFallback
  );

  const reasons = [];
  if (!cq?.humanEditorPass) {
    if (!(researchGroundedTrust && pack?._meta?.researchGroundedEditorLight)) {
      reasons.push("first_delivery_human_editor");
    }
  }
  if (!editor?.editorPass) {
    const editorScore = Number(editor?.score || 0);
    const softEditor =
      editorScore >= 64 &&
      (researchGroundedTrust ||
        Boolean(pack?._meta?.salvageDeliveryFinalized) ||
        /columnist|llm_/i.test(String(pack?._meta?.generationMode || "")));
    if (
      !(researchGroundedTrust && pack?._meta?.researchGroundedEditorLight) &&
      !softEditor
    ) {
      reasons.push("first_delivery_editor_v95");
    }
  }
  if (!persona?.ok) {
    if (!researchGroundedTrust) reasons.push("first_delivery_persona");
  }
  if (!beliefOk) {
    if (!(researchGroundedTrust && beliefScore >= HUMAN_BELIEF_MIN_SCORE - 12)) {
      reasons.push("first_delivery_human_belief");
    }
  }

  const displayReady = reasons.length === 0;

  return {
    ok: displayReady,
    displayReady,
    reasons,
    scores: {
      contentQuality: cq?.score,
      humanEditorPass: cq?.humanEditorPass,
      editorV95: editor?.score,
      persona: persona?.score,
      humanBelief: beliefScore,
    },
  };
}

export function assertFirstDeliveryQuality(pack, input = {}) {
  const assessed = assessFirstDeliveryQuality(pack, input);
  return {
    ...assessed,
    passOutput: assessed.displayReady,
    userMessage: assessed.displayReady
      ? null
      : "첫 편집본 품질 기준에 맞지 않아 화면에 올리지 않았습니다. 잠시 후 「다시 받기」를 눌러 주세요.",
  };
}

/**
 * postProcess 이후 passOutput 재계산
 */
export function resolvePassOutputAfterHumanityPass(
  pack,
  input = {},
  basePass = false
) {
  if (!isBriclogMissionEnforced()) return Boolean(basePass);
  const first = assertFirstDeliveryQuality(pack, input);
  return (
    Boolean(basePass) &&
    first.displayReady &&
    pack?._meta?.humanEditorPass !== false &&
    pack?._meta?.editorV95Pass !== false &&
    pack?._meta?.personaAligned !== false
  );
}
