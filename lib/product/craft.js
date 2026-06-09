/**
 * 제품 경험 카피·기본값 — 짧고, 행동 중심, 기술 용어 최소
 */
import {
  CUSTOMER_MOBILE_TAGLINE,
  CUSTOMER_WORKSPACE_TAGLINE,
  CUSTOMER_WORKSPACE_TAGLINE_COMPACT,
} from "@/lib/copy/customerFacing";

export const WRITE_FLOW_STEPS = [
  { id: "brand", label: "브랜드" },
  { id: "region", label: "지역" },
  { id: "topic", label: "주제" },
];

export const WORKSPACE_BLOG = {
  title: "오늘의 편집본",
  tagline: CUSTOMER_WORKSPACE_TAGLINE,
  taglineCompact: CUSTOMER_WORKSPACE_TAGLINE_COMPACT,
  cta: "조사 후 글 받기",
  ctaBusy: "조사·편집 중…",
  exampleCta: "30초 맛보기 — 예시로 바로 받기",
  exampleHint:
    "업종별 예시가 돌아갑니다. 글을 쌓으면 내 브랜드·주제로 채워 집니다.",
  generatingNote:
    "조사 → 업종 DNA 맞춤 집필 → 해신 기준 점검 순입니다. 새로고침·뒤로가기는 하지 마세요.",
  shortcutHint: "Ctrl+Enter로 바로 받기",
  packChannelsLabel: "플레이스·인스타도 함께",
  packChannelsHint:
    "켜 두면 같은 조사 결과로 플레이스·인스타 편집본을 함께 맞춥니다.",
  packChannelsOffTitle: "블로그 편집본만",
  packChannelsOffBody:
    "블로그 편집본만 먼저 받습니다. 플레이스·인스타는 완성 후 각 메뉴에서 이어갈 수 있어요.",
  packChannelsOnTitle: "한 번 조사, 채널별 편집",
  packChannelsOnBody:
    "조사한 내용을 블로그·플레이스·인스타 형식에 맞게 각각 다듬어 드립니다.",
  packChannelsNote: "썸네일 문구는 이야기 결과에서 이어 만들 수 있어요.",
};

export const CHANNEL_GEN_PREFS = {
  standaloneLabel: "단독으로 받기 (블로그·다른 채널 없이)",
  standaloneHint:
    "끄면 「이어 만들기」를 먼저 시도합니다. 블로그·다른 채널 편집본이 있을 때만 해당됩니다.",
  standaloneOnBody:
    "브랜드·지역·주제만으로 이 채널 편집본을 새로 받습니다.",
  standaloneOffBody:
    "이미 있는 블로그·다른 채널 편집본이 있으면 톤과 주제를 맞춰 이어 만듭니다.",
};

/** @deprecated use EMPTY_STORY — 레거시 import 호환 */
export const EMPTY_STATE = {
  title: "여기에 편집본이 채워집니다",
  description:
    "브랜드 · 지역 · 주제만 채우면 조사한 뒤, 사람이 직접 정리한 것처럼 읽히는 글이 쌓입니다.",
};

export const EMPTY_STORY = {
  title: EMPTY_STATE.title,
  body: "왼쪽 세 단계를 채운 뒤 「조사 후 글 받기」를 누르세요.",
  hintCompact: "막히면 아래 TIP을 펼쳐 보세요.",
  hint: "막히면 「작성 맥락 힌트」를 펼쳐 보세요.",
  hintMature: "주제만 바꿔 다시 받으세요.",
  historyCta: "지난 편집본 보기",
  footer: "완성되면 복사해 네이버·인스타에 바로 붙일 수 있어요.",
};

/** 모바일 이야기 쓰기 — 한 화면에 한 가지에 집중 */
export const MOBILE_STORY = {
  segmentForm: "주제",
  segmentStory: "편집본",
  segmentBusy: "만드는 중",
  emptyBody: "브랜드 · 지역 · 주제만 채우면 됩니다.",
  emptyFooter: "완성되면 네이버·인스타에 바로 붙여 넣을 수 있어요.",
  generatingNote:
    "완성되면 「편집본」 화면으로 바로 넘어갑니다. 창을 닫지 마세요.",
  packNote: "블로그만 먼저 받아요. 플레이스·인스타는 편집본에서 이어갈 수 있어요.",
  tagline: CUSTOMER_MOBILE_TAGLINE,
};

