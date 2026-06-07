/**
 * BRICLOG 채널·메뉴 표기 — 짧고 뜻이 하나인 이름 (인스타 캡션 스타일)
 */
export const CHANNEL_PRODUCTS = {
  blog: {
    id: "blog",
    menuLabel: "이야기",
    shortLabel: "이야기",
    headerTitle: "이야기",
    desc: "네이버·블로그형 장문",
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
    desc: "사장님 공지·한 줄 소식",
    icon: "map",
    emptyTitle: "플레이스 소개글",
    emptyDesc:
      "한 줄 공지·운영 안내. 모바일에서 바로 복사해 올리기 좋은 짧은 글.",
    startTitle: "플레이스에서 바로 시작",
    startDesc:
      "이야기 글 없이도 공지·소식을 만들 수 있어요. 주제·지역·브랜드만 넣으면 플레이스용 짧은 글·운영 포인트를 채웁니다.",
    generateLabel: "플레이스 소개글 만들기",
    deriveBlogLabel: "이야기에서 이어 만들기",
    deriveFromDraftLabel: "다른 채널 초안에서 이어 만들기",
    goBlogLabel: "이야기 탭에서 쓰기",
  },
  insta: {
    id: "insta",
    menuLabel: "인스타 캡션",
    shortLabel: "인스타",
    headerTitle: "인스타 캡션",
    desc: "피드·릴스용 짧은 문장",
    icon: "camera",
    emptyTitle: "인스타 캡션 만들기",
    emptyDesc:
      "피드·릴스용 짧은 문장. 폰 화면에 맞춘 줄바꿈과 톤 선택.",
    startTitle: "인스타 캡션에서 바로 시작",
    startDesc:
      "이야기 없이도 캡션·해시태그를 만들 수 있어요. 톤·이모지·줄바꿈까지 피드·릴스에 맞게 만듭니다.",
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
  review: {
    id: "review",
    menuLabel: "붙여넣기 검수",
    shortLabel: "검수",
    headerTitle: "붙여넣기 검수",
    desc: "블로그·플레이스·인스타 점검",
    icon: "eye",
  },
  history: {
    id: "history",
    menuLabel: "초안 기록",
    shortLabel: "기록",
    headerTitle: "초안 기록",
    desc: "지난 생성 보관",
    icon: "clock",
  },
  growth: {
    id: "growth",
    menuLabel: "브랜드 작업실",
    shortLabel: "작업실",
    headerTitle: "브랜드 작업실",
    desc: "톤·자료·주제 추천",
    icon: "layout",
  },
};

/** 사이드바 섹션 — 메인 4채널 vs 보관·운영 */
export const WORKSPACE_MENU_SECTIONS = [
  {
    id: "create",
    label: "콘텐츠 만들기",
    menuIds: ["blog", "place", "insta", "image"],
  },
  {
    id: "manage",
    label: "보관 · 운영",
    menuIds: ["review", "growth", "history"],
  },
];

/** 하단 탭 — 프롬프트는 메뉴에서만 (이미지 오해 방지) */
export const MAIN_CHANNEL_IDS = ["blog", "place", "insta"];

export const DEFAULT_SIDEBAR_MENU_ORDER = WORKSPACE_MENU_SECTIONS.flatMap(
  (s) => s.menuIds
);

/** 간단 모드 — 자주 쓰는 메뉴만 */
export const SIMPLE_WORKSPACE_SECTIONS = [
  {
    id: "create",
    label: "콘텐츠 만들기",
    menuIds: ["blog", "place", "insta"],
  },
  {
    id: "more",
    label: "더 보기",
    menuIds: ["growth", "image", "review"],
  },
  {
    id: "manage",
    label: "기록",
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
