/**
 * 송출 신뢰 등급 UI — rescue·preview·발행 가능 구분
 */
import { resolvePublishReadiness, resolvePublishGrade } from "@/lib/product/publishUiDisplay";
import {
  buildChannelTrustHint,
  getChannelHumanVoice,
} from "@/lib/product/channelHumanVoice";

export const DELIVERY_TRUST_PUBLISH = {
  tier: "publish",
  label: "발행 가능",
  shortLabel: "발행 가능",
  hint: "복사해서 네이버에 올려도 됩니다. 올리기 전에 사실만 한 번 확인해 주세요.",
  tone: "ready",
};

export const DELIVERY_TRUST_POLISH = {
  tier: "polish",
  label: "다듬고 발행",
  shortLabel: "다듬기 권장",
  hint: "읽을 만한 초안입니다. 톤·사실을 한 번 더 확인한 뒤 올려 주세요.",
  tone: "review",
};

export const DELIVERY_TRUST_REFERENCE = {
  tier: "reference",
  label: "참고용 초안",
  shortLabel: "참고용",
  hint: "조사·입력을 바탕으로 만든 임시 초안입니다. 그대로 올리기보다 「다시 받기」로 한 번 더 다듬는 것을 권장합니다.",
  tone: "reference",
};

/**
 * @param {object} [pack]
 * @param {{ channel?: string }} [opts]
 */
export function resolveDeliveryTrustBadge(pack = {}, opts = {}) {
  const channel = opts.channel || pack?._meta?.channel || "blog";
  const voice = getChannelHumanVoice(channel);
  const meta = pack._meta || {};
  const readiness = resolvePublishReadiness(pack);
  const grade = resolvePublishGrade({
    readiness,
    publishReady: meta.publishReady,
    sqvGrade: meta.sqv?.grade,
    professionalEditorGrade: meta.professionalEditorGrade,
    deliveryRescue: meta.deliveryRescue,
    deliveryPreview: meta.deliveryPreview,
    contentQualityDelivered: meta.contentQualityDelivered,
  });

  const isRescue =
    meta.deliveryRescue ||
    meta.missionFallbackUi ||
    meta.missionProseFallback ||
    meta.draftFallback ||
    meta.localDeliveryPreview;

  if (isRescue && (meta.deliveryPreview || meta.softPass || !meta.passOutput)) {
    return {
      ...DELIVERY_TRUST_REFERENCE,
      shortLabel: voice.roleLabel,
      hint: buildChannelTrustHint(
        channel,
        meta.deliveryPreviewMessage || DELIVERY_TRUST_REFERENCE.hint
      ),
    };
  }

  if (
    readiness.status === "ready" &&
    !meta.deliveryPreview &&
    !meta.softPass &&
    (grade.id === "A" || meta.publishReady === true)
  ) {
    return {
      ...DELIVERY_TRUST_PUBLISH,
      shortLabel: voice.roleLabel,
      hint: buildChannelTrustHint(
        channel,
        readiness.hint || DELIVERY_TRUST_PUBLISH.hint
      ),
    };
  }

  if (
    meta.deliveryPreview ||
    meta.softPass ||
    readiness.status === "polishing" ||
    grade.id === "B"
  ) {
    return {
      ...DELIVERY_TRUST_POLISH,
      shortLabel: voice.roleLabel,
      hint: buildChannelTrustHint(
        channel,
        meta.deliveryPreviewMessage ||
          readiness.hint ||
          DELIVERY_TRUST_POLISH.hint
      ),
    };
  }

  if (readiness.status === "blocked" || grade.id === "C") {
    return {
      ...DELIVERY_TRUST_REFERENCE,
      shortLabel: voice.roleLabel,
      hint: buildChannelTrustHint(
        channel,
        readiness.hint || DELIVERY_TRUST_REFERENCE.hint
      ),
    };
  }

  return {
    ...DELIVERY_TRUST_POLISH,
    shortLabel: voice.roleLabel,
    hint: buildChannelTrustHint(
      channel,
      readiness.hint || DELIVERY_TRUST_POLISH.hint
    ),
  };
}
