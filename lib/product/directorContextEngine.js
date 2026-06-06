/**
 * DIRECTOR CONTEXT ENGINE — 30년차 편집장·디렉터·블로거 관점
 * Cursor 대화 한 줄이 아니라, 누적된 모든 요구·맥락을 생성 전에 한데 모은다.
 */
import { getPriorityDevelopmentBrief, PIPELINE_ORDER_STRICT } from "@/lib/product/briclogPriority";
import { formatContextLockBrief } from "@/lib/content/contextLockEngine";
import { buildAiRoleSummaryKo, BRICLOG_GOAL_BRIEF } from "@/lib/product/briclogUltimateV20";
import { MIN_CONTENT_RELEVANCE_RATE } from "@/lib/content/contextLockEngine";

export const DIRECTOR_CONTEXT_VERSION = "v1";

const DIRECTOR_PERSONA = `【편집장 페르소나】
당신은 30년차 편집장·콘텐츠 디렉터·현장 블로거다.
독자가 10초 안에 「이 브랜드가 뭘 하는 곳인지」 알 수 있게 쓴다.
마케터 말투·GPT 상투·조사 메모 붙여넣기가 아니라, 발행 직전 편집본을 만든다.`;

/** 제품·대화·우선순위에서 축적된 요구사항 (SSOT) */
const PRODUCT_DIRECTOR_CANON = [
  "ENGINE OVERRIDE: 먼저 주제맵·정보확보율·주제설명률을 통과한 뒤에만 작성한다.",
  "키워드 반복·길이 채우기 금지 — 새로운 정보 단위로만 품질을 판단한다.",
  "목표: 사용자가 수정 없이 복사·네이버·인스타에 붙여 넣을 수 있는 편집본.",
  `파이프라인: ${PIPELINE_ORDER_STRICT.join(" → ")} — 순서를 건너뛰지 않는다.`,
  "생성 전 업종·브랜드·주제를 확정하고, 그 업종에서만 쓰는 용어·질문·구조로 쓴다.",
  `본문 ${Math.round(MIN_CONTENT_RELEVANCE_RATE * 100)}% 이상은 브랜드·업종·주제와 직접 관련.`,
  "타 업종 단어(알레르기·매트리스·광고대행 등)가 섞이면 실패·재작성.",
  "기능 추가보다 엔진 품질·발행 가능성이 우선.",
  "피드백은 Cursor 한 줄만이 아니다 — 아래 【누적 맥락】 전부를 동시에 반영한다.",
];

const FEEDBACK_SOURCE_LABELS = {
  userWriting: "계정 글쓰기 습관",
  account: "운영 프로필·역할",
  brandFeedback: "브랜드 피드백·태그 학습",
  humanCorrection: "사용자 직접 수정 학습",
  performance: "성과·전환 학습",
  brandWiki: "브랜드 위키·엔티티",
  brandPhilosophy: "브랜드 철학·승인본 톤",
  contextLock: "업종·브랜드·주제 확정",
  topicMap: "주제맵·필수 설명 항목",
  deepLearning: "고객 상황·현장 장면",
  priority: "개발 우선순위·품질 축",
  evolutionRules: "전역 Self-Evolution 규칙",
  mission: "BRICLOG 미션·교리",
};

