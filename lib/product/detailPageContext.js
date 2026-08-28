/**
 * 상품 상세 — 블로그·플레이스·인스타 운영 관점이 아님.
 * 고르는 손님이 비교하는 쇼핑몰 화면(860px HTML).
 */
import {
  DETAIL_PAGE_WIDTH,
  DETAIL_PAGE_TYPE,
  DETAIL_PAGE_PASTE_STEPS,
} from "@/lib/product/detailPageCatalog";

export const DETAIL_PAGE_CONTEXT_VERSION = "detail-page-context-v2";

export const DETAIL_PAGE_DESIGN_CONTEXT = {
  version: DETAIL_PAGE_CONTEXT_VERSION,
  channel: "detailPage",
  label: "상품 상세",
  designRole: "상품 상세 디자인",
  promise: "고르는 기준이 보이는 860px 상세",
  width: DETAIL_PAGE_WIDTH,
  typeface: "Pretendard",
  h1: DETAIL_PAGE_TYPE.h1,
  h2: DETAIL_PAGE_TYPE.h2,
  body: DETAIL_PAGE_TYPE.body,
  ink: DETAIL_PAGE_TYPE.ink,
  paper: DETAIL_PAGE_TYPE.paper,
  rhythm: "고를 때 막히는 점 → 설명 → 관찰 → 브랜드 은근 → 약한 안내",
  paste: DETAIL_PAGE_PASTE_STEPS[0],
};

export function formatDetailPageDesignBrief() {
  const d = DETAIL_PAGE_DESIGN_CONTEXT;
  return [
    `골라보다 상세: 폭 ${d.width}px · ${d.typeface} · 히어로 ${d.h1}px / 제목 ${d.h2}px / 본문 ${d.body}px.`,
    "스마트스토어·쿠팡에서 고르는 화면이다. 블로그 칼럼이 아니다.",
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
