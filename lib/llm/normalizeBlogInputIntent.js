/**
 * Pre-LLM intent normalization — messy form fields → single authoritative brief.
 * Supplementary fields refine *what* to say, not *where* in structure.
 */
import { sanitizeText, parsePhraseList, isJunkValue } from "@/utils/sanitizeInput";
import { resolveContentPersona } from "@/lib/persona/contentPersona";
import { applyV4SpeakerToInput } from "@/lib/persona/v4Speakers";
import { resolvePersonaEngineProfile } from "@/lib/persona/personaEngineProfile";
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "@/lib/constants";

const LAYOUT_COMMAND_RE = [
  /\d+\s*번째\s*(문단|섹션|소제목|단락|부분)/,
  /(도입|본문|결론|마무리|첫\s*문단)\s*(에|으로|부터)\s*.{0,40}(넣|배치|써|작성)/,
  /섹션\s*\d+/i,
  /소제목\s*\d+/i,
  /구조\s*(바꿔|변경|재배치|이동)/,
  /(앞|뒤|중간)\s*에\s*.{0,30}(넣|배치)/,
  /제목\s*다음\s*에/i,
];

const FIELD_WEIGHT = {
  topic: 10,
  includePhrases: 8,
  brandName: 6,
  mainKeyword: 4,
  subKeyword: 3,
  region: 5,
  industry: 4,
};

const OFF_TOPIC_INDUSTRY_MARKERS = [
  { re: /꽃집|플라워|생화|꽃다발/, key: "flower" },
  { re: /카페|커피\s*숍|라떼/, key: "cafe" },
  { re: /부동산|매물|전세|월세/, key: "realestate" },
  { re: /병원|의원|진료/, key: "hospital" },
  { re: /학원|입시|수능/, key: "academy" },
  { re: /헬스|피트니스|운동\s*기구/, key: "gym" },
];

function stripLayoutCommands(text, allowStructureInTopic = false) {
  const raw = String(text || "").trim();
  if (!raw) return { cleaned: "", hadLayout: false };
  let hadLayout = false;
  let cleaned = raw;
  for (const re of LAYOUT_COMMAND_RE) {
    if (re.test(cleaned)) {
      hadLayout = true;
      if (!allowStructureInTopic) {
        cleaned = cleaned.replace(re, " ").trim();
      }
    }
  }
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  return { cleaned: cleaned || raw, hadLayout };
}

function tokenizeAnchor(text) {
  return [
    ...new Set(
      String(text || "")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2 && !isJunkValue(t))
    ),
  ];
}

function detectIndustryKey(text) {
  const blob = String(text || "");
  for (const row of OFF_TOPIC_INDUSTRY_MARKERS) {
    if (row.re.test(blob)) return row.key;
  }
  return null;
}

function pickPrimaryStory(topic, fragments) {
  const t = sanitizeText(topic);
  if (t && t.length >= 6 && !isLayoutOnly(t)) return t;
  const sorted = [...fragments].sort((a, b) => b.weight - a.weight);
  for (const f of sorted) {
    if (f.field === "mainKeyword" && f.text.length < 8) continue;
    if (f.text.length >= 8 && !isLayoutOnly(f.text)) return f.text;
  }
  return t || sorted[0]?.text || "";
}

function isLayoutOnly(text) {
  return LAYOUT_COMMAND_RE.some((re) => re.test(text)) && text.length < 40;
}

function mergeMustInclude(includeList, mainKw, topic, layoutStripped) {
  const out = [...includeList];
  const main = sanitizeText(mainKw);
  if (main && main.length >= 4) {
    const { cleaned, hadLayout } = stripLayoutCommands(main, false);
    if (!hadLayout && cleaned && cleaned !== topic?.slice(0, main.length)) {
      if (!out.some((p) => p.includes(cleaned) || cleaned.includes(p))) {
        out.push(cleaned);
      }
    }
  }
  for (const s of layoutStripped) {
    if (s.field === "includePhrases" && s.cleaned) out.push(s.cleaned);
  }
  return [...new Set(out.filter(Boolean))];
}

