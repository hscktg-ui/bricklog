/**
 * BRICLOG PERSPECTIVE ENGINE — 콘텐츠 관점 (동일 조사 데이터 · 다른 해석)
 * 업종·브랜드·지역 하드코딩 없음 — 입력값 기반 동적 생성
 */
import { getChannelFullText } from "@/lib/content/channelPack";
import { resolveBlogLengthTier } from "@/lib/constants";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import {
  buildHumanClickTitles,
  isMechanicalListingTitle,
  rewriteMechanicalTitle,
  titleContext,
  titleIncludesAllEntities,
} from "@/lib/content/humanTitleEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { CONTENT_PERSPECTIVE_V20 } from "@/lib/product/briclogUltimateV20";

export const CONTENT_PERSPECTIVE_OPTIONS = [
  {
    value: "auto",
    label: "자동 추천",
    hint: "목적·주제에 맞게 관점 선택",
  },
  ...CONTENT_PERSPECTIVE_V20,
  {
    value: "comparison",
    label: "비교 관점",
    hint: "대안·차이·선택 기준 중심",
  },
  {
    value: "review",
    label: "후기 관점",
    hint: "방문·체험·느낀 점 중심 (과장·허구 금지)",
  },
  {
    value: "storytelling",
    label: "스토리텔링 관점",
    hint: "기·승·전·결 서사 중심",
  },
];

