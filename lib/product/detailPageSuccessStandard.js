/**
 * 브릭로그 상세 성공 기준 SSOT — 브릭로그 평가 방식
 *
 * 블로그: 「글을 받았다」❌ → 「이번 달 운영이 생겼다」✅
 * 상세:   「카피를 받았다」❌ → 「고르는 화면이 생겼다」✅
 *
 * 엔진 95점(글자·구성)은 성공이 아니다. 2026-08-28 디자이너 30인:
 * 쌀 95점이어도 마침 문장 9회 → 12/30 통과. 원두 95·마침 1회 → 30/30.
 *
 * 가중치는 Brand Content OS와 같다: 기획30 · 조사30 · 설명20 · 글10 · 검수10.
 * 검수 도구는 디자이너 30인 패널(`detailPageDesignerPanel30`).
 */
import { assessDetailPageStandard } from "@/lib/product/detailPageStandard";
import { evaluateDetailPageDesignerPanel } from "@/lib/qa/detailPageDesignerPanel30";
import { inspectDetailPageScreenshots } from "@/lib/qa/detailPagePageImage";
import { packFollowsRankingSequence } from "@/lib/product/detailPageRankingPlaybook";

export const DETAIL_PAGE_SUCCESS_VERSION = "gollaboda-success-v3";
export const DETAIL_PAGE_SUCCESS_PASS_SCORE = 90;
export const DETAIL_PAGE_SUCCESS_PANEL_MIN = 90;
export const DETAIL_PAGE_SUCCESS_UNIQUENESS_MIN = 58;
export const DETAIL_PAGE_SUCCESS_PAD_MAX = 2;

export const DETAIL_PAGE_SUCCESS_DOCTRINE = Object.freeze({
  fail: "카피를 받았다",
  pass: "고르는 화면이 생겼다",
  not: ["긴 글", "95점 채우기", "스펙 나열", "지금 바로 구매"],
});

/** 국내 1위는 슬로건이 아니라 출고 기준. */
export const DETAIL_PAGE_KOREA_FIRST = Object.freeze({
  arena: "상세페이지 AI 제작",
  not: "슬로건",
  beats: ["챗봇 상세 글", "대행사 롱페이지 글자 수", "가짜 후기 템플릿"],
  ship: [
    "고르는 화면",
    "카테고리 한글·영문 글꼴",
    "패딩 0",
    "디자이너 30인 평균 90",
    "올린 사진 우선",
    "컷별 상품 사진 생성",
    "카테고리 상세 나열",
    "상세는 이미지",
    "상세 디자이너가 이미지를 봄",
    "첫눈 화면",
    "스마트스토어·쿠팡 복사",
    "가입 전 860 맛보기",
    "네이버 쇼핑 랭킹 페이지 리듬",
    "리스트 샘플 통이미지",
  ],
  notHow: ["가짜 모델컷", "9몰 API"],
});

/** Brand Content OS KPI → 상세 화면. 합 100. */
export const DETAIL_PAGE_SUCCESS_PHASES = Object.freeze([
  {
    id: "planning",
    weight: 30,
    label: "기획",
    axis: "intent",
    meaning: "고를 때 막히는 점부터 화면이 시작한다",
    designerLenses: ["intent", "hierarchy"],
  },
  {
    id: "research",
    weight: 30,
    label: "조사",
    axis: "trust",
    meaning: "넣은 사진·강조·꼭 넣을 내용만. 없는 후기·가격·인증은 없다",
    designerLenses: ["trust"],
  },
  {
    id: "explain",
    weight: 20,
    label: "설명",
    axis: "explain",
    meaning: "특징 나열 금지. 이유·쓰임·관찰이 붙는다",
    designerLenses: ["intent"],
  },
  {
    id: "writing",
    weight: 10,
    label: "글",
    axis: "uniqueness",
    meaning: "같은 마침을 붙여 글자 수를 맞추지 않는다",
    designerLenses: ["uniqueness", "density"],
  },
  {
    id: "review",
    weight: 10,
    label: "검수",
    axis: "panel",
    meaning: "860 페이지 이미지를 상세 디자이너가 본다",
    designerLenses: [
      "hierarchy",
      "type",
      "photo",
      "commercial",
      "cta",
      "color",
    ],
  },
]);

