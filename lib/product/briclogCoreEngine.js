/**
 * BRICLOG Core Engine — 프로세스 IP·무결성·기업 가치 SSOT
 *
 * 단일 GPT 호출로 복제 불가: 조사→기획→설명→작성→검수 체인 + 버전 지문.
 * 공개 API·Due diligence용 프로필만 노출 — 프롬프트·규칙 본문은 비공개.
 */
import { createHash } from "crypto";
import {
  assessPublishWithoutEditing,
  scorePreWriteChecklist,
} from "@/lib/product/coreContentEngine";
import {
  assessBrandContentOSQuality,
  buildContentOperatingPlan,
} from "@/lib/product/briclogBrandContentOS";
import { scoreChannelContentQuality } from "@/lib/product/channelQualityStack";
import { SELF_EVOLUTION_VERSION } from "@/lib/evolution/evolutionConstants";

/** manifest 버전 — 각 모듈 SSOT와 동기 유지 (순환 import 방지를 위해 문자열 고정) */
const MANIFEST_LAYER_VERSIONS = Object.freeze({
  research_first: "research-first-v2",
  brand_content_os: "brand-content-os-v1",
  evaluate_first: "eval-first-v1",
  core_content: "v2",
  explain_v3: "explain-v3",
  experience_opinion: "exp-opinion-v1",
  content_eval: "eval-v1",
  channel_quality: "v1",
  korean_orthography: "nikl-v1",
  self_evolution: SELF_EVOLUTION_VERSION,
});

export const BRICLOG_CORE_ENGINE_VERSION = "core-engine-v1";
export const BRICLOG_PROCESS_MANIFEST_ID = "briclog-process-v1";

/** 생성·송출 체인 — 순서 변경 시 fingerprint 갱신 */
export const BRICLOG_PROCESS_MANIFEST = Object.freeze([
  { layer: "research_first", version: MANIFEST_LAYER_VERSIONS.research_first, role: "조사 우선 — 추정 금지" },
  { layer: "brand_content_os", version: MANIFEST_LAYER_VERSIONS.brand_content_os, role: "브랜드 콘텐츠 OS · 운영 계획" },
  { layer: "evaluate_first", version: MANIFEST_LAYER_VERSIONS.evaluate_first, role: "12단계 평가 우선" },
  { layer: "core_content", version: MANIFEST_LAYER_VERSIONS.core_content, role: "정보 밀도·허구·업종 오염 차단" },
  { layer: "explain_v3", version: MANIFEST_LAYER_VERSIONS.explain_v3, role: "설명·이유·활용" },
  { layer: "experience_opinion", version: MANIFEST_LAYER_VERSIONS.experience_opinion, role: "관찰·경험·의견" },
  { layer: "content_eval", version: MANIFEST_LAYER_VERSIONS.content_eval, role: "100점 평가 · 90 미만 차단" },
  { layer: "channel_quality", version: MANIFEST_LAYER_VERSIONS.channel_quality, role: "채널별 송출 마감" },
  { layer: "korean_orthography", version: MANIFEST_LAYER_VERSIONS.korean_orthography, role: "국립국어원 수준 맞춤법·조사" },
  { layer: "self_evolution", version: MANIFEST_LAYER_VERSIONS.self_evolution, role: "피드백·야간 규칙 진화" },
]);

export const BRICLOG_DEFENSIBILITY_PILLARS = Object.freeze([
  {
    id: "research_first",
    ko: "조사 없이 글쓰기 금지",
    en: "No writing without verified research dossier",
  },
  {
    id: "multi_phase_kpi",
    ko: "기획·조사·설명·작성·검수 30/30/20/10/10",
    en: "Five-phase KPI — planning and research dominate output",
  },
  {
    id: "process_fingerprint",
    ko: "모듈 버전 체인 지문 — 송출마다 무결성 스탬프",
    en: "Version-chained process fingerprint on every delivery",
  },
  {
    id: "evolution_loop",
    ko: "피드백·배치·야간 cron 자동 규칙 진화",
    en: "Closed-loop evolution from feedback and batch QA",
  },
  {
    id: "channel_os",
    ko: "블로그·플레이스·인스타 단일 브랜드 OS",
    en: "Single brand OS across blog, place, and social",
  },
]);