const PERSPECTIVE_DEFS = {
  brand: {
    focus: ["브랜드 철학", "차별점", "방향성", "브랜드 가치", "왜 이 브랜드인가"],
    voice: "브랜드가 직접 말하되 과장·홍보 CTA 없이",
    tone: "신뢰·일관성·브랜드 기억",
    structure: [
      "브랜드가 전하고 싶은 이야기 — 왜 이 주제인가",
      "브랜드가 보는 차별점·철학",
      "고객에게 전하는 가치·약속 (단정 금지)",
      "브랜드 기준 선택·이용 안내",
      "브랜드 관점 정리 — 기억에 남는 한 줄",
    ],
    conclusionStyle: "브랜드 가치와 방향을 한 문장으로 — CTA·「방문하세요」 금지",
    introLead: (c) =>
      `${c.brand} ${c.topic}를 브랜드 시선에서 정리했습니다. ${c.region ? `${c.region} ` : ""}맥락에서 읽으면 흐름이 분명해집니다.`,
  },
  customer: {
    focus: ["사용 경험", "고민", "선택 과정", "체험", "해결 과정"],
    voice: "독자(고객) 시선 1·2인칭 — 「저는」「선택할 때」",
    tone: "공감·실용·솔직",
    structure: [
      "이 주제를 찾게 된 상황·고민",
      "비교·고민하며 본 포인트",
      "체험·이용 과정에서 확인한 것",
      "선택·결정에 도움이 된 기준",
      "비슷한 고민을 하는 분께 — CTA 없이",
    ],
    conclusionStyle: "독자 입장에서 정리한 한 줄 — 과장·광고 톤 금지",
    introLead: (c) =>
      `${c.region ? `${c.region}에서 ` : ""}${c.topic}를 알아보며 겪는 선택 과정을 중심으로 썼습니다. ${c.brand} 기준으로 정리했습니다.`,
  },
  informational: {
    focus: ["객관적 정보", "기능", "가격", "절차", "FAQ"],
    voice: "중립·안내형 — 확인 가능한 정보만",
    tone: "명료·구조적·FAQ 친화",
    structure: [
      "주제 개요 — 무엇을 다루는 글인가",
      "기능·구성·조건 (확인된 범위)",
      "가격·혜택·절차 안내",
      "자주 묻는 질문",
      "정리 — 핵심 확인 목록",
    ],
    conclusionStyle: "확인할 조건·절차를 한 문장으로 — CTA·홍보 문구 금지",
    introLead: (c) =>
      `${c.region ? `${c.region} ` : ""}${c.brand} ${c.topic} 관련 기능·조건·절차를 중립적으로 정리했습니다.`,
  },
  editor: {
    focus: [
      "전문 칼럼",
      "브랜드 매거진",
      "전문가 분석",
      "선택 기준",
      "주의사항",
    ],
    voice: "전문 에디터·브랜드 매거진 칼럼니스트",
    tone: "분석·기준 제시·기승전결 서사",
    structure: [
      "기 — 왜 이 이야기가 필요한가",
      "승 — 정보·사례·비교",
      "전 — 선택·판단 기준",
      "결 — 브랜드 메시지",
      "전문 에디터 관점 한 줄 정리",
    ],
    conclusionStyle: "브랜드 메시지·선택 기준 — 광고·과장·허구 금지",
    introLead: (c) =>
      `${c.topic}를 ${c.region ? `${c.region}·` : ""}${c.brand} 맥락에서 전문 에디터 칼럼으로 풀었습니다.`,
  },
  expert: {
    focus: ["전문 칼럼", "브랜드 매거진", "전문가 분석"],
    voice: "전문 에디터·브랜드 매거진 칼럼니스트",
    tone: "분석·기준 제시·기승전결 서사",
    structure: [
      "기 — 왜 이 이야기가 필요한가",
      "승 — 정보·사례·비교",
      "전 — 선택·판단 기준",
      "결 — 브랜드 메시지",
    ],
    conclusionStyle: "브랜드 메시지 — 광고·과장 금지",
    introLead: (c) =>
      `${c.topic}를 ${c.region ? `${c.region}·` : ""}${c.brand} 맥락에서 전문 에디터 칼럼으로 풀었습니다.`,
  },
  comparison: {
    focus: ["대안", "차이점", "선택 기준", "비교 항목"],
    voice: "비교·대조 — 특정 브랜드 비방 금지",
    tone: "균형·표·기준 중심",
    structure: [
      "왜 비교가 필요한가 — 선택 상황",
      "비교 항목·기준 정리",
      "옵션·대안별 차이 (확인 가능 범위)",
      "상황별 추천 기준 (단정 금지)",
      "비교 후 결정에 쓸 질문 목록",
    ],
    conclusionStyle: "비교 기준 요약 — 「최고」「1등」 금지",
    introLead: (c) =>
      `${c.region ? `${c.region}에서 ` : ""}${c.topic}를 비교할 때 무엇을 기준으로 볼지부터 정리했습니다. ${c.brand}도 같은 기준으로 봤습니다.`,
  },
  review: {
    focus: ["실제 경험", "방문 과정", "체험 과정", "느낀 점"],
    voice: "방문·체험 후기 — 허구·날조·「두 배 증가」 금지",
    tone: "솔직·구체·과장 없음",
    structure: [
      "방문·이용 계기",
      "도착·예약·접수 과정",
      "체험·이용 중 확인한 점",
      "좋았던 점·아쉬운 점 (균형)",
      "비슷한 분께 전하는 한 줄",
    ],
    conclusionStyle: "체험 요약 한 줄 — CTA·「꼭 가세요」 금지",
    introLead: (c) =>
      `${c.region ? `${c.region} ` : ""}${c.brand} ${c.topic}를 직접 확인한 뒤 남은 인상을 정리했습니다.`,
  },
  storytelling: {
    focus: ["기(起)", "승(承)", "전(轉)", "결(結)", "장면·맥락"],
    voice: "칼럼·에세이 — 정보는 재해석, 나열 금지",
    tone: "서사·맥락·여운",
    structure: [
      "기 — 독자가 검색하게 된 장면·질문",
      "승 — 주제 맥락·정보·비교",
      "전 — 선택 기준·전환점",
      "결 — 브랜드·주제와 자연스럽게 연결",
    ],
    conclusionStyle: "기억에 남는 한 줄 — CTA·홍보 금지",
    introLead: (c) =>
      `${c.region ? `${c.region}에서 ` : ""}${c.topic}를 찾게 된 계기부터 이야기를 시작합니다. ${c.brand}와의 연결은 뒤에서 자연스럽게 이어집니다.`,
  },
};