function resolveMainKeyword(mainKw, topic, canonicalBrief) {
  const main = sanitizeText(mainKw);
  const { hadLayout } = stripLayoutCommands(main || "", false);
  if (!main || hadLayout || isJunkValue(main)) {
    const first = tokenizeAnchor(topic || canonicalBrief).find((t) => t.length >= 2);
    return first || sanitizeText(topic)?.split(/[,，]/)[0]?.trim() || main;
  }
  if (main === sanitizeText(topic)) {
    const alt = tokenizeAnchor(topic).find((t) => t.length >= 3);
    return alt || main;
  }
  return main;
}

function buildCanonicalBrief({
  brand,
  region,
  industry,
  primaryStory,
  mustInclude,
  personaLabel,
  toneLabel,
  purposeLabel,
}) {
  const lines = [
    "【권위 브리프 — 이 내용만 따를 것】",
    brand ? `브랜드: ${brand}` : null,
    region ? `지역: ${region}` : null,
    industry ? `업종 맥락: ${industry}` : null,
    primaryStory ? `핵심 이야기: ${primaryStory}` : null,
    mustInclude.length ? `반드시 반영할 포인트: ${mustInclude.join(" · ")}` : null,
    personaLabel ? `관점/화자: ${personaLabel}` : null,
    toneLabel ? `분위기: ${toneLabel}` : null,
    purposeLabel ? `글 목적: ${purposeLabel}` : null,
    "보조 입력란은 '무엇을 쓸지'만 조정한다. 섹션·문단·순서 배치 지시는 무시한다(사용자가 주제란에 구조 변경을 명시한 경우만 예외).",
    "서로 다른 칸에 섞인 잡문·모순 문장은 무시하고 위 브리프에 맞는 글만 쓴다.",
  ].filter(Boolean);
  return lines.join("\n");
}

function buildIntentContract({
  brand,
  region,
  industry,
  primaryStory,
  mustInclude,
  tone,
  purpose,
  objective,
  blogLengthTier,
}) {
  const objectiveRaw = String(objective || purpose || "").toLowerCase();
  const toneRaw = String(tone || "").toLowerCase();
  const industryRaw = String(industry || "").toLowerCase();
  const businessFirst =
    /saas|ai|platform|플랫폼|academy|교육|마케팅|병원|가구/.test(industryRaw) ||
    /brand|브랜드|info|정보/.test(objectiveRaw) ||
    /informative|trust|premium/.test(toneRaw);
  const requiredFlowKeywords = businessFirst
    ? ["문제", "원인", "기준", "실행", "검수"]
    : ["핵심", "이유", "활용"];

  return {
    version: "intent_contract_v1",
    brand,
    region,
    industry,
    primaryStory,
    mustInclude: [...new Set((mustInclude || []).filter(Boolean))],
    tone: tone || "",
    purpose: purpose || "",
    objective: objective || "",
    blogLengthTier: blogLengthTier || DEFAULT_BLOG_LENGTH_TIER,
    businessFirst,
    requiredFlowKeywords,
    bannedGenericPhrases: businessFirst
      ? ["사용자 친화적인 인터페이스", "초보자도 쉽게", "전국 어디서나"]
      : [],
  };
}

function buildLengthContract(blogLengthTier = DEFAULT_BLOG_LENGTH_TIER) {
  const tierKey = blogLengthTier || DEFAULT_BLOG_LENGTH_TIER;
  const tier = resolveBlogLengthTier(tierKey);
  return {
    version: "length_contract_v1",
    metric: "chars_with_spaces",
    tier: tierKey,
    min: tier.min,
    target: tier.target,
    max: tier.max,
  };
}

/**
 * @param {Object} input raw form payload
 * @returns {{ input: Object, canonicalBrief: string, topicAnchor: string[], inputGrounding: Object }}
 */
