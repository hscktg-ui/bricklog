/**
 * BRICLOG 대원칙 SSOT — 변하지 않는 송출·품질·UX 기준
 * Cursor·에이전트·배치·UI가 동일한 north star를 참조한다.
 *
 * humanBeliefEngine / uneditedPublishGradeGate 를 여기서 import 하지 않음
 * (blogApiHandler 순환 로드 → prod 500 방지). 숫자는 해당 SSOT와 동기 유지.
 */
import { BRICLOG_VISION, BRAND_CONTENT_OS_KPI } from "@/lib/product/briclogBrandContentOS";
import { getCustomerBlogSlaMs } from "@/lib/config/briclogDefaults";

export const QUALITY_NORTH_STAR_VERSION = "north-star-v1";
/** @see humanBeliefEngine HUMAN_BELIEF_MIN_SCORE */
export const NORTH_STAR_MIN_BELIEF_SCORE = 85;
/** @see uneditedPublishGradeGate UNEDITED_PUBLISH_MIN_SCORE */
export const NORTH_STAR_MIN_PUBLISH_SCORE = 85;

/** @readonly */
export const BRICLOG_NORTH_STAR = Object.freeze({
  version: QUALITY_NORTH_STAR_VERSION,
  /** Core1 — 사람이 쓴 글 */
  humanWritten: {
    id: "human_written",
    label: "사람이 쓴 것 같은, 잘 쓰인 글",
    minBeliefScore: NORTH_STAR_MIN_BELIEF_SCORE,
    minPublishScore: NORTH_STAR_MIN_PUBLISH_SCORE,
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
  /** Brand Content OS KPI 가중치 — getter: OS 순환 로드 TDZ 방지 */
  get kpi() {
    return BRAND_CONTENT_OS_KPI;
  },
  get vision() {
    return BRICLOG_VISION;
  },
  /** 인용·경험·브랜드·지역 구조 (측정용 · 하드 withhold 아님) */
  structureCitation: {
    id: "structure_citation",
    label: "결론 선두·경험·브랜드·지역 — AI 브리핑·검색 인용 구조",
    passMin: 70,
    ssot: "lib/quality/structureScoreKpi.js",
  },
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