function perspectiveContext(ctx = {}, input = {}) {
  return titleContext(ctx, input);
}

function hashPick(seed, arr) {
  if (!arr?.length) return arr?.[0];
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return arr[Math.abs(h) % arr.length];
}

/** 목적·주제·입력 기반 자동 관점 */
export function recommendContentPerspective(input = {}) {
  const purpose = String(input.purposeType || input.purpose || "").toLowerCase();
  const objective = String(input.contentObjective || "").toLowerCase();
  const tone = String(input.tone || "").toLowerCase();
  const text = [
    input.topic,
    input.includePhrases,
    input.mainKeyword,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/비교|vs|대안|차이/.test(text) || String(input.competitors || "").trim()) {
    return "comparison";
  }
  if (/후기|체험|방문|다녀|느낀|솔직/.test(text) || purpose === "review" || objective === "review") {
    return "review";
  }
  if (purpose === "brand" || objective === "branding") return "brand";
  if (purpose === "info" || tone === "informative") return "informational";
  if (/전문|분석|기준|주의|업계|칼럼|매거진|에디터/.test(text)) return "editor";
  if (purpose === "season" || tone === "emotional") return "storytelling";
  if (/고민|선택|경험|이용/.test(text)) return "customer";
  return "brand";
}

function normalizePerspectiveKey(key) {
  if (key === "expert") return "editor";
  return key;
}

export function resolveContentPerspective(input = {}) {
  const raw = input.contentPerspective || "auto";
  const requested = normalizePerspectiveKey(raw);
  const def = CONTENT_PERSPECTIVE_OPTIONS.find(
    (o) => o.value === requested || o.value === raw
  );
  if (requested === "auto" || !def || !PERSPECTIVE_DEFS[requested]) {
    const picked = recommendContentPerspective(input);
    const pickedDef = CONTENT_PERSPECTIVE_OPTIONS.find((o) => o.value === picked);
    return {
      perspective: picked,
      label: pickedDef?.label || picked,
      hint: pickedDef?.hint || "",
      source: "auto",
    };
  }
  return {
    perspective: requested,
    label: def.label,
    hint: def.hint || "",
    source: "user",
  };
}

export function getPerspectiveDef(perspectiveKey) {
  const key = normalizePerspectiveKey(perspectiveKey);
  return PERSPECTIVE_DEFS[key] || PERSPECTIVE_DEFS.brand;
}

export function buildPerspectiveTitleCandidates(ctx = {}, input = {}, perspectiveKey) {
  return buildHumanClickTitles(ctx, input, perspectiveKey);
}

