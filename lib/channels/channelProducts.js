/**
 * BRICLOG 채널·메뉴 표기 — 짧고 뜻이 하나인 이름 (인스타 캡션 스타일)
 */
import { getChannelHumanVoice } from "@/lib/product/channelHumanVoice";
import { DETAIL_PAGE_PRODUCT } from "@/lib/product/detailPageProduct";

const blogVoice = getChannelHumanVoice("blog");
const placeVoice = getChannelHumanVoice("place");
const instaVoice = getChannelHumanVoice("instagram");
const detailVoice = getChannelHumanVoice("detailPage");

export const CHANNEL_PRODUCTS = {
  blog: {
    id: "blog",
    menuLabel: "이야기",
    shortLabel: "이야기",
    headerTitle: "이야기",
    desc: blogVoice.sidebarDesc,
    voiceRole: blogVoice.role,
    voicePromise: blogVoice.promise,
    icon: "document",
    emptyTitle: "이야기 쓰기",
    emptyDesc:
      "네이버형 장문 이야기예요. 브랜드 · 지역 · 오늘의 한 줄만 넣으면 편집본을 받을 수 있어요.",
    generateLabel: "이야기 쓰기",
  },
  place: {
    id: "place",
    menuLabel: "플레이스",
    shortLabel: "플레이스",
    headerTitle: "플레이스",
    desc: placeVoice.sidebarDesc,
    voiceRole: placeVoice.role,
    voicePromise: placeVoice.promise,
    icon: "map",
    emptyTitle: "플레이스 소개글",
    emptyDesc:
      "한 줄 공지·운영 안내. 모바일에서 바로 복사해 올리기 좋은 짧은 글.",
    startTitle: "오늘의 플레이스 소식",
    startDesc:
      "브랜드 · 지역 · 주제만 채우세요. 어떤 공지인지 고르면 나머지는 AI가 맞춥니다.",
    generateLabel: "플레이스 소개글 만들기",
    deriveBlogLabel: "이야기에서 이어 만들기",
    deriveFromDraftLabel: "다른 채널 초안에서 이어 만들기",
    goBlogLabel: "이야기 탭에서 쓰기",
  },
  detailPage: {
    id: "detailPage",
    menuLabel: "상세",
    shortLabel: "상세",
    headerTitle: DETAIL_PAGE_PRODUCT.name,
    desc: detailVoice.sidebarDesc,
    voiceRole: detailVoice.role,
    voicePromise: detailVoice.promise,
    icon: "bag",
    emptyTitle: "상품 화면 만들기",
    emptyDesc:
      "스마트스토어·쿠팡에 붙일 상품 화면입니다. 사진·강조 문구·꼭 넣을 내용을 넣고, 고를 때 막히는 점부터 짭니다.",
    generateLabel: DETAIL_PAGE_PRODUCT.generateLabel,
  },
  insta: {
    id: "insta",
    menuLabel: "인스타 캡션",
    shortLabel: "인스타",
    headerTitle: "인스타 캡션",
    desc: instaVoice.sidebarDesc,
    voiceRole: instaVoice.role,
    voicePromise: instaVoice.promise,
    icon: "camera",
    emptyTitle: "인스타 캡션 만들기",
    emptyDesc:
      "피드·릴스용 짧은 문장. 폰 화면에 맞춘 줄바꿈과 톤 선택.",
    startTitle: "오늘의 인스타 캡션",
    startDesc:
      "브랜드 · 지역 · 주제만 채우세요. 목적·분위기·해시태그는 AI가 먼저 제안합니다.",
    generateLabel: "인스타 캡션·해시태그 만들기",
    deriveBlogLabel: "이야기에서 이어 만들기",
    deriveFromDraftLabel: "다른 채널 초안에서 이어 만들기",
    goBlogLabel: "이야기 탭에서 쓰기",
  },
  image: {
    id: "image",
    menuLabel: "썸네일 문구",
    shortLabel: "썸네일",
    headerTitle: "썸네일 문구",
    desc: "썸네일·카드용 짧은 문구 (이미지 파일은 별도)",
    icon: "image",
    emptyTitle: "썸네일 문구",
    emptyDesc:
      "썸네일·카드에 쓸 짧은 문구예요. 완성 이미지 파일은 이 메뉴가 아닙니다.",
    startTitle: "썸네일 문구에서 바로 시작",
    startDesc:
      "주제·브랜드만으로도 썸네일 문구를 만들 수 있어요. 다른 채널 초안이 있으면 톤을 이어받습니다.",
    generateLabel: "썸네일 문구 만들기",
    deriveBlogLabel: "이야기에서 이어 만들기",
    deriveFromDraftLabel: "다른 채널 초안에서 이어 만들기",
    goBlogLabel: "이야기 탭에서 쓰기",
  },
  plan: {
    id: "plan",
    menuLabel: "Plans",
    shortLabel: "Plans",
    headerTitle: "Plans",
    desc: "이번 주·이번 달 주제와 채널 리듬",
    icon: "chart",
    emptyTitle: "이번 달 운영 계획",
    emptyDesc:
      "브랜드·지역·습관에 맞춰 이번 주·이번 달 주제와 채널 리듬을 잡습니다.",
  },
  review: {
    id: "review",
    menuLabel: "Review",
    shortLabel: "Review",
    headerTitle: "Review",
    desc: "붙여넣은 초안 점검 · 개선",
    icon: "eye",
  },
  history: {
    id: "history",
    menuLabel: "Library",
    shortLabel: "Library",
    headerTitle: "Library",
    desc: "재사용할 초안 자산",
    icon: "clock",
  },
  growth: {
    id: "growth",
    menuLabel: "Briefs",
    shortLabel: "Briefs",
    headerTitle: "Briefs",
    desc: "지금 브랜드에 적용할 톤·주제",
    icon: "layout",
  },
  today: {
    id: "today",
    menuLabel: "Today",
    shortLabel: "Today",
    headerTitle: "Today",
    desc: "지금 무엇을 써야 하는가",
    icon: "home",
  },
};

