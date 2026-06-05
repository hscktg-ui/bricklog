/**
 * API Key 없을 때 — 구조화·구성안만 (템플릿 본문 생성 금지)
 */
import { prepareUltimateBlogContext } from "@/lib/ultimate/runUltimateEngine";
import { buildContextFirstTitles } from "@/lib/prompts/engine/intentTitles";
import { deriveTitleQuestion } from "@/lib/pipeline/v2/titleUnderstanding";
import { LLM_USER_MESSAGES } from "./messages";
import { enrichMinimalBlogInput } from "./blogDeliveryFallback";

import { OUTLINE_PLAN_HEADING_PHRASES } from "@/lib/content/outlinePackGuard";
import { buildNaturalBrandTitles } from "@/lib/content/brandContentEngine";

/** @internal PLAN 단계 전용 — 사용자 노출 금지 */
const SCENE_OUTLINE = OUTLINE_PLAN_HEADING_PHRASES.slice(0, 5);

export function buildContentBriefPack(input = {}, prep = null) {
  const enriched = enrichMinimalBlogInput(input);
  const prepared = prep || prepareUltimateBlogContext(enriched);
  if (!prepared.ok) {
    const brand = enriched.brandName?.trim();
    const region = enriched.region?.trim();
    const topic =
      enriched.topic?.trim() || enriched.mainKeyword?.trim() || "오늘의 이야기";
    const title =
      buildNaturalBrandTitles(
        { brandName: brand, region, topic },
        enriched
      )[0] || topic;
    const intro = [
      brand && region
        ? `${region}에서 ${brand} — ${topic}에 대한 글 구성안입니다.`
        : `${topic}에 대한 글 구성안입니다.`,
      "AI 생성 엔진이 연결되면 더 풍부한 본문으로 다시 만들 수 있습니다.",
      LLM_USER_MESSAGES.briefOnlyHint,
    ].join("\n\n");
    return {
      mode: "brief_only",
      llmAvailable: false,
      blocked: true,
      reason: prepared.reason,
      userMessage: LLM_USER_MESSAGES.engineNotConnected,
      userDetail: "브랜드명·지역·주제를 입력하면 구성안이 더 정확해집니다.",
      titles: [title],
      representativeTitle: title,
      title,
      sections: [{ heading: "글 구성안", body: intro }],
      conclusion: "",
      hashtags: [brand, region, topic]
        .filter(Boolean)
        .slice(0, 5)
        .map((t) => `#${String(t).replace(/\s+/g, "")}`),
      outline: [],
      fullCopyText: intro,
      _meta: { mode: "brief_only", templateBlocked: true, isBriefOnly: true },
    };
  }

  const c = prepared.ctx;
  const flavor = c.flavor || input.flavor;
  const titleBundle = buildContextFirstTitles(c, flavor);
  const rep = titleBundle.titles[0] || c.contentThesis || "글 구성안";

  const outline = SCENE_OUTLINE.slice(0, 4).map((scene, i) => ({
    step: i + 1,
    scene,
    why:
      i === 0
        ? "왜 이 주제가 지금 필요한지 — 독자의 상황에서 시작"
        : i === 1
          ? "왜 비교·선택이 어려운지"
          : i === 2
            ? "왜 이 브랜드/장소가 떠오르는지"
            : "방문·구매 전 마지막으로 볼 포인트",
    note: c.brandContextItems?.[i % (c.brandContextItems?.length || 1)]?.value || null,
  }));

  const structured = {
    brand: c.brandName,
    region: c.region,
    industry: c.industryLabel,
    topic: c.topic || c.writingSubject,
    intent: c.contentIntent?.label,
    persona: c.contentPersonaLabel,
    season: c.seasonContext?.eventLabel || c.seasonContext?.label,
  };

  const missing = [];
  if (!c.brandName) missing.push("브랜드명(있으면 더 정확한 글)");
  if (!c.region) missing.push("지역(선택)");
  if (!c.storeFeatures && !c.brandDescription) missing.push("매장·브랜드 특징 한 줄");

  const titleQuestion = deriveTitleQuestion(rep, c);

  const briefText = [
    LLM_USER_MESSAGES.engineNotConnected,
    "",
    LLM_USER_MESSAGES.briefOnlyBody,
    "",
    "【입력 정리】",
    ...Object.entries(structured)
      .filter(([, v]) => v)
      .map(([k, v]) => `· ${k}: ${v}`),
    "",
    "【추천 제목】",
    ...titleBundle.titles.map((t) => `· ${t}`),
    "",
    `【제목이 답해야 할 질문】 ${titleQuestion || "이 글의 핵심은 무엇인가?"}`,
    "",
    "【글 구성안 — 장면 → 감정 → 왜 → 브랜드】",
    ...outline.map(
      (o) =>
        `${o.step}. ${o.scene}${o.note ? `\n   맥락: ${o.note}` : ""}\n   → ${o.why}`
    ),
    missing.length ? `\n【보완하면 좋은 정보】\n${missing.map((m) => `· ${m}`).join("\n")}` : "",
    "",
    LLM_USER_MESSAGES.briefOnlyHint,
  ].join("\n");

  return {
    mode: "brief_only",
    llmAvailable: false,
    templateBlocked: true,
    userMessage: LLM_USER_MESSAGES.engineNotConnected,
    userDetail: LLM_USER_MESSAGES.briefOnlyBody,
    titles: titleBundle.titles,
    representativeTitle: rep,
    title: rep,
    sections: [
      {
        heading: "글 구성안",
        body: briefText,
      },
    ],
    conclusion: "",
    hashtags: [],
    outline,
    structured,
    brandProfile: c.brandProfile,
    contentIntent: c.contentIntent,
    pipeline: c.pipeline,
    fullCopyText: briefText,
    _meta: {
      mode: "brief_only",
      templateBlocked: true,
      charCount: briefText.replace(/\s/g, "").length,
      isBriefOnly: true,
      passOutput: false,
      qualityScore: null,
    },
  };
}