export const LOADING = {
  app: "잠깐만요…",
  appHint: "곧 작업실로 들어갑니다.",
  profile: "계정 확인 중…",
  profileHint: "10초 넘으면 새로고침해 주세요.",
  generationSub: "조사해서 쓰고, 올리기 전 점검까지 — 약 1분. 화면을 닫지 마세요.",
  generationElapsed: (label) => `경과 ${label}`,
  generationRemaining: (label) => `예상 남은 시간 ${label}`,
  generationOverEstimate:
    "예상보다 조금 걸리고 있어요. 거의 다 됐습니다.",
};

export const WELCOME = {
  footer: "저장된 톤으로 다음 편집본도 이어집니다.",
  skip: "건너뛰기",
  start: "시작하기",
  visitFirst: "오늘 첫 방문이에요.",
  visitReturn: (count) => `오늘 ${count}번째 방문이에요.`,
  noLastPost: "브랜드 · 지역 · 오늘의 한 줄만 채우면 편집본이 여기 쌓입니다.",
  situationHint: "주제에는 상황 한 줄이면 충분해요. 예: 이사 전 침대 바꾸기",
  lastPostPrompt: "한번 훑어보세요.",
};

/** 결과 패널 — 「최종 콘텐츠」 대신 편집실 톤 */
export const RESULT_VIEW = {
  sectionLabel: "복사용 편집본",
  copyBlockTitle: "복사용 편집본",
  copyBlockTitleMobile: "편집본",
  copyHint: "아래 내용을 네이버·인스타에 붙여 넣으세요.",
  editorNoteTitle: "에디터 메모",
  readBeforePublish: "발행 전 한 번 더 읽어보세요.",
  draftBannerTitle: "편집본",
  draftBannerBody:
    "아래 내용을 확인해 주세요. 더 다듬고 싶으면 「다시 받기」를 눌러 주세요.",
  completeBannerTitle: "편집본이 준비됐어요",
  completeBannerBody: "복사해서 네이버·인스타에 붙여 넣으면 됩니다.",
};

export const CHANNEL_EXPAND = {
  title: "같은 내용으로 채널 맞추기",
  body: "이야기 편집본을 바탕으로 플레이스·인스타도 같은 톤으로 맞출 수 있어요.",
  placeCta: "플레이스 이어 만들기",
  instaCta: "인스타 이어 만들기",
  dismiss: "나중에",
};

/** 피드백·다듬기 CTA */
export const REFINE_COPY = {
  blog: "이 부분만 다듬기",
  place: "플레이스 편집본 다듬기",
  instagram: "인스타 편집본 다듬기",
  busy: "다듬는 중…",
  placeBusy: "플레이스 다듬는 중…",
  instaBusy: "인스타 다듬는 중…",
  feedbackReflect: "반영해서 다듬기",
  feedbackReflectPlace: "반영해서 플레이스 다듬기",
  feedbackReflectInsta: "반영해서 인스타 다듬기",
};

/** 글 받기·연결 상태 배너 (사용자 화면) */
export const SERVICE_STATUS = {
  checking: "연결 확인 중…",
  briefTitle: "지금은 편집본을 준비할 수 없어요",
  briefBody:
    "잠시 뒤 「조사 후 글 받기」를 다시 눌러 주세요. 계속되면 새로고침 후 재시도해 주세요.",
};

export const EDITOR_IMPROVE = {
  toastDone: "문장을 다듬었어요.",
  toastScore: (before, after) => `품질 ${before}점 → ${after}점`,
};

/** 본문은 성공 — 저장·채널 연동만 백그라운드에서 실패할 때 */
export const BACKGROUND_OPS = {
  saveFailed:
    "편집본은 준비됐어요. 저장은 잠시 뒤 다시 시도하거나 새로고침해 주세요.",
  brandPersistFailed:
    "편집본은 준비됐어요. 브랜드 저장만 나중에 다시 맞춰 주세요.",
  channelFailed: (label) =>
    `편집본은 준비됐어요. ${label} 자동 편집은 건너뛰었습니다.`,
};

export const RETRY = {
  cta: "다시 받기",
  ctaBusy: "다시 받는 중…",
  hint: "입력을 확인한 뒤 「다시 받기」를 눌러 주세요.",
  lengthHint:
    "아직 올리지 않았어요. 글 분량을 맞추지 못했습니다. 「다시 받기」를 눌러 주세요.",
};
