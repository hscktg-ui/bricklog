/**
 * 고객-facing 출력·실패 메시지 — 내부 검수 용어 노출 금지
 */
import { isLengthOnlyGateSoft } from "@/lib/product/briclogMission";
import { sanitizeCustomerResearchMessage } from "@/lib/product/researchReadiness";
const REASON_HINTS = {
  length_tier_under: "정보량이 참고 분량보다 짧아요",
  length_tier_over: "참고 분량보다 길어요",  internal_prompt_leak: "내부 안내 문구가 섞였어요",
  magazine_arc_weak: "칼럼 흐름(기승전결)이 약해요",
  tone_bookend_mismatch: "시작과 끝 말투가 달라요",
  duplicate_content: "같은 문장이 반복됐어요",
  sentence_similarity_80: "비슷한 문장이 반복됐어요",
  same_info_repeat: "같은 정보가 반복됐어요",
  industry_mismatch: "업종과 맞지 않는 내용이 있어요",
  mechanical_title: "제목이 키워드 나열형이에요",
  title_missing: "제목이 없어요",
  research_depth: "주제 조사가 더 필요해요",
  channel_fit: "채널에 맞지 않는 문체예요",
  emoji_policy: "이모지 사용이 기준과 달라요",
  human_review: "실무자 톤·정보 밀도가 부족해요",
  human_belief_low: "광고·브로슈어처럼 읽혀요 — 사람이 쓴 느낌을 더 다듬어야 해요",
  grounded_specificity_low: "조사·확인된 정보가 본문에 더 박혀야 해요",
  outline_only_output: "구성안만 있고 본문이 없어요",
  topic_dominance_low: "주제만 반복하고 정보가 부족해요",
  information_yield_low: "새로운 정보가 부족해요",
  no_new_verified_facts: "확인된 사실이 본문에 충분히 반영되지 않았어요",
  search_snippet_leak: "검색 문장이 그대로 들어가 있어요",
  insufficient_verified_brand_facts: "브랜드 관련 확인된 정보가 부족해요",
  insufficient_brand_knowledge: "브랜드 이해가 아직 부족해요",
  industry_contamination: "업종과 맞지 않는 표현이 섞였어요",
  ai_pattern_detected: "AI 문체·클리셰가 반복됐어요",
  insufficient_confident_facts: "확실한 정보만 쓸 수 있는데 출처가 부족해요",
  topic_lock_contamination: "주제와 무관한 표현이 섞였어요",
  topic_lock_foreign_entity: "다른 주제·업종 표현이 들어갔어요",
  title_answer_insufficient: "제목에 대한 설명이 부족해요",
  title_answer_missing_required: "제목에서 약속한 내용이 빠졌어요",
  no_new_information: "분량·조사 깊이가 부족해요",
  verbatim_topic_repeat: "주제 문장이 반복됐어요",
  post_write_quality_failed: "품질 기준에 아직 못 미쳐요",
  beta_test_guard_failed: "검수 후 전달 기준에 못 미쳐요",
  empty_pack: "본문이 비어 있어요",
  v2axis_below_95: "브랜드·지역·주제 반영을 더 다듬어야 해요",
  v2axis_brand_mentions: "브랜드 이름이 본문에 더 필요해요",
  v2axis_region_mentions: "지역 맥락이 본문에 더 필요해요",
  v2axis_product_mentions: "주제(제품) 설명이 본문에 더 필요해요",
  v2axis_seo_weak: "제목·도입에 브랜드·지역이 더 필요해요",
  v2axis_banned_template: "예전 템플릿 문구가 섞였어요",
  v2axis_low_research_grounding: "조사 내용이 본문에 더 반영돼야 해요",
  meta_layer_leak: "내부 안내 문구가 섞였어요",
  not_publishable: "구성안만 있고 본문이 부족해요",
  editor_tone_weak: "전문 에디터 톤을 더 다듬어야 해요",
};

const INTERNAL_POST_VERIFY_RE =
  /작성\s*후\s*검수|검수\s*기준에\s*맞지|베타\s*검수|화면에\s*올리지\s*않았습니다/i;

export const CUSTOMER_PIPELINE_STEP_LABELS = {
  research: "브랜드·주제 조사 중…",
  researchVerify: "조사 결과 검증 중…",
  write: "편집본 작성 중…",
  channelDerive: "플레이스·인스타 맞추는 중…",
  review: "검수 후 다듬는 중…",
  retryReview: "검수 기준 맞춰 다시 다듬는 중…",
};

/** 내부 파이프라인 단계 → 고객용 3~4단계 (엔진 용어 노출 금지) */
const INTERNAL_STEP_TO_CUSTOMER = [
  [/브랜드\s*분석|검색\s*의도|계절|맥락\s*확인|브랜드[·・]지역[·・]주제/i, CUSTOMER_PIPELINE_STEP_LABELS.research],
  [/단서|정보\s*영역|정보\s*단위|전략|brief|제품\s*조사|knowledge|coverage|조사\s*확장/i, CUSTOMER_PIPELINE_STEP_LABELS.research],
  [/조사\s*결과\s*검증|research_verify|검증\s*기준/i, CUSTOMER_PIPELINE_STEP_LABELS.researchVerify],
  [/플레이스|인스타|채널\s*맞|파생|derive/i, CUSTOMER_PIPELINE_STEP_LABELS.channelDerive],
  [/작성|쓰는\s*중|콘텐츠\s*작성|편집본|프롬프트\s*작성/i, CUSTOMER_PIPELINE_STEP_LABELS.write],
  [/검수|다듬|품질|민감|화면에\s*준비/i, CUSTOMER_PIPELINE_STEP_LABELS.review],
  [/다시|재시도|이어서/i, CUSTOMER_PIPELINE_STEP_LABELS.retryReview],
];

