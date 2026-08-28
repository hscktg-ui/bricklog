/**
 * 상세페이지 AI가 이기는 법.
 * 핵심은 컷별 상품 사진까지 있는 붙일 화면. 가짜 모델컷·9몰 API는 따라가지 않는다.
 */
import { DETAIL_PAGE_PRODUCT } from "@/lib/product/detailPageProduct";

export const DETAIL_PAGE_COMPETE_VERSION = "briclog-detail-compete-v3";

export const DETAIL_PAGE_COMPETE_WINS = Object.freeze([
  {
    id: "photo-direction",
    loseAs: "빈 칸·카피만 있는 상세",
    they: "드랩·크리에이지·후커블",
    theyDo: "모델컷·배경 합성",
    weWin: "컷별 상품 사진을 생성한다. 올린 사진이 있으면 그걸 먼저 쓴다",
    freeze: "fake_model_shot",
    marker: "data-photo-direction",
  },
  {
    id: "first-glance",
    loseAs: "예쁜 롱페이지 비주얼",
    they: "젠시·후커블",
    theyDo: "전환 템플릿 롱페이지",
    weWin: "첫눈에 고르는 화면 (글꼴·칸·레이아웃)",
    freeze: null,
    marker: 'data-visual="first-glance"',
  },
  {
    id: "two-mall-paste",
    loseAs: "멀티몰 원클릭 전송",
    they: "키위스냅",
    theyDo: "최대 9몰 동시 전송",
    weWin: "스마트스토어·쿠팡에 섹션 이미지(통이미지)를 위에서부터 올린다",
    freeze: "new_feature",
    marker: "data-mall",
  },
]);

export const DETAIL_PAGE_MALLS = Object.freeze([
  {
    id: "smartstore",
    label: "스마트스토어",
    copyLabel: "스마트스토어 이미지",
    width: 860,
    steps: [
      "스마트스토어 상품 등록을 연다",
      "상세 설명에 이미지를 위에서부터 올린다",
      "미리보기에서 화면이 붙었는지 확인한다",
    ],
  },
  {
    id: "coupang",
    label: "쿠팡",
    copyLabel: "쿠팡 이미지",
    width: 860,
    steps: [
      "쿠팡 윙 상품 등록을 연다",
      "상세 설명에 이미지를 위에서부터 올린다",
      "미리보기에서 화면이 붙었는지 확인한다",
    ],
  },
]);

export function resolveDetailPageMall(mallId = "smartstore") {
  return (
    DETAIL_PAGE_MALLS.find((m) => m.id === String(mallId || "")) ||
    DETAIL_PAGE_MALLS[0]
  );
}

export function listDetailPageCompeteWins() {
  return DETAIL_PAGE_COMPETE_WINS;
}

export function assertProductShotWin() {
  const win = DETAIL_PAGE_COMPETE_WINS.find((w) => w.id === "photo-direction");
  return Boolean(win && win.freeze !== "image_generation");
}

/** @deprecated 이름만 호환. 상세 AI 핵심은 컷 생성이다. */
export function assertNoImageGenerationWin() {
  return assertProductShotWin();
}

/**
 * @param {{ html?: string, wrapHtml?: string }} args
 */
export function assessDetailPageCompeteWins(args = {}) {
  const html = String(args.html || "");
  const wrapHtml = String(args.wrapHtml || "");
  const combined = `${html}\n${wrapHtml}`;
  const checks = DETAIL_PAGE_COMPETE_WINS.map((win) => {
    let ok = combined.includes(win.marker);
    if (win.id === "photo-direction") {
      ok =
        html.includes('data-photo-direction="hero"') &&
        html.includes('data-photo-direction="observe"') &&
        html.includes('data-photo-direction="feature"');
    }
    if (win.id === "first-glance") {
      ok =
        html.includes('data-visual="first-glance"') &&
        html.includes('data-layout="hero-stack"') &&
        html.includes("860px");
    }
    if (win.id === "two-mall-paste") {
      ok =
        wrapHtml.includes('data-mall="smartstore"') ||
        wrapHtml.includes('data-mall="coupang"') ||
        (html.includes("data-mall-ready") &&
          html.includes("smartstore") &&
          html.includes("coupang"));
    }
    return { id: win.id, ok, weWin: win.weWin, loseAs: win.loseAs };
  });
  return {
    version: DETAIL_PAGE_COMPETE_VERSION,
    product: DETAIL_PAGE_PRODUCT.name,
    ok: checks.every((c) => c.ok),
    checks,
    malls: DETAIL_PAGE_MALLS.map((m) => m.id),
    noImageGen: false,
    productShots: assertProductShotWin(),
  };
}