export const BRICLOG_ENTERPRISE_MARKETS = Object.freeze([
  { code: "KR", label: "Korea", status: "live" },
  { code: "JP", label: "Japan", status: "expansion_ready" },
  { code: "EN", label: "Global English", status: "expansion_ready" },
  { code: "APAC", label: "APAC enterprise", status: "roadmap" },
]);

function hashPayload(payload) {
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 16);
}

/** 현재 manifest 기준 프로세스 지문 */
export function computeProcessFingerprint(manifest = BRICLOG_PROCESS_MANIFEST) {
  return hashPayload({
    id: BRICLOG_PROCESS_MANIFEST_ID,
    version: BRICLOG_CORE_ENGINE_VERSION,
    layers: manifest.map((l) => [l.layer, l.version]),
  });
}

/** 입력 단계 — 생성 전 코어 엔진 스탬프 (차단은 research-first·pre-write 게이트) */
export function stampCoreEngineOnInput(input = {}) {
  const fingerprint = computeProcessFingerprint();
  const preflight = scorePreWriteChecklist(input, { stage: "core_engine_preflight" });
  const plan = input.contentOperatingPlan || buildContentOperatingPlan(input);

  return {
    ...input,
    briclogCoreEngine: true,
    coreEnginePreflight: {
      version: BRICLOG_CORE_ENGINE_VERSION,
      fingerprint,
      manifestId: BRICLOG_PROCESS_MANIFEST_ID,
      checklistScore: preflight.passed,
      checklistPass: preflight.ok,
      stampedAt: new Date().toISOString(),
    },
    contentOperatingPlan: plan,
  };
}

/** 송출 pack — Brand OS + core + 채널 통합 평가 */
export function assessCoreEngineDelivery(pack, input = {}, channel = "blog", ctx = {}) {
  const brandOs = assessBrandContentOSQuality(pack, input, ctx);
  const corePublish = assessPublishWithoutEditing(pack, input, {
    channel,
    stage: "core_engine_delivery",
  });
  const corePublishScore = corePublish.publishReady
    ? 92
    : Math.max(35, 92 - (corePublish.reasons?.length || 1) * 12);

  let channelScore = null;
  if (channel === "place" || channel === "instagram") {
    channelScore = scoreChannelContentQuality(pack, channel, ctx, input);
  }

  const composite =
    Math.round(
      brandOs.score * 0.45 +
        corePublishScore * 0.35 +
        (channelScore?.score ?? brandOs.score) * 0.2,
    ) || brandOs.score;

  const enterpriseReady =
    brandOs.pass &&
    composite >= 85 &&
    corePublish.publishReady !== false &&
    (channel === "blog" || (channelScore?.ok ?? true));

  return {
    version: BRICLOG_CORE_ENGINE_VERSION,
    fingerprint: computeProcessFingerprint(),
    manifestId: BRICLOG_PROCESS_MANIFEST_ID,
    channel,
    compositeScore: composite,
    enterpriseReady,
    brandOs,
    corePublish,
    corePublishScore,
    channelScore,
    phaseBreakdown: brandOs.breakdown,
    operatingHeadline: brandOs.plan?.operatingHeadline || input.contentOperatingPlan?.operatingHeadline,
  };
}

function deliveryIntegrityToken(pack, input, assessment) {
  return hashPayload({
    fp: assessment.fingerprint,
    brand: input.brandName,
    topic: input.topic || input.mainKeyword,
    title: pack?.title,
    score: assessment.compositeScore,
  });
}

/** 모든 송출 pack에 코어 엔진 메타 스탬프 (idempotent) */
export function stampCoreEngineDeliveryMeta(pack, input = {}, channel = "blog", ctx = {}) {
  if (!pack || typeof pack !== "object") return pack;

  const existing = pack._meta?.coreEngine;
  if (
    existing?.fingerprint === computeProcessFingerprint() &&
    existing?.version === BRICLOG_CORE_ENGINE_VERSION &&
    !ctx.forceRestamp
  ) {
    return pack;
  }

  const assessment = assessCoreEngineDelivery(pack, input, channel, ctx);

  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      coreEngine: {
        version: BRICLOG_CORE_ENGINE_VERSION,
        manifestId: BRICLOG_PROCESS_MANIFEST_ID,
        fingerprint: assessment.fingerprint,
        compositeScore: assessment.compositeScore,
        enterpriseReady: assessment.enterpriseReady,
        phaseBreakdown: assessment.phaseBreakdown,
        operatingHeadline: assessment.operatingHeadline,
        brandOsScore: assessment.brandOs.score,
        corePublishScore: assessment.corePublishScore,
        channelScore: assessment.channelScore?.score,
        integrityToken: deliveryIntegrityToken(pack, input, assessment),
        selfEvolutionVersion: SELF_EVOLUTION_VERSION,
        stampedAt: new Date().toISOString(),
      },
    },
  };
}

