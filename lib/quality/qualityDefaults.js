/**
 * BRICLOG 품질·파이프라인 기본값 (ULTIMATE CONTENT ENGINE V20)
 */
import { MASTER_QUALITY_DIRECTIVE_VERSION } from "@/lib/product/masterQualityDirective";

export const DEFAULT_QUALITY_TARGET = 95;

/** 생성·검수·재작성 공통 목표 (환경변수로 80–100 조정 가능) */
export function getQualityTarget() {
  const raw = Number(process.env.BRICLOG_QUALITY_TARGET);
  if (Number.isFinite(raw) && raw >= 80 && raw <= 100) {
    return Math.round(raw);
  }
  return DEFAULT_QUALITY_TARGET;
}

/** OpenAI 키가 있으면 LLM 우선 (명시적 false일 때만 비활성) */
export function isLlmFirstDefault() {
  return (process.env.BRICLOG_LLM_FIRST || "true").trim().toLowerCase() !== "false";
}

export const PIPELINE_QUALITY_DEFAULTS = {
  masterQualityDirective: MASTER_QUALITY_DIRECTIVE_VERSION,
  betaTestGuardEnforced: true,
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
  v2AxisRequired: true,
  v2PreWriteVerified: true,
  researchEnabled: true,
  blogLengthTier: "medium",
  proficiency: "editor_pro",
  writingSkillLevel: "civilian",
  speechStyle: "editor_pro",
  tone: "trust",
  emotionTemperature: "auto",
  researchMode: "v2_axis",
};

/**
 * @param {Record<string, unknown>} input
 */
export function applyPipelineQualityDefaults(input = {}) {
  const d = PIPELINE_QUALITY_DEFAULTS;
  return {
    ...d,
    ...input,
    betaTestGuardEnforced: input.betaTestGuardEnforced ?? d.betaTestGuardEnforced,
    v2PipelineEnforced: input.v2PipelineEnforced ?? d.v2PipelineEnforced,
    v3EngineEnforced: input.v3EngineEnforced ?? d.v3EngineEnforced,
    v2AxisRequired: input.v2AxisRequired ?? d.v2AxisRequired,
    v2PreWriteVerified: input.v2PreWriteVerified ?? d.v2PreWriteVerified,
    researchEnabled: input.researchEnabled ?? d.researchEnabled,
    blogLengthTier: input.blogLengthTier || d.blogLengthTier,
    proficiency: input.proficiency || d.proficiency,
    writingSkillLevel: input.writingSkillLevel || d.writingSkillLevel,
    speechStyle: input.speechStyle || d.speechStyle,
    emotionTemperature: input.emotionTemperature || d.emotionTemperature,
    researchMode: input.researchMode || d.researchMode,
  };
}
