/**
 * 섹션별 촬영 지시. 같은 포장 정면을 복제하지 않는다.
 * 이미지 모델은 제품 연출컷만. 한글·가격·인증 마크는 그리지 않는다.
 */
import { buildDetailPageCategoryListing } from "@/lib/product/detailPageCategoryFlow";

export const DETAIL_PAGE_IMAGE_BRIEF_VERSION = "detail-image-brief-v1";

const SLOT_ROLE = Object.freeze({
  hero: "packshot",
  observe: "detail",
  feature: "package",
  scene: "usage",
});

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function groceryBriefs(product) {
  return {
    hero: {
      purpose: "제품 전체 정면",
      subject: `${product} 포장 앞면`,
      composition: "정면, 포장이 화면 상단 58%",
      camera: "정면",
      lighting: "부드러운 스튜디오 조명",
      background: "베이지 종이 바닥",
      color: "포장 원색 유지",
      include: "실제 포장, 로고, 한글 라벨",
      exclude: "새 문구, 인증 마크, 숫자, 모델, 밥그릇",
      proof: "이 상품의 실제 포장",
    },
    observe: {
      purpose: "원물 매크로",
      subject: `${product} 쌀알`,
      composition: "매크로, 쌀알이 화면 중앙",
      camera: "매크로",
      lighting: "자연광",
      background: "도정한 쌀만 보이는 무배경",
      color: "실제 쌀알 색",
      include: "쌀알 질감",
      exclude: "포장 정면 반복, 모델, 읽을 수 있는 한글, 인증 마크",
      proof: "원물 겉모습",
    },
    feature: {
      purpose: "패키지 확대",
      subject: `${product} 포장 라벨`,
      composition: "45도 가까이, 라벨이 읽히게",
      camera: "45도",
      lighting: "부드러운 스튜디오 조명",
      background: "포장과 같은 톤",
      color: "라벨 원색",
      include: "원본 로고와 한글 라벨",
      exclude: "새로운 문구, 인증 마크, 숫자 생성, 다른 SKU",
      proof: "포장 표기",
    },
    scene: {
      purpose: "완성된 결과",
      subject: `${product}로 지은 밥`,
      composition: "상단 시점, 그릇과 밥만",
      camera: "상단 시점",
      lighting: "자연광",
      background: "식탁, 사람 없음",
      color: "밥의 실제 색",
      include: "그릇, 밥",
      exclude: "모델, 포장 정면 반복, 인증, 한글 오버레이",
      proof: "밥을 지은 상태",
    },
  };
}

function cafeBriefs(product) {
  return {
    hero: {
      purpose: "봉투 전체 정면",
      subject: `${product} 봉투 앞면`,
      composition: "정면, 봉투가 화면 상단 58%",
      camera: "정면",
      lighting: "부드러운 스튜디오 조명",
      background: "따뜻한 종이 바닥",
      color: "봉투 원색 유지",
      include: "실제 봉투, 로고, 한글 라벨",
      exclude: "새 문구, 인증 마크, 숫자, 모델, 컵",
      proof: "이 상품의 실제 봉투",
    },
    observe: {
      purpose: "원두 매크로",
      subject: `${product} 원두`,
      composition: "매크로, 원두가 화면 중앙",
      camera: "매크로",
      lighting: "자연광",
      background: "원두만 보이는 무배경",
      color: "실제 원두 색",
      include: "원두 질감",
      exclude: "봉투 정면 반복, 모델, 읽을 수 있는 한글, 인증 마크",
      proof: "원두 겉모습",
    },
    feature: {
      purpose: "패키지 확대",
      subject: `${product} 봉투 라벨`,
      composition: "45도 가까이, 라벨이 읽히게",
      camera: "45도",
      lighting: "부드러운 스튜디오 조명",
      background: "봉투와 같은 톤",
      color: "라벨 원색",
      include: "원본 로고와 한글 라벨",
      exclude: "새로운 문구, 인증 마크, 숫자 생성, 다른 SKU",
      proof: "봉투 표기",
    },
    scene: {
      purpose: "내려 마신 결과",
      subject: `${product}로 내린 잔`,
      composition: "상단 시점, 잔과 추출만",
      camera: "상단 시점",
      lighting: "자연광",
      background: "테이블, 사람 없음",
      color: "추출의 실제 색",
      include: "잔, 추출",
      exclude: "모델, 봉투 정면 반복, 인증, 한글 오버레이",
      proof: "내려 마신 상태",
    },
  };
}