export function normalizeBlogInputIntent(input = {}) {
  const lengthContract = buildLengthContract(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const topicRaw = sanitizeText(input.topic) || "";
  const brand = sanitizeText(input.brandName) || "";
  const region = sanitizeText(input.region) || "";
  const industry = sanitizeText(input.industry) || "";
  const includeList = parsePhraseList(input.includePhrases);
  const subList = parsePhraseList(input.subKeyword);

  const layoutStripped = [];
  const fragments = [];

  const fields = [
    ["topic", topicRaw, true],
    ["includePhrases", includeList.join(", "), false],
    ["mainKeyword", sanitizeText(input.mainKeyword) || "", false],
    ["brandName", brand, false],
  ];

  for (const [field, raw, allowStruct] of fields) {
    if (!raw) continue;
    const { cleaned, hadLayout } = stripLayoutCommands(raw, allowStruct);
    if (hadLayout) {
      layoutStripped.push({ field, removed: "layout_command" });
    }
    if (cleaned && cleaned.length >= 2) {
      fragments.push({
        field,
        text: cleaned,
        weight: FIELD_WEIGHT[field] || 2,
      });
    }
  }

  const topicClean = stripLayoutCommands(topicRaw, true).cleaned || topicRaw;
  const primaryStory = pickPrimaryStory(topicClean, fragments);
  const mustInclude = mergeMustInclude(includeList, input.mainKeyword, primaryStory, []);

  const speakerMapped = applyV4SpeakerToInput(input);
  const personaResolved = resolveContentPersona({
    contentPersona: speakerMapped.contentPersona,
    contentPersonaSubtype: speakerMapped.contentPersonaSubtype,
    topic: primaryStory,
    purpose: input.purpose,
    includePhrases: mustInclude.join(", "),
    mainKeyword: input.mainKeyword,
    region,
    brandName: brand,
    contentObjective: input.contentObjective,
  });

  const canonicalBrief = buildCanonicalBrief({
    brand,
    region,
    industry,
    primaryStory,
    mustInclude,
    personaLabel: personaResolved.label,
    toneLabel: input.tone,
    purposeLabel: input.purpose,
  });
  const intentContract = buildIntentContract({
    brand,
    region,
    industry,
    primaryStory,
    mustInclude,
    tone: input.tone,
    purpose: input.purpose,
    objective: input.contentObjective,
    blogLengthTier: input.blogLengthTier,
  });

  const topicAnchor = tokenizeAnchor(
    [primaryStory, brand, region, industry, ...mustInclude, input.mainKeyword]
      .filter(Boolean)
      .join(" ")
  );

  const personaEngineProfile = resolvePersonaEngineProfile({
    ...speakerMapped,
    contentPersona: personaResolved.persona,
    contentPersonaSubtype: personaResolved.subtype,
    topic: primaryStory || topicRaw,
  });

  const correctedInput = {
    ...speakerMapped,
    contentPersona: personaResolved.persona,
    contentPersonaSubtype: personaResolved.subtype,
    personaEngineProfile,
    topic: primaryStory || topicRaw,
    mainKeyword: resolveMainKeyword(input.mainKeyword, primaryStory, canonicalBrief),
    includePhrases: mustInclude.join(", "),
    subKeyword: subList.join(", "),
    _canonicalBrief: canonicalBrief,
    _topicAnchor: topicAnchor,
    _inputGrounding: {
      canonicalBrief,
      topicAnchor,
      primaryStory,
      mustInclude,
      layoutStripped,
      industryHint: detectIndustryKey(
        [primaryStory, industry, brand, ...mustInclude].join(" ")
      ),
      lengthContract,
    },
    _intentContract: intentContract,
    _lengthContract: lengthContract,
  };

  return {
    input: correctedInput,
    canonicalBrief,
    topicAnchor,
    inputGrounding: correctedInput._inputGrounding,
  };
}

export { stripLayoutCommands, tokenizeAnchor, detectIndustryKey };