function trimBrief(text = "", max = 1200) {
  const t = String(text || "").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/** 클라이언트 번들 — fs 기반 rulesStore 미사용 (서버 프롬프트는 buildBlogPrompt에서 주입) */
function readEvolutionPromptAddon(input = {}) {
  return String(input.evolutionLabBrief || input.evolutionRulesBrief || "").trim();
}

/**
 * 이번 생성에 반영된 맥락 출처 (디버그·메타)
 */
export function collectDirectorFeedbackSources(input = {}) {
  const sources = [];
  const add = (id, present, snippet = "") => {
    if (!present) return;
    sources.push({
      id,
      label: FEEDBACK_SOURCE_LABELS[id] || id,
      active: true,
      snippet: snippet ? String(snippet).slice(0, 120) : "",
    });
  };

  add("userWriting", Boolean(input.userWritingBrief), input.userWritingBrief);
  add("account", Boolean(input.accountBrief), input.accountBrief);
  add("brandFeedback", Boolean(input.brandFeedbackBrief), input.brandFeedbackBrief);
  add("humanCorrection", Boolean(input.humanCorrectionBrief), input.humanCorrectionBrief);
  add("performance", Boolean(input.performanceLearningBrief), input.performanceLearningBrief);
  add("brandWiki", Boolean(input.brandWikiBrief), input.brandWikiBrief);
  add("brandPhilosophy", Boolean(input.brandPhilosophyBrief), input.brandPhilosophyBrief);
  add("contextLock", Boolean(input.contextLockBrief || input.contextLock), input.contextLockBrief);
  add("topicMap", Boolean(input.topicMapBrief || input.topicMap), input.topicMapBrief);
  add("deepLearning", Boolean(input.deepLearningBrief), input.deepLearningBrief);
  add("priority", Boolean(input.priorityBrief), input.priorityBrief);
  add("evolutionRules", Boolean(readEvolutionPromptAddon(input)));
  add("mission", true, BRICLOG_GOAL_BRIEF);

  return sources;
}

/**
 * 생성 전·감사 시 주입할 통합 디렉터 브리프
 * @param {Record<string, unknown>} input — prepareBriclogPreWriteContext 이후 enriched
 */
export function buildDirectorMasterBrief(input = {}) {
  const contextLockBrief =
    input.contextLockBrief ||
    formatContextLockBrief(input.contextLock) ||
    "";

  const accumulated = [
    input.priorityBrief || getPriorityDevelopmentBrief(),
    trimBrief(input.topicMapBrief, 900),
    contextLockBrief,
    trimBrief(input.deepLearningBrief, 1400),
    trimBrief(input.humanCorrectionBrief, 600),
    trimBrief(input.performanceLearningBrief, 600),
    trimBrief(input.brandWikiBrief, 800),
    trimBrief(input.userWritingBrief, 500),
    trimBrief(input.brandFeedbackBrief, 600),
    trimBrief(input.accountBrief, 400),
    trimBrief(input.brandPhilosophyBrief, 800),
    trimBrief(input.styleContinuityBrief, 500),
    trimBrief(input.publishPurposeBrief, 400),
    readEvolutionPromptAddon(input),
    buildAiRoleSummaryKo(),
  ].filter(Boolean);

  const sources = collectDirectorFeedbackSources({
    ...input,
    contextLockBrief,
  });

  return [
    `【DIRECTOR CONTEXT ENGINE ${DIRECTOR_CONTEXT_VERSION}】`,
    DIRECTOR_PERSONA,
    "",
    "【제품 요구사항 — 대화·우선순위·교리에서 축적】",
    ...PRODUCT_DIRECTOR_CANON.map((line) => `- ${line}`),
    "",
    `【누적 맥락 반영 ${sources.length}개 출처 — 아래를 동시에 따른다】`,
    `출처: ${sources.map((s) => s.label).join(" · ")}`,
    "",
    ...accumulated,
    "",
    "【최종 질문】",
    "- 이 브랜드가 뭘 하는 회사인지, 이 글만 읽어도 10초 안에 알 수 있는가?",
    "- 사용자가 수정 없이 바로 발행할 수 있는가?",
    "둘 중 하나라도 NO면 출력하지 말고 재작성한다.",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 6200);
}

/**
 * 감사 단계 — 디렉터 관점 최종 판정
 */
export function assessDirectorFinalJudgment(pack, input = {}, priorAudit = {}) {
  const reasons = [];
  if (priorAudit?.publishReady === false) {
    reasons.push(...(priorAudit.reasons || ["prior_audit_fail"]));
  }
  if (priorAudit?.brandClarity && !priorAudit.brandClarity.ok) {
    reasons.push(...priorAudit.brandClarity.reasons);
  }

  const brand = String(input.brandName || input.contextLock?.brand || "").trim();
  const full = [
    pack?.title,
    ...(pack?.sections || []).map((s) => `${s.heading} ${s.body}`),
  ]
    .filter(Boolean)
    .join("\n");

  if (brand && !full.includes(brand)) {
    reasons.push("director_brand_absent");
  }

  const ok = reasons.length === 0;
  return {
    ok,
    publishReady: ok,
    reasons: [...new Set(reasons)],
    question: "30년차 편집장 관점 — 수정 없이 발행·10초 브랜드 이해가 되는가?",
    answer: ok ? "YES" : "NO",
    sources: collectDirectorFeedbackSources(input),
  };
}

export function attachDirectorMeta(pack, input = {}, judgment = {}) {
  if (!pack) return pack;
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      directorContextVersion: DIRECTOR_CONTEXT_VERSION,
      directorJudgment: {
        ok: judgment.ok,
        reasons: judgment.reasons || [],
        sourceCount: judgment.sources?.length || 0,
      },
    },
  };
}
