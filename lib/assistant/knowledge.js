/**
 * BRICLOG 도움말 지식 — 확인된 안내만
 */
import { getDailyLimit } from "@/lib/api/usageQuota";
import { PLANS, PLAN_FEATURE_LINES } from "@/lib/billing/plans";
import knowledgeBase from "./knowledgeBase.json" with { type: "json" };
import {
  FORM_ADVANCED_SECTION,
  PLAN_UI_LABEL,
  RESEARCH_TYPE_LABELS,
  formatAutoPipelineOrder,
  formatFreePlanChannelNote,
  formatMonthlyLimits,
} from "./productGuide";

export const IN_APP_HELP_HINT =
  "로그인 후 오른쪽 아래 「도움말」에서 안내를 받을 수 있습니다.";

export const ASSISTANT_TOPICS = [
  "서비스소개",
  "시작하기",
  "브랜드기억",
  "채널",
  "콘텐츠생성",
  "자료조사",
  "화자",
  "검수",
  "한도",
  "요금제",
  "회원가입",
  "로그인",
  "환불",
  "콘텐츠코칭",
  "이모지",
];

export const PROMPT_CATEGORIES = knowledgeBase.promptCategories;

export const QUICK_PROMPTS = [
  { id: "what", label: "BRICLOG이 뭐예요?", category: "product" },
  { id: "scope", label: "어디까지 해주나요?", category: "product" },
  { id: "start", label: "처음 사용 순서", category: "start" },
  { id: "brand_habit", label: "브랜드 작업실·습관", category: "brand" },
  { id: "emoji", label: "이모지·문체 설정", category: "brand" },
  { id: "channels", label: "채널·연동 순서", category: "create" },
  { id: "image", label: "프롬프트 단독", category: "create" },
  { id: "mobile", label: "모바일 화면", category: "start" },
  { id: "generate", label: "글 만드는 방법", category: "create" },
  { id: "research", label: "자료조사·팩트 반영", category: "create" },
  { id: "speaker", label: "화자·방문 후기", category: "create" },
  { id: "quality", label: "어색·템플릿 느낌", category: "create" },
  { id: "limit", label: "한도·업그레이드", category: "billing" },
  { id: "plan", label: "요금제 비교", category: "billing" },
  { id: "refund", label: "환불·해지 FAQ", category: "billing" },
  { id: "login", label: "로그인·가입", category: "account" },
];

export const QUICK_TEXT = {
  what: "BRICLOG은 어떤 서비스인가요?",
  scope: "브릭로그가 직접 업로드나 발행도 해주나요?",
  start: "처음 쓸 때 순서를 알려주세요",
  brand_habit: "브랜드 작업실과 습관은 어떻게 쌓이나요?",
  emoji: "이모지·문체는 어디서 바꾸나요?",
  channels: "이야기·인스타·플레이스 연동 순서",
  image: "프롬프트를 이야기 없이 만들 수 있나요?",
  mobile: "모바일에서 메뉴는 어떻게 쓰나요?",
  generate: "이야기 쓰기로 글 만드는 방법",
  research: "자료조사는 어떻게 쓰나요? 글에 반영되나요?",
  speaker: "화자 선택이랑 방문 후기는 어떻게 쓰나요?",
  quality: "글맛이 가이드·템플릿 같아요. 어떻게 하면 되나요?",
  limit: "콘텐츠 한도를 다 썼어요. 어떻게 하면 되나요?",
  plan: "무료·플러스·스튜디오 요금제 차이",
  refund: "환불·구독 해지는 어떻게 하나요?",
  login: "회원가입이랑 로그인 방법",
};

function planSummaryLines() {
  return ["free", "brand", "studio"].map((id) => {
    const p = PLANS[id];
    const feats = (PLAN_FEATURE_LINES[id] || []).slice(0, 3).join(", ");
    const price = p.displayPrice || "무료";
    return `${p.label}(${price}): ${feats}`;
  });
}

export function buildAssistantContext(ctx = {}) {
  const limit = getDailyLimit();
  const kb = knowledgeBase.product;
  const lines = [
    `서비스: ${kb.name} — ${kb.tagline}`,
    `하는 일: ${kb.scope.join(" / ")}`,
    `채널: ${kb.channels.join(", ")}`,
    `흐름: ${kb.workflow.join(" → ")}`,
    `이야기 연동 순서: ${formatAutoPipelineOrder()}. 프롬프트는 프롬프트 메뉴에서 따로.`,
    `자료조사: 이야기 폼 「${FORM_ADVANCED_SECTION}」 → 「자료조사 사용」. 조사 유형 예: ${RESEARCH_TYPE_LABELS}. 팩트 부족 시 검수에서 멈출 수 있음.`,
    "화자: 같은 「더 맞추기」에서 선택. 방문 후기는 담백한 후기형·실사용 후기형 권장.",
    "프롬프트: 주제·브랜드만으로도 가능. 완성 이미지 파일 UI는 준비 중.",
    "붙여넣기 검수: 콘텐츠 만들기 메뉴 맨 아래",
    "모바일: 하단 탭 이야기·플레이스·인스타 + 더보기(프롬프트·검수·작업실·플랜)",
    "말투·이모지: 이야기 폼 더 맞추기 또는 브랜드 작업실",
    `생성 한도: ${formatMonthlyLimits()}, 하루 약 ${limit}회`,
    `한도·요금: 우측 상단·사이드바 「${PLAN_UI_LABEL}」`,
    formatFreePlanChannelNote(),
    `요금제:\n${planSummaryLines().join("\n")}`,
    "환불·해지: 환불정책·구독 관리. 세부 금액은 추측하지 말 것.",
    `안내: ${IN_APP_HELP_HINT}`,
    "답변에 마크다운(별표 강조) 쓰지 말 것. 짧고 말하듯이.",
  ];
  if (ctx.loggedIn) lines.push("현재: 로그인");
  else lines.push("현재: 비로그인");
  if (ctx.hasBlog) lines.push("현재: 초안 있음");
  return lines.join("\n");
}
