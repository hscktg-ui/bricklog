/**
 * 제품 경험 카피·기본값 — 짧고, 행동 중심, 기술 용어 최소
 */

export const WRITE_FLOW_STEPS = [
  { id: "brand", label: "브랜드" },
  { id: "region", label: "지역" },
  { id: "topic", label: "주제" },
];

export const WORKSPACE_BLOG = {
  title: "오늘의 글",
  tagline: "브랜드 · 지역 · 주제 — 세 가지만 채우세요.",
  taglineCompact: "세 칸만 채우면 됩니다.",
  cta: "이야기 쓰기",
  ctaBusy: "이야기를 쓰는 중…",
  exampleCta: "30초 맛보기 — 예시로 바로 생성",
  exampleHint:
    "업종별 예시가 돌아갑니다. 글을 쌓으면 내 브랜드·주제로 채워 집니다.",
  generatingNote:
    "완성되면 오른쪽에 글이 표시됩니다. 새로고침·뒤로가기는 하지 마세요.",
  shortcutHint: "Ctrl+Enter로 바로 생성",
  packChannelsLabel: "플레이스·인스타도 함께 만들기",
  packChannelsHint:
    "끄면 이야기 결과만 먼저 보여 줍니다. 켜면 같은 글 기준으로 플레이스·인스타를 뒤에서 채웁니다.",
  packChannelsOffTitle: "이야기만 먼저 (추천)",
  packChannelsOffBody:
    "오른쪽에 이야기가 먼저 뜹니다. 플레이스·인스타는 완성 후 각 메뉴에서 「바로 만들기」로 이어갈 수 있어요.",
  packChannelsOnTitle: "채널팩 함께 만들기",
  packChannelsOnBody:
    "이야기가 준비되면 같은 주제로 플레이스·인스타 문구를 백그라운드에서 채웁니다. 화면은 이야기부터 보여 줍니다.",
  packChannelsNote: "비주얼 프롬프트는 「프롬프트」 메뉴에서 따로 만듭니다.",
};

export const CHANNEL_GEN_PREFS = {
  standaloneLabel: "단독으로 만들기 (이야기·초안 없이)",
  standaloneHint:
    "끄면 「이어 만들기」를 먼저 시도합니다. 이야기·다른 채널 초안이 있을 때만 해당됩니다.",
  standaloneOnBody:
    "브랜드·지역·주제만으로 이 채널 글을 새로 만듭니다. 이야기 글이 없어도 됩니다.",
  standaloneOffBody:
    "이미 있는 이야기·다른 채널 초안이 있으면 톤과 주제를 맞춰 이어 만듭니다. 없으면 단독으로 만듭니다.",
};

export const EMPTY_STORY = {
  title: "여기에 이야기가 채워집니다",
  body: "왼쪽 세 단계를 채운 뒤 이야기 쓰기를 누르세요.",
  hintCompact: "막히면 아래 TIP을 펼쳐 보세요.",
  hint: "막히면 「작성 맥락 힌트」를 펼쳐 보세요.",
  hintMature: "주제만 바꿔 이야기 쓰기를 누르세요.",
  historyCta: "초안 기록에서 지난 글 보기",
};

export const LOADING = {
  app: "잠깐만요…",
  appHint: "곧 작업실로 들어갑니다.",
  profile: "계정 확인 중…",
  profileHint: "10초 넘으면 새로고침해 주세요.",
  generationSub: "보통 30초~2분. 화면을 닫지 마세요.",
  generationElapsed: (label) => `경과 ${label}`,
  generationRemaining: (label) => `예상 남은 시간 ${label}`,
  generationOverEstimate:
    "예상보다 조금 걸리고 있어요. 거의 다 됐습니다.",
};

export const WELCOME = {
  footer: "저장된 톤으로 다음 글도 이어집니다.",
  skip: "건너뛰기",
  start: "시작하기",
  visitFirst: "오늘 첫 방문이에요.",
  visitReturn: (count) => `오늘 ${count}번째 방문이에요.`,
  noLastPost: "브랜드 · 지역 · 주제만 채우면 이야기가 여기 쌓입니다.",
  lastPostPrompt: "한번 훑어보세요.",
};

/** 글 생성·연결 상태 배너 (사용자 화면) */
export const SERVICE_STATUS = {
  checking: "연결 확인 중…",
  briefTitle: "지금은 구성안만 만들어 드려요",
  briefBody:
    "잠시 뒤 다시 「이야기 쓰기」를 눌러 보세요. 계속되면 새로고침 후 재시도해 주세요.",
};

export const EDITOR_IMPROVE = {
  toastDone: "문장을 다듬었어요.",
  toastScore: (before, after) => `품질 ${before}점 → ${after}점`,
};

/** 블로그 본문은 성공 — 저장·채널 연동만 백그라운드에서 실패할 때 */
export const BACKGROUND_OPS = {
  saveFailed:
    "이야기는 준비됐어요. 저장은 잠시 뒤 다시 시도하거나 새로고침해 주세요.",
  brandPersistFailed:
    "이야기는 준비됐어요. 브랜드 저장만 나중에 다시 맞춰 주세요.",
  channelFailed: (label) =>
    `이야기는 준비됐어요. ${label} 자동 생성은 건너뛰었습니다.`,
};

export const EMAIL_VERIFY = {
  title: "이메일 인증이 필요해요",
  body: "메일함(스팸 포함)의 링크를 누른 뒤 새로고침하세요. 그 전에는 글 생성이 잠시 멈춥니다.",
  resend: "인증 메일 다시 보내기",
};