export const DETAIL_PAGE_SUCCESS_HARD_GATES = Object.freeze([
  {
    id: "compliance",
    label: "사실·약한 안내",
    fail: "가짜 후기·지금 바로 구매·없는 인증",
  },
  {
    id: "uniqueness",
    label: "문장은 한 번만",
    fail: "같은 마침을 반복해 95점을 채우지 않는다",
  },
  {
    id: "pad",
    label: "패딩 금지",
    fail: "「고르는 순서가 보이면」 같은 메꿈 문장 3회 이상",
  },
  {
    id: "panel",
    label: "디자이너 30인 90점",
    fail: "화면 평균 90 미만이면 출고하지 않는다",
  },
  {
    id: "page_image",
    label: "상세는 이미지",
    fail: "페이지 이미지를 상세 디자이너가 보지 않았다",
  },
  {
    id: "ranking_rhythm",
    label: "네이버 쇼핑 랭킹 리듬",
    fail: "화면 순서가 네이버 쇼핑 랭킹 상세·리스트 샘플과 다르다",
  },
]);

const HARD_LABEL = Object.fromEntries(
  DETAIL_PAGE_SUCCESS_HARD_GATES.map((g) => [g.id, g.fail])
);

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function explainScore(standard, measured) {
  const parts = [];
  if (standard?.rules?.explain) parts.push(99);
  else parts.push(42);
  if (standard?.rules?.observe_opinion) parts.push(99);
  else parts.push(48);
  if (measured?.intent >= 70) parts.push(measured.intent);
  const avg = parts.reduce((a, b) => a + b, 0) / parts.length;
  return clamp(avg);
}

/**
 * @param {{ pack: object, html?: string, photoCount?: number, input?: object }} args
 */
export function assessDetailPageSuccess(args = {}) {
  const pack = args.pack || {};
  const html = String(args.html || "");
  const photoCount = Number(args.photoCount || 0);
  const input = args.input || {};
  const screenshots = args.screenshots;
  const standard = pack?._meta?.standard || assessDetailPageStandard(pack, input);
  const panel = evaluateDetailPageDesignerPanel({
    pack,
    html,
    photoCount,
    screenshots,
  });
  const measured = panel.measured;
  const mustSeeImage =
    args.requirePageImage === true || screenshots != null;
  const pageImage = inspectDetailPageScreenshots(screenshots || {});

  const phases = DETAIL_PAGE_SUCCESS_PHASES.map((phase) => {
    let score = 50;
    if (phase.id === "planning") score = measured.intent;
    else if (phase.id === "research") score = measured.trust;
    else if (phase.id === "explain") score = explainScore(standard, measured);
    else if (phase.id === "writing") score = measured.uniqueness;
    else if (phase.id === "review") score = panel.summary.mean;
    const ok = score >= DETAIL_PAGE_SUCCESS_PANEL_MIN;
    return { ...phase, score: clamp(score), ok };
  });

  const weighted = Math.round(
    phases.reduce((sum, p) => sum + (p.score * p.weight) / 100, 0)
  );

  const hard = [];
  if (!standard?.ok) hard.push("compliance");
  if (measured.uniqueness < DETAIL_PAGE_SUCCESS_UNIQUENESS_MIN) {
    hard.push("uniqueness");
  }
  if (measured.padHits > DETAIL_PAGE_SUCCESS_PAD_MAX) hard.push("pad");
  if (panel.summary.mean < DETAIL_PAGE_SUCCESS_PANEL_MIN) hard.push("panel");
  if (mustSeeImage && !pageImage.ok) hard.push("page_image");
  if (args.designerVision && args.designerVision.looked && !args.designerVision.ok) {
    hard.push("page_image");
  }
  if (!packFollowsRankingSequence(pack)) hard.push("ranking_rhythm");

  const ok =
    hard.length === 0 && weighted >= DETAIL_PAGE_SUCCESS_PASS_SCORE;

  return {
    version: DETAIL_PAGE_SUCCESS_VERSION,
    ok,
    score: weighted,
    passScore: DETAIL_PAGE_SUCCESS_PASS_SCORE,
    doctrine: ok
      ? DETAIL_PAGE_SUCCESS_DOCTRINE.pass
      : DETAIL_PAGE_SUCCESS_DOCTRINE.fail,
    hard,
    hardLabels: hard.map((id) => HARD_LABEL[id] || id),
    phases,
    panel: {
      mean: panel.summary.mean,
      passCount: panel.summary.passCount,
      n: panel.summary.n,
      hireLabel: panel.summary.hireLabel,
      topIssues: panel.summary.topIssues,
    },
    measured: {
      padHits: measured.padHits,
      uniqueness: measured.uniqueness,
      intent: measured.intent,
      trust: measured.trust,
      engineScore: measured.engineScore,
    },
    standardOk: !!standard?.ok,
    engineScore: pack?._meta?.sqv?.score ?? measured.engineScore,
  };
}

export function detailPageSuccessPassed(pack, extra = {}) {
  return assessDetailPageSuccess({ pack, ...extra }).ok;
}
