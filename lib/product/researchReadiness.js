/**
 * 조사·정보 준비 — 고객 메시지·현실적 임계값 (신제품·신생 브랜드 완화)
 * 내부: 정보 단위·조사 소스명은 로그/프롬프트만. UI에는 노출하지 않음.
 */
import { MIN_INFORMATION_UNITS } from "@/lib/content/informationUnitEngine";
import { MIN_COVERAGE_AREAS } from "@/lib/content/knowledgeCoverageEngine";
/** 첫 노출 — 일반 주제 최소 조사 팩트 수 */
export const MIN_RESEARCH_FACTS_FOR_FIRST_WRITE = Math.max(
  8,
  Math.min(16, Math.floor(MIN_INFORMATION_UNITS / 2))
);

const NEW_OR_THIN_TOPIC_RE =
  /신제품|신상|출시|런칭|론칭|신규\s*오픈|신생|첫\s*출시|new\s|launch|debut|프리오더|예약\s*판매/i;

const MODEL_LIKE_TOPIC_RE =
  /[A-Za-z]+[0-9]+|[0-9]+[A-Za-z]+|[가-힣]+[0-9]{2,}/;

/** UI·토스트에 그대로 쓰는 문구 */
export const CUSTOMER_RESEARCH_PROGRESS_MESSAGE =
  "브랜드·주제를 더 알아보는 중이에요. 잠시만 기다려 주세요.";

export const CUSTOMER_RESEARCH_THIN_HINT =
  "아직 공개된 설명이 많지 않은 주제예요. 「포함할 내용」에 매장·제품 특징을 적어 주시면, 그걸 바탕으로 조사한 뒤 글을 이어갈 수 있어요.";

export const CUSTOMER_RESEARCH_MORE_INPUT_MESSAGE =
  "조사가 아직 충분하지 않아요. 브랜드·지역·주제를 조금 더 구체적으로 적어 주시거나, 잠시 후 「조사 후 글 받기」를 다시 눌러 주세요.";

const INTERNAL_LEAK_RES = [
  /정보가\s*\d+\s*개\s*단위/,
  /고유\s*정보\s*단위\s*\d+/,
  /gemini|naver|official|faq|reviews/i,
  /조사\s*축\s*보강/,
  /정보\s*단위·조사/,
  /MIN_|insufficient_information_units/,
  /글을\s*쓰지\s*않습니다/,
];

function isUserInputOnlyFact(row = {}) {
  const src = String(row?.source || "").toLowerCase();
  const text = String(row?.fact || row || "").trim();
  return (
    src === "user_input" ||
    /사용자가 입력|입력한 핵심 주제/.test(text)
  );
}

