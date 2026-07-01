/**
 * BRICLOG 대원칙 SSOT — 변하지 않는 송출·품질·UX 기준
 * Cursor·에이전트·배치·UI가 동일한 north star를 참조한다.
 */
import { BRICLOG_VISION, BRAND_CONTENT_OS_KPI } from "@/lib/product/briclogBrandContentOS";
import { getCustomerBlogSlaMs } from "@/lib/config/briclogDefaults";
import { HUMAN_BELIEF_MIN_SCORE } from "@/lib/product/humanBeliefEngine";
import { UNEDITED_PUBLISH_MIN_SCORE } from "@/lib/product/uneditedPublishGradeGate";

export const QUALITY_NORTH_STAR_VERSION = "north-star-v1";

/** @readonly */
export const BRICLOG_NORTH_STAR = Object.freeze({
  version: QUALITY_NORTH_STAR_VERSION,
  /** Core1 — 사람이 쓴 글 */
  humanWritten: {
    id: "human_written",
    label: "사람이 쓴 것 같은, 잘 쓰인 글",
    minBeliefScore: HUMAN_BELIEF_MIN_SCORE,
    minPublishScore: UNEDITED_PUBLISH_MIN_SCORE,
  },
  /** 고객 체감 SLA — 조사+글 합산 */
  customerSlaMs: getCustomerBlogSlaMs(),
  /** 무조건 결과 + 우수 — withhold는 quota/throttle만 */
  alwaysDeliver: {
    id: "always_deliver_excellent",
    label: "무조건 결과 · 우수(A) 우선 · 실패 시 조사 기반 quality leap",
    allowWithholdOnly: ["openai_quota", "openai_rate_limit", "auth", "entitlement"],
  },
  /** Vision 2030 — Jobs × 2030 editorial UX */
  vision2030: {
    id: "vision_2030",
    label: "Steve Jobs × 2030 — 한 결정·글값 노출·2분 안에 완료감",
    tokens: "lib/landing/vision2030Styles.js",
  },
  /** Brand Content OS KPI 가중치 */
  kpi: BRAND_CONTENT_OS_KPI,
  vision: BRICLOG_VISION,
});

export function summarizeNorthStarForAgent() {
  const ns = BRICLOG_NORTH_STAR;
  return [
    `【${ns.version}】${ns.vision.tagline}`,
    `· 사람 글 belief≥${ns.humanWritten.minBeliefScore} · publish≥${ns.humanWritten.minPublishScore}`,
    `· SLA ${Math.round(ns.customerSlaMs / 1000)}s · always deliver (${ns.alwaysDeliver.allowWithholdOnly.join(", ")} 제외)`,
    `· KPI 기획${ns.kpi.planning}·조사${ns.kpi.research}·설명${ns.kpi.explain}·글${ns.kpi.writing}·검수${ns.kpi.review}`,
  ].join("\n");
}
