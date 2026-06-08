/**
 * Content Quality Delivery — 글값(SQV) 최종 송출 SSOT
 * humanity · display · API 직전에 품질값을 한 번 더 확정한다.
 */
import { applySpeakerVoiceLockPack } from "@/lib/persona/speakerVoiceLock";
import { applyPersonaEngineMetaPass } from "@/lib/persona/personaEngineProfile";
import { ensureVerbatimTopicCompliance } from "@/lib/content/informationUnitEngine";
import {
  stampContentQualityValue,
  computeContentQualityValue,
} from "@/lib/product/contentQualityValue";
import { assessHumanWritingDelivery } from "@/lib/product/humanWritingDeliveryGate";
import { resolvePublishReadiness } from "@/lib/product/publishReadinessDisplay";
import { detectEditorQualityIssues } from "@/lib/content/editorQualityEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";

/**
 * @param {object} pack
 * @param {object} input
 * @param {"blog"|"place"|"instagram"} [channel]
 */
export function finalizeContentQualityForDelivery(pack, input = {}, channel = "blog") {
  if (!pack?.sections?.length) return pack;

  let next = pack;
  if (isBriclogMissionEnforced()) {
    next = applySpeakerVoiceLockPack(next, input);
    if (channel === "blog") {
      next = ensureVerbatimTopicCompliance(next, input, "blog");
    }
    next = applyPersonaEngineMetaPass(next, input);
  }

  const human = assessHumanWritingDelivery(next, input);
  const editor = detectEditorQualityIssues(next, { input }, input);
  next = stampContentQualityValue(next, input);
  const sqv = next._meta?.sqv || computeContentQualityValue(next, input);
  const readiness = resolvePublishReadiness(next);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      humanWritingDelivery: {
        humanReady: human.humanReady,
        displayReady: human.displayReady,
        reasons: (human.reasons || []).slice(0, 8),
      },
      editorQualitySummary: {
        ok: editor.ok,
        issues: (editor.issues || []).slice(0, 6).map((i) => i.type),
      },
      sqv,
      contentQualityValue: sqv.score,
      publishReady: sqv.publishReady === true,
      publishReadiness: readiness,
      contentQualityDelivered: true,
      contentQualityDeliveredAt: new Date().toISOString(),
    },
  };
}

/** API meta에 글값 요약 첨부 */
export function attachContentQualityToApiMeta(meta = {}, pack = null) {
  const sqv = pack?._meta?.sqv;
  if (!sqv) return meta;
  return {
    ...meta,
    sqv: {
      version: sqv.version,
      score: sqv.score,
      grade: sqv.grade,
      publishReady: sqv.publishReady,
      breakdown: sqv.breakdown,
      reasons: (sqv.reasons || []).slice(0, 10),
    },
    contentQualityValue: sqv.score,
    publishReady: sqv.publishReady,
    publishReadiness: pack?._meta?.publishReadiness,
  };
}