/** pack 지문이 현재 manifest와 일치하는지 */
export function verifyCoreEngineIntegrity(pack) {
  const meta = pack?._meta?.coreEngine;
  if (!meta?.fingerprint) {
    return { ok: false, reason: "missing_core_engine_stamp" };
  }
  const current = computeProcessFingerprint();
  if (meta.fingerprint !== current) {
    return {
      ok: false,
      reason: "fingerprint_mismatch",
      expected: current,
      got: meta.fingerprint,
    };
  }
  return { ok: true, version: meta.version, enterpriseReady: meta.enterpriseReady === true };
}

/** 공개·랜딩·/api/public/core-engine — 비밀 없음 */
export function getCoreEnginePublicProfile() {
  return {
    product: "BRICLOG Brand Content OS",
    version: BRICLOG_CORE_ENGINE_VERSION,
    manifestId: BRICLOG_PROCESS_MANIFEST_ID,
    fingerprint: computeProcessFingerprint(),
    layerCount: BRICLOG_PROCESS_MANIFEST.length,
    layers: BRICLOG_PROCESS_MANIFEST.map(({ layer, version, role }) => ({
      layer,
      version,
      role,
    })),
    defensibility: BRICLOG_DEFENSIBILITY_PILLARS,
    markets: BRICLOG_ENTERPRISE_MARKETS,
    evolution: { version: SELF_EVOLUTION_VERSION, mode: "nightly_cron_and_feedback" },
    positioning: {
      ko: "AI Writer가 아닌 브랜드 콘텐츠 운영 OS",
      en: "Brand content operating system — not a generic AI writer",
    },
  };
}

/** M&A·전략 파트너 Due diligence용 요약 (민감 로직·프롬프트 제외) */
export function buildEnterpriseAcquisitionBrief({ input = {}, pack = null, channel = "blog" } = {}) {
  const profile = getCoreEnginePublicProfile();
  const assessment = pack
    ? assessCoreEngineDelivery(pack, input, channel)
    : null;
  const plan = input.contentOperatingPlan || buildContentOperatingPlan(input);

  return {
    generatedAt: new Date().toISOString(),
    brand: String(input.brandName || "").trim() || null,
    region: String(input.region || "").trim() || null,
    topic: String(input.topic || input.mainKeyword || "").trim() || null,
    channel,
    process: {
      manifestId: profile.manifestId,
      fingerprint: profile.fingerprint,
      layerCount: profile.layerCount,
      selfEvolution: SELF_EVOLUTION_VERSION,
    },
    operatingPlan: {
      headline: plan.operatingHeadline,
      pillars: plan.whatToWrite?.slice?.(0, 4) || [],
    },
    delivery: assessment
      ? {
          compositeScore: assessment.compositeScore,
          enterpriseReady: assessment.enterpriseReady,
          phaseBreakdown: assessment.phaseBreakdown,
          integrityToken: pack?._meta?.coreEngine?.integrityToken,
        }
      : null,
    defensibility: profile.defensibility,
    markets: profile.markets,
    acquisitionThesis: {
      ko: "조사·기획 중심 KPI와 버전 체인 지문으로 복제 비용이 높은 브랜드 콘텐츠 OS",
      en: "High switching cost via research-first KPI chain and stamped multi-module pipeline",
    },
  };
}

export function getCoreEngineInternationalProfile() {
  const base = getCoreEnginePublicProfile();
  return {
    ...base,
    defensibility: BRICLOG_DEFENSIBILITY_PILLARS.map((p) => ({
      id: p.id,
      label: p.en,
    })),
    positioning: base.positioning.en,
  };
}
