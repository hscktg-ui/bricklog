/**
 * BRAND SUBENGINE — 승인본 2편+ 브랜드별 연속 서브엔진 (모방 방어)
 */
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";

export const BRAND_SUBENGINE_VERSION = "v1";
export const BRAND_SUBENGINE_MIN_PAST = 2;

export function getBrandPastContentCount(ctx = {}) {
  const input = ctx.input || ctx;
  return Number(
    input.approvedContentCount ??
      input.pastContentCount ??
      ctx.approvedContentCount ??
      ctx.pastContentCount ??
      0
  );
}

export function isBrandSubengineActive(ctx = {}) {
  return (
    isBriclogMissionEnforced() &&
    getBrandPastContentCount(ctx) >= BRAND_SUBENGINE_MIN_PAST
  );
}

export function buildBrandSubenginePromptBlock(ctx = {}) {
  if (!isBrandSubengineActive(ctx)) return "";

  const input = ctx.input || ctx;
  const count = getBrandPastContentCount(ctx);
  const anchors = input.styleAnchors || ctx.styleAnchors || [];
  const anchorLines = anchors
    .slice(0, 3)
    .map((a, i) => `${i + 1}. ${a.title || "승인본"}: ${a.snippet || ""}`)
    .filter((l) => l.length > 10);

  return [
    `【BRAND SUBENGINE v1 · 연속 ${count}편+】`,
    "이 글은 신규 브랜드 소개가 아니라 기존 시리즈의 다음 장이다.",
    "금지: 「처음 소개」「어떤 브랜드인지」「서비스를 소개」·매번 같은 브랜드 설명.",
    "허용: 지난 글 확장·새 관점·새 질문·새 행사·새 상황.",
    "독자는 이미 이 브랜드를 본 사람 — reintro 없이 바로 이번 주제로.",
    anchorLines.length
      ? `승인본 리듬(복사 금지):\n${anchorLines.join("\n")}`
      : input.brandApprovedContentBrief
        ? String(input.brandApprovedContentBrief).slice(0, 600)
        : "",
  ]
    .filter(Boolean)
    .join("\n");
}