/** @returns {Array<{ axis?: string, fact: string, source?: string }>} */
export function collectMergedResearchFacts(input = {}, parsed = {}, research = {}) {
  const fromParsed = parsed?.facts || [];
  const fromInput = input.researchFacts || [];
  const fromResearch =
    research?.v2Axis?.researchFacts || research?.researchFacts || [];
  const merged = [...fromParsed, ...fromInput, ...fromResearch].filter(
    (f) => String(f?.fact || f || "").trim().length >= 4
  );
  const seen = new Set();
  return merged.filter((f) => {
    const k = String(f?.fact || f).slice(0, 80).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function collectFactCount(input = {}, parsed = {}, research = {}) {
  return collectMergedResearchFacts(input, parsed, research).length;
}

/**
 * 온라인·조사 API에서 온 단서 1건이라도 있으면 true
 */
export function hasAnyOnlineResearchSignal(input = {}, parsed = {}, research = {}) {
  const facts = collectMergedResearchFacts(input, parsed, research);
  if (facts.some((f) => !isUserInputOnlyFact(f))) return true;

  const summary = String(
    research?.summary || parsed?.brief || input.researchBrief || input.v2AxisBrief || ""
  ).trim();
  if (summary.length >= 16) return true;

  if (research?.geminiWriterBrief || input.geminiWriterBrief) return true;
  if ((research?.sources || []).length > 0) return true;

  const web = input._webLeadsCache || research?.webLeads;
  if (web?.results?.length > 0) return true;

  return false;
}

export function hasCompletedResearchStep(input = {}) {
  return Boolean(
    input.v2ResearchReady ||
      input.v2AxisVerified ||
      input.v2PreWriteVerified ||
      input.v2PipelineStage?.includes("verified")
  );
}

/**
 * 작성 허용 SSOT — 신생 브랜드·온라인 1건·입력만으로도 진행
 * @returns {{ ok: boolean, soft?: boolean, mode?: string, reasons: string[], userMessage: string|null, factCount: number, onlineSignal: boolean }}
 */
export function evaluateResearchWriteGate(input = {}, parsed = {}, research = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic =
    String(input.topic || "").trim() ||
    String(input.mainKeyword || "").trim();

  if (!brand || !region || !topic) {
    return {
      ok: false,
      reasons: ["missing_axes"],
      userMessage: "브랜드 · 지역 · 주제를 모두 입력해 주세요.",
      factCount: 0,
      onlineSignal: false,
    };
  }

  const facts = collectMergedResearchFacts(input, parsed, research);
  const factCount = facts.length;
  const onlineSignal = hasAnyOnlineResearchSignal(input, parsed, research);
  const afterResearch = hasCompletedResearchStep(input);
  const hasInputClues = Boolean(
    input.includePhrases?.trim() ||
      input.brandDescription?.trim() ||
      input.researchQuery?.trim()
  );

  const mode = onlineSignal
    ? "online_clue"
    : afterResearch
      ? "post_research"
      : "input_grounded";

  return {
    ok: true,
    soft: !onlineSignal && factCount < 4,
    mode,
    reasons: [],
    userMessage: null,
    factCount,
    onlineSignal,
    hasInputClues,
  };
}

/**
 * 신제품·신생 브랜드·얕은 웹 맥락
 */
export function detectThinResearchContext(input = {}, state = {}) {
  const topic =
    String(input.topic || "").trim() ||
    String(input.mainKeyword || "").trim();
  const brand = String(input.brandName || "").trim();
  const blob = `${topic} ${brand} ${input.brandDescription || ""} ${input.includePhrases || ""}`;
  const factCount = state.factCount ?? collectFactCount(input, state.parsed, state.research);

  const signals = [];
  if (NEW_OR_THIN_TOPIC_RE.test(blob)) signals.push("new_or_launch");
  if (MODEL_LIKE_TOPIC_RE.test(topic)) signals.push("model_like_topic");
  if (factCount > 0 && factCount < 10) signals.push("thin_facts");
  if (
    !String(
      state.research?.summary || input.researchBrief || input.v2AxisBrief || ""
    ).trim() &&
    factCount < 6
  ) {
    signals.push("sparse_public_info");
  }
  if (input.clueDiscovery?.mode === "input_only" || input.clueDiscovery?.thin) {
    signals.push("input_clues");
  }

  return {
    thin: signals.length > 0,
    signals,
    factCount,
  };
}

/**
 * @returns {{ minUnits: number, minCoverage: number, minSearchQueries: number, mode: 'standard'|'contextual' }}
 */
export function resolveInformationUnitFloor(input = {}, state = {}) {
  const thin = detectThinResearchContext(input, state);
  const online = hasAnyOnlineResearchSignal(
    input,
    state.parsed,
    state.research
  );
  const afterResearch = hasCompletedResearchStep(input);

  if (online || afterResearch || thin.thin) {
    return {
      minUnits: 1,
      minCoverage: 1,
      minSearchQueries: 0,
      mode: online ? "online_clue" : "contextual",
      thin: true,
    };
  }
  return {
    minUnits: MIN_INFORMATION_UNITS,
    minCoverage: MIN_COVERAGE_AREAS,
    minSearchQueries: 5,
    mode: "standard",
    thin: false,
  };
}

export function resolveMinResearchFactsForWrite(input = {}, parsed = {}, research = {}) {
  if (hasAnyOnlineResearchSignal(input, parsed, research)) return 1;
  if (hasCompletedResearchStep(input)) return 1;
  const thin = detectThinResearchContext(input, {
    factCount: collectFactCount(input, parsed, research),
    parsed,
    research,
  });
  if (thin.thin) return 1;
  return MIN_RESEARCH_FACTS_FOR_FIRST_WRITE;
}

/**
 * 조사 보강 진행 중 (로딩·단계 메시지)
 */
export function formatCustomerResearchProgressMessage() {
  return CUSTOMER_RESEARCH_PROGRESS_MESSAGE;
}

/**
 * 작성 전 차단·안내
 */
export function formatCustomerResearchBlockMessage(
  input = {},
  reasons = [],
  state = {}
) {
  const list = [...new Set((reasons || []).map(String))];
  if (
    list.some((r) =>
      /missing_axes|missing_brand|missing_region|missing_topic/.test(r)
    )
  ) {
    return "브랜드 · 지역 · 주제를 모두 입력해 주세요.";
  }

  if (list.includes("research_empty")) {
    return "브랜드 · 지역 · 주제를 입력한 뒤 「조사 후 글 받기」를 눌러 주세요.";
  }

  const thin = detectThinResearchContext(input, state);
  if (thin.thin && !hasAnyOnlineResearchSignal(input, state.parsed, state.research)) {
    return CUSTOMER_RESEARCH_THIN_HINT;
  }

  return CUSTOMER_RESEARCH_PROGRESS_MESSAGE;
}

/**
 * 레거시·내부 문구가 섞인 경우 고객용으로 치환
 */
export function sanitizeCustomerResearchMessage(text = "", input = {}, reasons = []) {
  const raw = String(text || "").trim();
  if (!raw) return formatCustomerResearchBlockMessage(input, reasons);

  if (INTERNAL_LEAK_RES.some((re) => re.test(raw))) {
    if (/추가합니다|보강|조사를/.test(raw) && !/세\s*가지/.test(raw)) {
      return formatCustomerResearchProgressMessage();
    }
    return formatCustomerResearchBlockMessage(input, reasons);
  }

  return raw;
}