/**
 * 사이드바 섹션 — 공개 홈과 같은 여정
 * Discover → Brief → Create → Review → Library
 */
export const WORKSPACE_MENU_SECTIONS = [
  {
    id: "brief",
    label: "Brief",
    menuIds: ["growth", "plan"],
  },
  {
    id: "create",
    label: "Create",
    menuIds: ["blog", "place", "insta"],
  },
  {
    id: "review-library",
    label: "Review · Library",
    menuIds: ["review", "history"],
  },
];

/** 하단 탭 — Create 중심 + Review 바로가기 */
export const MAIN_CHANNEL_IDS = ["blog", "review", "insta"];

export const DEFAULT_SIDEBAR_MENU_ORDER = WORKSPACE_MENU_SECTIONS.flatMap(
  (s) => s.menuIds
);

/** 간단 모드 — Create · Review · Library */
export const SIMPLE_WORKSPACE_SECTIONS = [
  {
    id: "create",
    label: "Create",
    menuIds: ["blog", "place", "insta"],
  },
  {
    id: "more",
    label: "Brief · Review",
    menuIds: ["growth", "plan", "review"],
  },
  {
    id: "manage",
    label: "Library",
    menuIds: ["history"],
  },
];

export function buildSidebarMenuSections({
  demoMode = false,
  menuOrder = null,
  simpleMode = false,
} = {}) {
  const sectionDefs = simpleMode ? SIMPLE_WORKSPACE_SECTIONS : WORKSPACE_MENU_SECTIONS;
  const base = sectionDefs.map((section) => ({
    id: section.id,
    label: section.label,
    items: section.menuIds
      .filter((id) => !(demoMode && id === "history"))
      .map((id) => {
        const p = CHANNEL_PRODUCTS[id];
        return { id: p.id, label: p.menuLabel, icon: p.icon };
      }),
  }));

  if (!menuOrder?.length) return base;

  const byId = new Map();
  for (const section of base) {
    for (const item of section.items) byId.set(item.id, item);
  }
  const seen = new Set();
  const ordered = [];
  for (const id of menuOrder) {
    const item = byId.get(id);
    if (item && !seen.has(id)) {
      ordered.push(item);
      seen.add(id);
    }
  }
  for (const [, item] of byId) {
    if (!seen.has(item.id)) ordered.push(item);
  }

  return sectionDefs.map((section) => ({
    id: section.id,
    label: section.label,
    items: ordered.filter((item) => section.menuIds.includes(item.id)),
  })).filter((s) => s.items.length > 0);
}

/** @deprecated flat list — prefer buildSidebarMenuSections */
export function buildSidebarMenuItems({ demoMode = false } = {}) {
  return buildSidebarMenuSections({ demoMode }).flatMap((s) => s.items);
}

export function channelHeaderTitle(menuId) {
  const id = normalizeWorkspaceMenuId(menuId);
  return CHANNEL_PRODUCTS[id]?.headerTitle || "BRICLOG";
}

export function channelShortLabel(menuId) {
  const id = normalizeWorkspaceMenuId(menuId);
  return CHANNEL_PRODUCTS[id]?.shortLabel || id;
}

/** UI 메뉴 id ↔ 채널 id (instagram → insta) */
const WORKSPACE_MENU_ALIASES = {
  instagram: "insta",
  image: "plan",
  "detail-page": "blog",
  detail: "blog",
};

export function normalizeWorkspaceMenuId(menuId) {
  if (!menuId) return "blog";
  return WORKSPACE_MENU_ALIASES[menuId] || menuId;
}

/** 이야기 쓰기 후 자동 연동 — 프롬프트는 수동 */
export const AUTO_PIPELINE_ORDER = ["blog", "instagram", "place"];

/** 이야기 생성 후 프롬프트 자동 생성 (현재: 메뉴에서만) */
export const AUTO_RUN_PROMPT_ON_BLOG = false;

/** UI에서 실제 AI 이미지 렌더링 노출 */
export const IMAGE_RENDERING_UI_ENABLED = false;
