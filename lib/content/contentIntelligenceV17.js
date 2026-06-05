/**
 * BRICLOG ULTIMATE MASTER ENGINE V17 — Multi-AI Content Operating System
 */
import {
  MASTER_ENGINE_V14_BANNED_OUTPUT_PHRASES,
  MASTER_ENGINE_V14_CHANNEL_RULES,
} from "@/lib/content/contentIntelligenceV14";
import { V14_TOPIC_DOMINANCE_MIN } from "@/lib/content/contentIntelligenceV14";

export { V14_TOPIC_DOMINANCE_MIN as V17_TOPIC_DOMINANCE_MIN };

/** Reviewer AI — 80점 미만 재작성 (100점 만점 환산) */
export const V17_REVIEWER_PASS_SCORE = 80;

/** Multi-AI orchestration (조사·메모리 AI는 글 작성 금지) */
export const MASTER_ENGINE_V17_MULTI_AI_PIPELINE = [
  { id: "research_ai", label: "Research AI (Gemini)", writes: false },
  { id: "local_ai", label: "Local AI (Naver)", writes: false },
  { id: "memory_ai", label: "Memory AI (BRICLOG)", writes: false },
  { id: "topic_expansion_ai", label: "Topic Expansion AI", writes: false },
  { id: "knowledge_merge", label: "Knowledge Merge", writes: false },
  { id: "writer_ai", label: "Writer AI (GPT)", writes: true },
  { id: "duplicate_killer_ai", label: "Duplicate Killer AI", writes: false },
  { id: "length_controller_ai", label: "Length Controller AI", writes: false },
  { id: "reviewer_ai", label: "Reviewer AI", writes: false },
];

export const MASTER_ENGINE_V17_WRITE_PIPELINE = [
  "input",
  "plan_internal",
  "write",
  "duplicate_killer",
  "length_control",
  "reviewer",
  "v17_pre_output",
  "output",
];

export const MASTER_ENGINE_V17_BANNED_OUTPUT_PHRASES = [
  ...MASTER_ENGINE_V14_BANNED_OUTPUT_PHRASES,
  "콘텐츠 일관성",
  "Multi-AI",
  "Research AI",
  "Writer AI",
];

export const MASTER_ENGINE_V17_PHILOSOPHY = `브릭로그는 AI 글쓰기 도구가 아니다. 브랜드를 축적하는 AI 콘텐츠 팀이다.
목표는 SEO가 아니라 브랜드 축적이다. 검색 노출은 결과이고 브랜드 일관성이 원인이다.`;

export const MASTER_ENGINE_V17_INFORMATION_RULES = `정보량 생성기: 사용자 주제 문장 그대로 출력 금지. 20~50 정보 단위 분해→조사→전문 에디터 칼럼 재구성. 길이 부족 시 문장·CTA·의미 반복 금지. Section Planner·Information Units로 미커버 단위마다 새 정보 추가. 글자수만 늘리는 패딩 금지.`;

export const MASTER_ENGINE_V17_GLOBAL_RULES = `【BRICLOG ULTIMATE ENGINE V17 — Multi-AI · 정보량 우선】
- ${MASTER_ENGINE_V17_PHILOSOPHY.replace(/\n/g, " ")}
- 최우선 입력: 브랜드·브랜드유형·업종·지역·주제·목적·글분량·시즌. 시스템 프롬프트보다 항상 우선.
- 조사 AI(Gemini)·로컬 AI(네이버)·메모리 AI·주제 확장 AI는 정보 수집만 — 글 작성 금지.
- Writer AI(GPT)는 조사·확장·메모리 병합 결과만으로 WRITE(완성본) 작성. 자체 조사 금지.
- Duplicate Killer: 문장 유사도 70%+·동일 정보 반복 제거·새 정보로 대체 (V20 Human Addon).
- Section Planner(Writer 전): 업종 무관 정보 단위 분해 — 각 섹션은 서로 다른 정보.
- Information Expansion: 길이 미달 시 새 섹션·FAQ·비교·활용 정보만 추가. 기존 문장 반복·패딩 금지.
- Length Controller: 짧은 1800–2200 / 중간 2800–3200 / 긴 3800–5000자. 미달·초과 재작성.
- Duplicate Detector: 문장 유사도 70%+ 실패, 동일 정보 반복 실패 → 재생성.
- Information Score: 글자수가 아닌 정보량 80점 미만 → 재생성.
- Reviewer: 허구·정보량·중복·업종·지역·글자수·SEO·철학 노출 검사. 80점 미만 재작성.
- PLAN(구성안·체크리스트·내부 설계 소제목) 절대 출력 금지. 사용자는 복사 후 즉시 발행 가능한 본문만.
- 금지 출력(엔진 내부용): 브랜드 메모리·기억 엔진·콘텐츠 축적·운영 관점·검수 기준·브랜드 철학·목적/톤 고정·informative/emotional·콘텐츠 일관성.
- 브릭로그는 브릭로그를 설명하지 않는다. 사용자 브랜드·지역·업종·주제를 가장 깊고 정확하게 설명한다.`;

export const MASTER_ENGINE_V17_CHANNEL_RULES = {
  ...MASTER_ENGINE_V14_CHANNEL_RULES,
  blog: `블로그: 네이버 발행 가능한 완성 본문. PLAN·구성안·운영 가이드 금지. 정보량·검색 의도 답변 우선.`,
  place: `스마트플레이스: 공지·행사·혜택·예약·방문 유도. 보조 키워드 UI·철학 설명 금지.`,
  instagram: `인스타: 짧은 hook·캡션·CTA·해시태그. 블로그식 장문 금지.`,
  review: `검수: 평가·문제점·개선점만. 새 글 생성 금지.`,
};

/** V17 FINAL CHECK 9항 */
export const MASTER_ENGINE_V17_PRE_OUTPUT_CHECKLIST = [
  "write_not_plan",
  "brand_reflected",
  "region_reflected",
  "topic_dominance_80",
  "industry_density",
  "repetition_ok",
  "length_tier_ok",
  "no_fiction",
  "no_meta_philosophy_leak",
];
