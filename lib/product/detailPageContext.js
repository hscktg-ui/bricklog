/**
 * BRICLOG 맥락 — 상품 상세 디자인은 별도 툴이 아니라 OS 채널.
 * 보이스·기획·카피·생성 프롬프트가 이 블록을 본다.
 */
import {
  DETAIL_PAGE_WIDTH,
  DETAIL_PAGE_TYPE,
  DETAIL_PAGE_PASTE_STEPS,
} from "@/lib/product/detailPageCatalog";

export const DETAIL_PAGE_CONTEXT_VERSION = "detail-page-context-v1";

export const DETAIL_PAGE_DESIGN_CONTEXT = {
  version: DETAIL_PAGE_CONTEXT_VERSION,
  channel: "detailPage",
  label: "상품 상세",
  designRole: "상세 디자인",
  promise: "고르는 기준이 보이는 860px 상세",
  width: DETAIL_PAGE_WIDTH,
  typeface: "Pretendard",
  h1: DETAIL_PAGE_TYPE.h1,
  h2: DETAIL_PAGE_TYPE.h2,
  body: DETAIL_PAGE_TYPE.body,
  ink: DETAIL_PAGE_TYPE.ink,
  paper: DETAIL_PAGE_TYPE.paper,
  rhythm: "검색의도 → 설명 → 관찰 → 브랜드 은근 → 약한 안내",
  paste: DETAIL_PAGE_PASTE_STEPS[0],
};

export function formatDetailPageDesignBrief() {
  const d = DETAIL_PAGE_DESIGN_CONTEXT;
  return [
    `BRICLOG 상세 디자인: 폭 ${d.width}px · ${d.typeface} · 히어로 ${d.h1}px / 제목 ${d.h2}px / 본문 ${d.body}px.`,
    `리듬: ${d.rhythm}.`,
    "사진은 섹션 순서 슬롯. GPT는 문장만. 이미지는 그리지 않음.",
    "붙여넣기: 스마트스토어·쿠팡 HTML.",
  ].join(" ");
}

export function detailPageOsTopic(input = {}) {
  const product =
    String(input.productName || "").trim() ||
    String(input.topic || "").trim() ||
    "상품";
  return `${product} — 고르는 기준이 보이는 상세`;
}