export function buildPerspectivePromptBlock(ctx = {}, input = {}) {
  const resolved = resolveContentPerspective({ ...input, ...ctx });
  const def = getPerspectiveDef(resolved.perspective);
  const pctx = perspectiveContext(ctx, input);
  const titleExamples = buildPerspectiveTitleCandidates(ctx, input, resolved.perspective).slice(0, 3);

  return [
    "【BRICLOG · 콘텐츠 관점 V20 (Perspective Engine)】",
    `선택 관점: ${resolved.label}${resolved.source === "auto" ? " (자동 추천)" : ""}`,
    `중심: ${def.focus.join(" · ")}`,
    `화자·시선: ${def.voice}`,
    `톤: ${def.tone}`,
    "",
    "【관점별 제목·도입·결말 — 모두 이 관점에 맞출 것】",
    "- 제목: 지역→상황→브랜드→주제. 키워드 나열(평택 템퍼 모션베드) 금지.",
    titleExamples.length ? `- 제목 예: ${titleExamples.join(" / ")}` : "",
    "- 도입(첫 섹션): 관점 화자·상황으로 시작 — 내부 검수 문장 출력 금지",
    `- 결말: ${def.conclusionStyle}`,
    "",
    "【관점별 본문 구조】",
    ...def.structure.map((line, i) => `${i + 1}. ${line}`),
    "",
    "【공통 규칙】",
    "- 동일 조사·실마리 데이터 사용 — 복사 금지, 관점에 맞게 재해석",
    "- 업종·브랜드·지역 특정 표현 하드코딩 금지 — 입력값만 사용",
    `- 브랜드「${pctx.brand}」·지역「${pctx.region || "-"}」·주제「${pctx.topic}」`,
    "- 관점이 바뀌면 제목·도입·구조·톤·결말이 모두 달라져야 함",
    "- 금지 출력: 「이 글은 ~에 답하려고」「확인된 정보만」「방문 전 확인하면」「홍보 문구 금지」 등 내부 검수 문장",
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatPerspectiveStructureForPlanner(ctx = {}, input = {}) {
  const resolved = resolveContentPerspective({ ...input, ...ctx });
  const def = getPerspectiveDef(resolved.perspective);
  return def.structure
    .map((line, i) => `${i + 1}. [${resolved.label}] ${line}`)
    .join("\n");
}

function softenCtaConclusion(text, style, ctx, input) {
  let out = String(text || "").trim();
  if (/방문해\s*보세요|지금\s*바로|확인해\s*보세요|예약해\s*주세요/.test(out)) {
    out = out
      .replace(/방문해\s*보세요|지금\s*바로|확인해\s*보세요|예약해\s*주세요/gi, "")
      .trim();
  }
  if (!out || out.replace(/\s/g, "").length < 24) {
    const c = perspectiveContext(ctx, input);
    return `${c.region ? `${c.region}에서 ` : ""}${c.brand} ${c.topic} — ${style}`.slice(0, 200);
  }
  return out.slice(0, 280);
}

function applyPerspectiveIntro(pack, def, ctx, input) {
  if (!pack?.sections?.length || typeof def.introLead !== "function") return pack;
  const tier = resolveBlogLengthTier(input.blogLengthTier || ctx.blogLengthTier || "medium");
  const pctx = perspectiveContext(ctx, input);
  const lead = def.introLead(pctx).trim();
  const sections = [...pack.sections];
  const first = sections[0];
  const body = String(first?.body || "").trim();
  const needsLead =
    body.length < 80 ||
    (def === PERSPECTIVE_DEFS.comparison && !/비교|차이|기준|대안/.test(body));
  if (isBriclogMissionEnforced() && !needsLead) return pack;
  const current = countBlogBodyCharsWithSpaces(pack);
  if (current >= tier.max - 24 || current + lead.length + 8 > tier.max) {
    return pack;
  }
  if (!body || body.slice(0, 40) === lead.slice(0, 40) || body.includes(lead.slice(0, 24))) {
    return pack;
  }
  sections[0] = {
    ...first,
    body: `${lead}\n\n${body}`.trim(),
  };
  return { ...pack, sections };
}

function buildPerspectiveConclusion(def, ctx, input) {
  const c = perspectiveContext(ctx, input);
  const style = String(def.conclusionStyle || "").trim();
  if (/비교/.test(style) || def === PERSPECTIVE_DEFS.comparison) {
    return `${c.region ? `${c.region}에서 ` : ""}${c.brand} ${c.topic}를 고를 때, 비교 항목을 먼저 정리한 뒤 본인 상황에 맞는지 확인하는 편이 낫습니다.`.slice(
      0,
      220
    );
  }
  if (def === PERSPECTIVE_DEFS.review) {
    return `${c.brand} ${c.topic} 체험은 ${c.region ? `${c.region} ` : ""}맥락과 본인 기준에 맞는지 직접 확인하는 것이 중요합니다.`.slice(
      0,
      220
    );
  }
  if (def === PERSPECTIVE_DEFS.customer) {
    return `${c.topic} 선택은 ${c.brand} 기준으로 정리했지만, 최종 판단은 본인 체험과 조건으로 하는 편이 낫습니다.`.slice(
      0,
      220
    );
  }
  return `${c.region ? `${c.region}에서 ` : ""}${c.brand} ${c.topic} — ${style}`.slice(0, 220);
}

/** LLM 출력 후 — 제목·도입·결말 관점 정렬 */
export function applyPerspectiveEngine(pack, ctx = {}, input = {}) {
  if (!pack) return pack;

  const resolved = resolveContentPerspective({ ...input, ...ctx });
  const def = getPerspectiveDef(resolved.perspective);
  const pctx = perspectiveContext(ctx, input);
  const candidates = buildPerspectiveTitleCandidates(ctx, input, resolved.perspective);
  const seed = `${pctx.brand}|${pctx.topic}|${resolved.perspective}|${resolved.source}`;

  const llmTitle = rewriteMechanicalTitle(
    pack.representativeTitle || pack.title || "",
    ctx,
    input,
    resolved.perspective
  );
  const perspectiveTitle = hashPick(seed, candidates);

  let rep = llmTitle;
  if (
    resolved.source === "user" ||
    isMechanicalListingTitle(llmTitle, ctx, input) ||
    !titleIncludesAllEntities(llmTitle, ctx, input) ||
    !candidates.includes(llmTitle)
  ) {
    rep = perspectiveTitle || llmTitle;
  }

  const titles = [
    rep,
    ...candidates.filter((t) => t !== rep),
    ...(pack.titles || []).map((t) =>
      rewriteMechanicalTitle(t, ctx, input, resolved.perspective)
    ),
  ]
    .filter(Boolean)
    .slice(0, 5);

  let conclusion = softenCtaConclusion(pack.conclusion, def.conclusionStyle, ctx, input);
  if (
    !conclusion ||
    conclusion.replace(/\s/g, "").length < 28 ||
    /방문해|확인해\s*보세요|홍보\s*문구/.test(conclusion)
  ) {
    conclusion = buildPerspectiveConclusion(def, ctx, input);
  }

  let next = {
    ...pack,
    representativeTitle: rep,
    title: rep,
    titles,
    conclusion,
    _meta: {
      ...(pack._meta || {}),
      perspectiveEngine: true,
      contentPerspective: resolved.perspective,
      contentPerspectiveLabel: resolved.label,
      contentPerspectiveSource: resolved.source,
    },
  };

  next = applyPerspectiveIntro(next, def, ctx, input);
  return next;
}

export function detectPerspectiveIssues(pack, ctx = {}, input = {}) {
  const issues = [];
  const resolved = resolveContentPerspective({ ...input, ...ctx });
  const full = getChannelFullText(pack, "blog");
  const title = pack?.representativeTitle || pack?.title || "";

  if (isMechanicalListingTitle(title, ctx, input)) {
    issues.push({ type: "mechanical_title" });
  }
  if (!titleIncludesAllEntities(title, ctx, input)) {
    issues.push({ type: "title_missing_entities" });
  }

  if (resolved.perspective === "review" && /서울에\s*거주하는|방문자가\s*두\s*배|수면의\s*질이\s*개선/.test(full)) {
    issues.push({ type: "fiction_review" });
  }
  if (resolved.perspective === "informational" && /브랜드\s*철학|우리는\s*믿습니다|브랜드\s*가치/.test(full)) {
    issues.push({ type: "brand_voice_in_info" });
  }
  if (resolved.perspective === "brand" && /^저는\s|제\s*경험/.test(full)) {
    issues.push({ type: "customer_voice_in_brand" });
  }
  if (resolved.perspective === "comparison" && !/비교|차이|기준|대안|옵션/.test(full)) {
    issues.push({ type: "missing_comparison_frame" });
  }
  if (resolved.perspective === "storytelling" && (pack.sections || []).length < 3) {
    issues.push({ type: "thin_story_structure" });
  }

  return { ok: issues.length === 0, issues, resolved };
}
