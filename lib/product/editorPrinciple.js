/**
 * BRICLOG EDITOR PRINCIPLE — 브랜드 축적·신뢰 우선 SSOT
 */

import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";

import { PRODUCT_TAGLINE } from "@/lib/product/briclogUltimateV20";
import { buildEditorV95PromptBlock } from "@/lib/product/briclogEditorEngineV95";

export const EDITOR_PRINCIPLE_VERSION = "v20";

export const EDITOR_PRINCIPLE_CORE = `【BRICLOG EDITOR PRINCIPLE V20】
브릭로그는 ${PRODUCT_TAGLINE.notProduct}가 아니다. ${PRODUCT_TAGLINE.product}이다.`;

export const EDITOR_PRINCIPLE_METRICS = `모든 콘텐츠는 조회수보다 신뢰 · 기억 · 재방문을 우선한다.`;

export const EDITOR_PRINCIPLE_FAIL = `독자가 "광고 같다"라고 느끼면 실패.`;

export const EDITOR_PRINCIPLE_SUCCESS = `독자가 "직접 경험한 사람이 썼네" · "이 브랜드를 오래 본 사람이 썼네"라고 느끼면 성공.`;

export const EDITOR_PRINCIPLE_BENCHMARK = `브릭로그의 경쟁상대는 ChatGPT가 아니다. 10년차 브랜드 에디터다.`;

export function isEditorPrincipleEnforced() {
  return isBriclogMissionEnforced();
}

export function buildEditorPrinciplePromptBlock() {
  return [
    EDITOR_PRINCIPLE_CORE,
    EDITOR_PRINCIPLE_METRICS,
    EDITOR_PRINCIPLE_FAIL,
    EDITOR_PRINCIPLE_SUCCESS,
    EDITOR_PRINCIPLE_BENCHMARK,
    buildEditorV95PromptBlock(),
  ].join("\n\n");
}