function defaultBriefs(product) {
  return {
    hero: {
      purpose: "제품 전체 정면",
      subject: `${product} 전체`,
      composition: "정면, 상품이 상단 58%",
      camera: "정면",
      lighting: "부드러운 스튜디오 조명",
      background: "상품과 어울리는 무배경",
      color: "제품 원색",
      include: "실제 상품, 로고, 라벨",
      exclude: "새 문구, 인증 마크, 모델",
      proof: "실제 상품 형태",
    },
    observe: {
      purpose: "원물 또는 디테일 매크로",
      subject: `${product} 디테일`,
      composition: "매크로, 질감이 중앙",
      camera: "매크로",
      lighting: "자연광",
      background: "단순한 바닥",
      color: "소재 원색",
      include: "소재 질감",
      exclude: "포장 정면 반복, 모델, 인증 마크",
      proof: "소재·원물",
    },
    feature: {
      purpose: "패키지 또는 가공 확대",
      subject: `${product} 가까이`,
      composition: "45도",
      camera: "45도",
      lighting: "부드러운 스튜디오 조명",
      background: "상품 톤",
      color: "라벨 원색",
      include: "원본 라벨",
      exclude: "새 문구, 다른 SKU",
      proof: "가공·포장 표기",
    },
    scene: {
      purpose: "조리·사용 과정",
      subject: `${product}를 쓰는 장면`,
      composition: "사용 중인 상품만",
      camera: "정면",
      lighting: "자연광",
      background: "실제 사용 환경, 사람 없음",
      color: "현장 색",
      include: "상품과 쓰임",
      exclude: "모델컷, 포장 정면 반복",
      proof: "쓰는 상태",
    },
  };
}

export function buildDetailPageImageBrief(slot, input = {}) {
  const product = clean(input.productName) || "상품";
  const listing = buildDetailPageCategoryListing(input);
  const bank =
    listing.key === "grocery"
      ? groceryBriefs(product)
      : listing.key === "cafe"
        ? cafeBriefs(product)
        : defaultBriefs(product);
  const raw = bank[slot];
  if (!raw) return null;
  const altText = `${raw.subject}`;
  return {
    slot,
    role: SLOT_ROLE[slot] || "packshot",
    ...raw,
    altText,
    prompt: formatDetailPageShotPromptKo({ ...raw, product }),
  };
}

export function formatDetailPageShotPromptKo(brief = {}) {
  return [
    "한국 온라인 쇼핑몰 상세페이지용 상품 사진.",
    `피사체: ${clean(brief.subject) || clean(brief.product) || "상품"}.`,
    `구도: ${clean(brief.composition) || clean(brief.camera) || "정면"}.`,
    `조명: ${clean(brief.lighting) || "부드러운 스튜디오 조명"}.`,
    `배경: ${clean(brief.background) || "실제 상품과 어울리는 환경"}.`,
    `표현 목표: ${clean(brief.proof) || clean(brief.purpose) || "상품 사실"}.`,
    "실제 패키지의 로고·한글·라벨은 원본 그대로 유지.",
    "새로운 문구, 인증 마크, 숫자, 장식 라벨을 생성하지 않음.",
    "과도한 보정, 비현실적인 원물, 중복된 사물, 읽을 수 없는 한글 금지.",
    "모바일 상세페이지에서 사용할 수 있도록 중심 피사체와 여백을 확보.",
  ].join(" ");
}

export function imageBriefLine(brief) {
  if (!brief) return "";
  if (typeof brief === "string") return clean(brief);
  return clean([brief.purpose, brief.subject].filter(Boolean).join(". "));
}

export function attachDetailPageImageBriefs(sections, input = {}) {
  return (sections || []).map((section) => {
    const brief = buildDetailPageImageBrief(section.type, input);
    if (!brief) return section;
    return {
      ...section,
      imageBrief: brief,
      altText: section.altText || brief.altText,
    };
  });
}