/**
 * @param {string|null|undefined} rawLabel
 * @returns {string|null}
 */
export function mapCustomerPipelineStepLabel(rawLabel) {
  if (rawLabel == null) return null;
  const t = String(rawLabel).trim();
  if (!t) return null;
  if (/^(브랜드[·・]주제 조사|편집본 작성|플레이스[·・]인스타|검수 후)/.test(t)) {
    return t.endsWith("…") || t.endsWith("...") ? t : `${t}…`;
  }
  for (const [re, mapped] of INTERNAL_STEP_TO_CUSTOMER) {
    if (re.test(t)) return mapped;
  }
  return CUSTOMER_PIPELINE_STEP_LABELS.review;
}

export const CUSTOMER_WITHHELD_TITLE = "아직 올리지 않았어요";

export const CUSTOMER_EDITORIAL_PREVIEW_TITLE = "편집본을 다듬는 중이에요";

/** 빈 패널 힌트 제목 — withhold vs 로딩 구분 */
export function resolveBlogHintPanelTitle(hint = "", soft = false) {
  const h = String(hint || "").trim();
  if (/아직 올리지 않|편집본을 한번 더|품질 기준/.test(h)) {
    return CUSTOMER_EDITORIAL_PREVIEW_TITLE;
  }
  if (soft) {
    if (/알아보는\s*중|조사|보강|이어갈/.test(h)) {
      return "브랜드·주제 조사 중";
    }
    return "조금만 더 다듬는 중이에요";
  }
  return "입력을 확인해 주세요";
}

/**
 * @param {{ ok?: boolean, reasons?: string[], failReasons?: string[], userMessage?: string, betaTestGuard?: object, stage?: string }} gate
 */
export function formatPostVerifyUserMessage(gate = {}) {
  if (gate.ok) return null;
  if (gate.userMessage && !INTERNAL_POST_VERIFY_RE.test(gate.userMessage)) {
    return sanitizeCustomerResearchMessage(
      gate.userMessage,
      gate.input,
      gate.reasons
    );
  }

  const reasons = [
    ...(gate.failReasons || []),
    ...(gate.reasons || []),
  ].filter(Boolean);

  const allReasons = [...new Set(reasons)];
  const lengthIssue = allReasons.some(
    (r) => r === "length_tier_under" || r === "length_tier_over"
  );

  const unique = allReasons.filter((r) => {
    if (!isLengthOnlyGateSoft()) return true;
    return r !== "length_tier_under" && r !== "length_tier_over";
  });
  const hints = unique
    .map((r) => REASON_HINTS[r] || null)
    .filter(Boolean)
    .slice(0, 2);

  if (lengthIssue) {
    const hint = hints[0] || "글 분량을 맞춰야 해요";
    return `${CUSTOMER_WITHHELD_TITLE}. ${hint}. 「다시 받기」를 누르면 분량을 맞춰 다시 다듬어요.`;
  }

  if (hints.length) {
    return `${CUSTOMER_WITHHELD_TITLE}. ${hints.join(" · ")}. 입력을 조금 구체적으로 한 뒤 「다시 받기」를 눌러 주세요.`;
  }

  return `${CUSTOMER_WITHHELD_TITLE}. 품질 기준을 맞춘 뒤 다시 시도해 주세요.`;
}

/** 검수 실패 — 내부 문구 대신 고객용 안내 */
export function resolveDeliveryFailureMessage(gate = {}) {
  if (gate.ok) return null;
  return formatPostVerifyUserMessage(gate);
}

export const CUSTOMER_COMPLETE = {
  blog: "편집본이 준비됐어요",
  place: "플레이스용 편집본이 준비됐어요",
  instagram: "인스타용 편집본이 준비됐어요",
  pipeline: "블로그·플레이스·인스타 편집본이 준비됐어요",
};

const FALLBACK_DELIVERY_HINT =
  "아래는 자동 보강 편집본이에요. 마음에 들지 않으면 「다시 받기」를 눌러 주세요.";

const SOFT_PASS_HINT =
  "검수 기준에 거의 맞췄어요. 더 다듬고 싶으면 「다시 받기」를 눌러 주세요.";

/**
 * fallback·soft-pass 배달 시 고객용 안내 (내부 용어 없음)
 * @param {object} meta
 * @param {object} [pack]
 */
export function buildDeliveryQualityHint(meta = {}, pack = null) {
  const m = { ...(pack?._meta || {}), ...meta };
  if (m.draftFallback || m.missionProseFallback) {
    return FALLBACK_DELIVERY_HINT;
  }
  if (m.softPass || m.generationMode === "llm_soft_pass") {
    return SOFT_PASS_HINT;
  }
  return null;
}
