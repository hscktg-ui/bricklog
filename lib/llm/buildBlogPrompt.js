/**
 * 브랜드 컨텍스트 → LLM 프롬프트 (블로그 전용 — 5채널 스키마 충돌 제거)
 */
import { resolveBlogLengthTier } from "@/lib/constants";
import { getEmotionPromptLine } from "@/lib/emotion/emotionTemperature";
import {
  buildConstitutionSystemAddon,
  buildConstitutionUserAddon,
  getV2PersonaPromptLine,
  getSpeechStylePromptLine,
  getProficiencyPromptLine,
  CONSTITUTION_V2_AI_CLICHES,
} from "@/lib/constitution/writingConstitutionV2";
import {
  buildSensitiveSystemAddon,
  buildSensitiveUserAddon,
} from "@/lib/compliance/sensitivePrompt";
import { getEvolutionPromptAddon } from "@/lib/evolution-lab/rulesStore";
import { buildBrandMemoryUserSection } from "@/lib/memory/brandMemoryBundle";
import { V2_BANNED_TEMPLATE_PHRASES } from "@/lib/content/v2BannedTemplates";
import { formatResearchFactsForPrompt } from "@/lib/content/v2ResearchFacts";
import { RESEARCH_DEPTH_WRITING_RULES } from "@/lib/content/researchDepthEngine";
import { CLUE_DISCOVERY_WRITING_RULES } from "@/lib/content/clueDiscoveryEngine";
import {
  MASTER_ENGINE_V12_RULES,
  MASTER_ENGINE_V12_DATA_PRIORITY,
} from "@/lib/content/contentIntelligenceV12";
import {
  MASTER_ENGINE_V17_GLOBAL_RULES,
  MASTER_ENGINE_V17_CHANNEL_RULES,
  MASTER_ENGINE_V17_INFORMATION_RULES,
} from "@/lib/content/contentIntelligenceV17";
import { formatSectionPlanForPrompt } from "@/lib/content/sectionPlannerEngine";
import { HUMAN_DELIVERY_PROMPT_RULES } from "@/lib/content/humanDeliveryRules";
import { OUTLINE_PLAN_HEADING_PHRASES } from "@/lib/content/outlinePackGuard";
import { getWritingSkillPromptLine } from "@/lib/content/writingSkillLevel";
import { buildBrandContentPromptBlock } from "@/lib/content/brandContentEngine";
import { buildPerspectivePromptBlock } from "@/lib/content/perspectiveEngine";
import { EDITOR_DEFAULT_VOICE_BRIEF } from "@/lib/content/editorQualityEngine";
import { buildEditorV95PromptBlock } from "@/lib/product/briclogEditorEngineV95";
import { buildHumanEditorGuardPromptBlock } from "@/lib/content/humanEditorGuardPass";
import { buildPersonaEnginePromptBlock } from "@/lib/persona/personaEngineProfile";
import {
  TOPIC_DECOMPOSITION_BRIEF,
  EDITOR_RECONSTRUCTION_BRIEF,
} from "@/lib/content/informationUnitEngine";
import { KNOWLEDGE_EXPANSION_EDITOR_BRIEF } from "@/lib/content/knowledgeExpansionEngine";
import { BETA_GUARD_EDITOR_BRIEF } from "@/lib/content/betaTestGuardEngine";
import { formatEmojiEngineBrief, EMOJI_ENGINE_BRIEF } from "@/lib/emoji/emojiEngine";
import {
  MASTER_QUALITY_POSITIONING_BRIEF,
  MASTER_QUALITY_EDITOR_BRIEF,
  QUALITY_PRIORITIES,
  FORBIDDEN_FAST_PATH,
} from "@/lib/product/masterQualityDirective";
import { CUSTOMER_QUESTION_WRITING_RULES } from "@/lib/content/customerQuestionEngine";
import { BRICLOG_FAST_PIPELINE_BRIEF } from "@/lib/config/briclogFastPipeline";
import { buildBriclogMissionPromptBlock, isBriclogMissionEnforced } from "@/lib/product/briclogMission";
import { isAntiSeoSpamEnforced } from "@/lib/product/antiSeoSpamEngine";
import {
  buildSignatureWritingPromptBlock,
  SIGNATURE_FORBIDDEN_HEADING_PHRASES,
  SIGNATURE_WRITING_FLOW,
} from "@/lib/product/signatureWritingEngine";
import { buildHumanBeliefPromptBlock } from "@/lib/product/humanBeliefEngine";
import { buildStyleAnchorPromptBlock } from "@/lib/memory/styleAnchorEngine";
import { buildNaverEnginePromptAddon } from "@/lib/channel/naverBlogEngineRules";
import { buildBrandSubenginePromptBlock } from "@/lib/product/brandSubengine";
import { buildMagazineArcPromptBlock } from "@/lib/content/columnMagazineArchetype";
import { buildHumanColumnPromptAddon } from "@/lib/content/humanColumnPolishEngine";
import { buildExperienceVoicePromptBlock } from "@/lib/content/experienceVoiceProfile";

function channelHintsForBlog(ctx) {
  const briefs = ctx.channelBriefs || {};
  const lines = [
    briefs.blog,
    briefs.smartplace,
    briefs.instagram,
    ctx.exposureBlog,
    ctx.exposurePlace,
    ctx.exposureInstagram,
    ctx.trendHintsBlog,
    ctx.trendHintsPlace,
    ctx.trendHintsInstagram,
  ]
    .filter(Boolean)
    .map((s) => String(s).slice(0, 220));
  return lines.length ? lines.join("\n") : "";
}

function blogLengthForCtx(ctx) {
  const tier =
    ctx.input?.blogLengthTier || ctx.blogLengthTier || "medium";
  return resolveBlogLengthTier(tier);
}

function blogOnlySystemPrompt(ctx) {
  const { min: blogMin, target: blogTarget, max: blogMax } = blogLengthForCtx(ctx);
  const tier = ctx.input?.blogLengthTier || ctx.blogLengthTier || "medium";
  const longForm = tier === "medium" || tier === "long";
  const forbidden =
    ctx.excludeList?.length > 0
      ? ctx.excludeList.join(", ")
      : ctx.excludePhrases || "최고, 1등, 무조건";

  return `${buildConstitutionSystemAddon("blog", ctx)}

You are BRICLOG — ${MASTER_QUALITY_POSITIONING_BRIEF.replace(/\n/g, " ")}
Quality priority order: ${QUALITY_PRIORITIES.join(" > ")}.
Forbidden: ${FORBIDDEN_FAST_PATH}.
Never start the article before brand, region, and topic research in the user brief are complete.
Publish-ready bar: concrete scenes, one clear thread, no filler — a director should paste this draft with minimal edits.
Return ONLY one JSON object with this shape (no markdown, no other keys):
{
  "blog": {
    "titles": ["...", "...", "...", "...", "..."],
    "title": "...",
    "representativeTitle": "...",
    "sections": [{"heading":"...","body":"..."}],
    "conclusion": "...",
    "hashtags": ["...", ...]
  }
}

INPUT GROUNDING (mandatory):
- Follow the authoritative brief in the user message only. Ignore contradictory fluff typed into wrong form fields.
- Supplementary fields (keywords, include phrases, tone, persona) refine WHAT to say — never WHERE to place content in sections unless the user explicitly requests a structure change in free text (topic/main story).
- Do not treat optional fields as "put X in section 3" layout commands.

SEO (apply AFTER the column is written — SEO is an outcome, not the writing goal):
- First write a complete column-quality article (기-승-전-결). Then ensure region, brand, and topic appear naturally in title, opening, 1–2 mid sections, and conclusion.
- No keyword stuffing; no "검색하시는 분"; no listicle SEO tone.
- Main keyword ~4–7 times in full text only if natural; sub keywords 1–3 times each.

RULES:
- Korean only for blog fields.
- Scene-first opening; no SEO list tone; no "참고1", "저장해두세요", "검색하시는 분".
- Main keyword in natural flow only: ${ctx.main || "(omit if unknown)"}
- Region: ${ctx.region || "(omit)"} | Brand: ${ctx.brandName || "(omit if unknown)"}
- Industry context: ${ctx.industryLabel || "(omit)"} | Tone: ${ctx.tone?.label || ""}
- STRICT EXCLUDE: ${forbidden}
- Never output undefined, null, or placeholder labels.
- LENGTH TIER (customer promise): ${blogMin}–${blogMax} chars (spaces included), target ~${blogTarget}. Never pad with filler to hit count; trim if over max.
- ${HUMAN_DELIVERY_PROMPT_RULES.replace(/\n/g, " ")}
- sections: ${longForm ? "exactly 7" : "5-6"} items; each body contributes to tier band; mobile line breaks.
- For ${tier} tier, section bodies must be substantial (not short blurbs). ${longForm ? "Aim 380+ chars per section before final trim." : "Aim 260+ chars per section before final trim."}
- titles: exactly 5; representativeTitle = best title. NEVER keyword-stack titles (e.g. "평택 템퍼 모션베드 특별할인" or "region · brand · topic"). Structure: region → situation → brand → topic with comma/natural flow. Human must want to click — not SEO enumeration.
- TOPIC RULE: Never paste the user's topic string verbatim into title/body. Decompose into 20~50 information units, research each, then write as a professional editor column.
- ${TOPIC_DECOMPOSITION_BRIEF.replace(/\n/g, " ")}
- ${EDITOR_RECONSTRUCTION_BRIEF.replace(/\n/g, " ")}
- Information density: decision-grade details via reinterpretation (why people search), not feature lists copied from research.
- ${buildBrandContentPromptBlock().replace(/\n/g, " ")}
- Banned headings: 왜 사람들이 찾을까, 알아두면 좋은 점, 직접 써보면, 선택 전에 알아두면. Brochure/manual section titles FORBIDDEN: ${SIGNATURE_FORBIDDEN_HEADING_PHRASES.slice(0, 12).join(" · ")} …
- OUTLINE FORBIDDEN (never output plan/checklist as final blog): ${OUTLINE_PLAN_HEADING_PHRASES.join(" / ")}. No 「글 구성안」, no bullet-only section stubs — only publish-ready paragraphs under concrete headings (brand, product, region, promo, visit, purchase).
- Pipeline: internal plan only → WRITE full blog JSON. User sees finished article, not an outline.
- Banned clichés: ${CONSTITUTION_V2_AI_CLICHES.slice(0, 8).join(", ")} 등 감성 관용구.
- V2 금지(이전 업종 템플릿): ${V2_BANNED_TEMPLATE_PHRASES.join(" / ")}.
- ${isAntiSeoSpamEnforced() ? "지역·브랜드·주제명 동일 키워드 3회 이상 반복 금지 — 대명사·상황·동의어로 치환. 문맥 연관으로 SEO." : "브랜드·지역·제품(주제) 각각 본문에 5회 이상 자연 반영(키워드 도배 금지)."}
- 확인되지 않은 스펙·가격·효과 추측 금지.
- ${RESEARCH_DEPTH_WRITING_RULES.replace(/\n/g, " ")}
- ${CLUE_DISCOVERY_WRITING_RULES.replace(/\n/g, " ")}
- ${MASTER_ENGINE_V12_DATA_PRIORITY.replace(/\n/g, " ")}
- ${MASTER_ENGINE_V12_RULES.replace(/\n/g, " ")}
- ${MASTER_ENGINE_V17_GLOBAL_RULES.replace(/\n/g, " ")}
- ${MASTER_ENGINE_V17_INFORMATION_RULES.replace(/\n/g, " ")}
- ${MASTER_ENGINE_V17_CHANNEL_RULES.blog.replace(/\n/g, " ")}
- 주제 직접 팩트가 적어도 작성을 중단하지 말 것. 브랜드·지역·업종·독자 질문으로 전개하되 미확인 사실 단정 금지.
- 본문은 【수집 실마리】와 조사 요약에 있는 내용을 중심으로 쓰고, 일반론·타 업종 예시로 채우지 말 것.
- 브랜드·지역·주제와 무관한 문장 출력 금지.
- For furniture/bed/exhibition topics: write as a first-person showroom visit (what was on display, what you saw/touched). Do not invent motion, pressure distribution, or frame height adjustment unless explicitly in research facts. No competitor brand comparisons. Practical info (hours, reservation, parking) only in a short blockquote (max 4 lines), not separate A/S or delivery sections.
- If region is specific (not 전국), include living-area context and visit intent naturally (생활권/동선/인근 상권/방문 이유/체험 목적).
- Use practical operating context first (problem, criteria, execution flow, brand philosophy); avoid essay-style emotional opening.
- If brand/topic is BRICLOG, force this flow: 문제 제기 → 기존 AI 한계 → 브랜드가 흐려지는 이유 → 브릭로그 철학 → 브랜드 메모리 → 운영 방식 → 기능 설명 → 콘텐츠 축적 구조 → 마무리.
- Meta-layer separation (hard): treat internal engine terms as hidden policy only; never print these phrases in final content: 브랜드 기억 엔진 / 검수 기준 / 운영 흐름 / 콘텐츠 축적 시스템 / 브랜드 메모리 기준 / 목적 save 고정 / informative 기준 / emotional 기준.
- No duplicate sentences or repeated patterns.
- ${EMOJI_ENGINE_BRIEF.replace(/\n/g, " ")}
- ${CUSTOMER_QUESTION_WRITING_RULES.replace(/\n/g, " ")}
- ${BRICLOG_FAST_PIPELINE_BRIEF.replace(/\n/g, " ")}
- ${buildBriclogMissionPromptBlock(ctx.input || ctx).replace(/\n/g, " ")}
- ${String(ctx.input?.publishPurposeBrief || ctx.publishPurposeBrief || "").replace(/\n/g, " ")}
- ${String(ctx.input?.structureVarietyBrief || ctx.structureVarietyBrief || "").replace(/\n/g, " ")}
- Story target: pick ONE audience keyword (e.g. 신혼가구) — emotion → visual scene at showroom → field visit. No spec list.
- ${buildSignatureWritingPromptBlock(ctx.input || ctx).replace(/\n/g, " ")}
- ${buildMagazineArcPromptBlock(ctx.input || ctx).replace(/\n/g, " ")}
- ${buildHumanColumnPromptAddon(ctx.input || ctx).replace(/\n/g, " ")}
- ${buildExperienceVoicePromptBlock().replace(/\n/g, " ")}
- ${buildHumanBeliefPromptBlock().replace(/\n/g, " ")}
- ${buildNaverEnginePromptAddon(ctx.input || ctx).replace(/\n/g, " ")}
- ${buildBrandSubenginePromptBlock({ ...ctx, input: ctx.input || ctx }).replace(/\n/g, " ")}
- Quality floor: human-written column quality and verified facts — never pad length with filler.

BRAND CONTEXT (reinterpret only, never copy sources):
${ctx.searchSummaryBrief?.slice(0, 600) || "user input only"}
Research status: ${ctx.brandResearch?.sourceStatus || "user_input_only"} — never cite URLs or "search results".
CONTENT KPI: ${ctx.kpi?.label || "저장유도형"} — ${ctx.kpi?.hint || ""}
Channel hints (blog / place / insta — tone only, no cross-channel paste):
${channelHintsForBlog(ctx) || "(channel defaults)"}
User input overrides conflicting inference.${buildSensitiveSystemAddon(ctx.sensitiveCompliance)}${ctx.input?.evolutionLabBrief || getEvolutionPromptAddon()}`;
}

export function buildBlogUserPrompt(ctx) {
  const { min: blogMin, target: blogTarget, max: blogMax } = blogLengthForCtx(ctx);
  const tier =
    ctx.input?.blogLengthTier || ctx.blogLengthTier || "medium";
  const tierLabel =
    tier === "short"
      ? "짧은 글"
      : tier === "long"
        ? "긴 글"
        : "중간 글";
  const longForm = tier === "medium" || tier === "long";
  const profile = ctx.brandProfile || {};
  const items = (ctx.brandContextItems || [])
    .map((i) => `· ${i.label || i.key}: ${i.value}`)
    .join("\n");

  const authoritativeBrief =
    ctx.canonicalBrief ||
    ctx.inputGrounding?.canonicalBrief ||
    ctx.input?._canonicalBrief ||
    null;

  const factsPrompt =
    ctx.factsPrompt ||
    formatResearchFactsForPrompt(ctx.researchFacts || ctx.input?.researchFacts);

  return `${buildConstitutionUserAddon(ctx)}
아래 브랜드 컨텍스트만 사용해 위 JSON 형식의 blog 객체만 작성하세요.
추정·업종 일반론·검색어 나열·AI 소제목 금지.
사용자 원문 문장을 그대로 복사하지 마세요. 주제 입력란 문장을 제목·첫 문장·소제목에 붙여넣지 말고, 분해된 정보 단위를 칼럼처럼 재구성하세요.
기(왜 찾게 됐는지) → 승(직접 방문·체험) → 전(비교·기준) → 결(본인 정리) 순서를 주제·브랜드에 맞게 쓰고, FAQ·체크리스트·홍보 문장(알려드립니다·많은 분들께·지금 바로)은 쓰지 마세요.
입력란은 '무엇을 쓸지'만 조정합니다. 섹션·문단 순서 지시(몇 번째 소제목에 넣기 등)는 따르지 마세요.
생성 전 전략 판단이 완료된 경우에만 본문을 작성하세요. 전략이 비어 있으면 작성하지 마세요.
구성안·PLAN·체크리스트 형태 출력 금지. 반드시 네이버 발행 가능한 완성 본문(문단)만 작성하세요.
금지 소제목 예: ${OUTLINE_PLAN_HEADING_PHRASES.slice(0, 4).join(" / ")}.
브랜드·지역·주제(제품·프로모션)·체험·방문·구매 설명이 본문 90% 이상이어야 합니다.
${buildBrandMemoryUserSection(ctx)}
${buildStyleAnchorPromptBlock(ctx) ? `\n${buildStyleAnchorPromptBlock(ctx)}\n` : ""}
${formatSectionPlanForPrompt(ctx, ctx.input || ctx)}
${authoritativeBrief ? `\n${authoritativeBrief}\n\n` : ""}${ctx.v3MasterBrief || ctx.input?.v3MasterBrief ? `\n【BRICLOG V3 — 조사·검증·전략 완료 후 작성】\n${(ctx.v3MasterBrief || ctx.input?.v3MasterBrief || "").slice(0, 3200)}\n\n` : ""}${ctx.knowledgeMapBrief || ctx.input?.knowledgeMapBrief ? `\n${(ctx.knowledgeMapBrief || ctx.input?.knowledgeMapBrief || "").slice(0, 2800)}\n\n` : ""}${ctx.knowledgeExpansionBrief || ctx.input?.knowledgeExpansionBrief ? `\n${(ctx.knowledgeExpansionBrief || ctx.input?.knowledgeExpansionBrief || "").slice(0, 2800)}\n\n` : ""}${ctx.informationUnitBrief || ctx.input?.informationUnitBrief ? `\n${(ctx.informationUnitBrief || ctx.input?.informationUnitBrief || "").slice(0, 3200)}\n\n` : ""}${ctx.coverageMapBrief || ctx.input?.coverageMapBrief ? `\n${(ctx.coverageMapBrief || ctx.input?.coverageMapBrief || "").slice(0, 2400)}\n\n` : ""}\n【수집 실마리 · 조사 brief】\n${factsPrompt}\n\n${ctx.v3ContentStrategy ? `\n【콘텐츠 유형】 ${ctx.v3ContentStrategy.label} — ${ctx.v3ContentStrategy.hint}\n` : ""}${ctx.v3SeoStrategy ? `\n【SEO】 메인 ${(ctx.v3SeoStrategy.mainKeywords || []).join(" · ")} · 서브 ${(ctx.v3SeoStrategy.subKeywords || []).slice(0, 5).join(" · ")}\n` : ""}${ctx.v2AxisBrief || ctx.input?.v2AxisBrief ? `\n【조사 요약】\n${(ctx.v2AxisBrief || ctx.input?.v2AxisBrief || "").slice(0, 1800)}\n\n` : ""}${ctx.customerQuestionBrief || ctx.input?.customerQuestionBrief ? `\n${(ctx.customerQuestionBrief || ctx.input?.customerQuestionBrief || "").slice(0, 2800)}\n\n` : ""}${ctx.geminiWriterBrief || ctx.input?.geminiWriterBrief ? `\n${(ctx.geminiWriterBrief || ctx.input?.geminiWriterBrief || "").slice(0, 2000)}\n\n` : ""}${ctx.channelSourceBrief ? `【다른 채널 초안】\n${ctx.channelSourceBrief}\n\n` : ""}【이번 입력 · 재해석 주제】 ${ctx.informationUnits?.topicFacet || ctx.contentThesis || ctx.writingSubject || ctx.topic} (원문 주제 문장 그대로 출력 금지)
【META STRATEGY】 유형=${ctx.metaStrategy?.contentType || "-"} | 목적=${ctx.metaStrategy?.purpose || "-"} | 브랜드유형=${ctx.metaStrategy?.brandType || "-"} | 업종=${ctx.metaStrategy?.industry || "-"} | 독자=${ctx.metaStrategy?.audience || "-"} | 독자획득=${ctx.metaStrategy?.readerGain || "-"} | 톤=${ctx.metaStrategy?.tone || "-"}
【INTENT CONTRACT】 primary=${ctx.intentContract?.primaryStory || "-"} | mustInclude=${(ctx.intentContract?.mustInclude || []).join(" · ") || "-"} | flowKeywords=${(ctx.intentContract?.requiredFlowKeywords || []).join(" · ") || "-"} | businessFirst=${ctx.intentContract?.businessFirst ? "yes" : "no"}
【INTENT 금지 표현】 ${(ctx.intentContract?.bannedGenericPhrases || []).join(" / ") || "-"}
【길이 전략】 tier=${ctx.metaStrategy?.lengthTierKey || (ctx.input?.blogLengthTier || ctx.blogLengthTier || "medium")} | min=${ctx.metaStrategy?.lengthPlan?.min || blogMin} | target=${ctx.metaStrategy?.lengthPlan?.target || blogTarget} | max=${ctx.metaStrategy?.lengthPlan?.max || blogMax}
【전략 순서】 ${(ctx.metaStrategy?.strategyFlow || []).join(" → ")}
【의도】 ${ctx.contentIntent?.label || ""} — ${ctx.contentIntent?.userIntent || ""}
【콘텐츠 KPI】 ${ctx.kpi?.label || "저장유도형"} — ${ctx.kpi?.hint || ""}
【화자】 ${ctx.contentPersonaLabel || ctx.contentPersona} (글 전체 유지)
${ctx.personaEngineBrief || buildPersonaEnginePromptBlock(ctx.input || ctx)}
【콘텐츠 관점】 ${ctx.contentPerspectiveLabel || ctx.contentPerspective || "브랜드"} (${ctx.contentPerspectiveSource === "auto" ? "자동" : "선택"})
${ctx.perspectiveBrief || buildPerspectivePromptBlock(ctx, ctx.input || ctx)}
${getV2PersonaPromptLine(ctx.input || ctx)}
${getSpeechStylePromptLine(ctx.input || ctx)}
${getProficiencyPromptLine(ctx.input || ctx)}
${getWritingSkillPromptLine(ctx.input || ctx)}
${getEmotionPromptLine(ctx.input || ctx)}
【검색 의도】 독자가 궁금한 위치·이용·차별점·방문 이유에 답할 것. 주제 정의·백과 설명 금지 — CUSTOMER QUESTION ENGINE 6대 질문(왜·누가·언제·비교·자주 묻는 질문·구매 전 실수)에 답하는 본문으로 작성.
【제목이 답할 질문】 ${ctx.pipeline?.titleQuestion || "이 글의 핵심은 무엇인가?"}

【브랜드 프로파일】
브랜드: ${profile.brandName || ctx.brandName || "(미입력)"}
업종: ${profile.industry || ctx.industryLabel || "(미입력)"}
지역: ${profile.region || ctx.region || "(미입력)"}
차별점: ${profile.differentiator || "-"}
운영: ${profile.operationStyle || "-"}
철학/톤: ${profile.brandPhilosophy || profile.toneAndManner || "-"}

【맥락】
${items || "(입력된 맥락만 사용)"}

【시즌·분위기】 ${ctx.seasonContext?.promptLine || ctx.includePhrases || "-"}

${buildBrandContentPromptBlock()}

${MASTER_QUALITY_EDITOR_BRIEF}

${ctx.editorColumnBrief || ctx.input?.editorColumnBrief || KNOWLEDGE_EXPANSION_EDITOR_BRIEF}

${BETA_GUARD_EDITOR_BRIEF}

${ctx.emojiBrief || formatEmojiEngineBrief(ctx.input || ctx, "blog")}

${EDITOR_DEFAULT_VOICE_BRIEF}

${buildEditorV95PromptBlock()}

${buildHumanEditorGuardPromptBlock()}

【SEO·키워드 — 본문 완성 후 자연 배치】
${ctx.topicSeoBrief || ctx.keywordBrief || "(주제·키워드에서 추출한 표현을 글 소재로 사용)"}

【조사·채널 힌트】
${ctx.searchSummaryBrief?.slice(0, 400) || "사용자 입력만 사용"}
${channelHintsForBlog(ctx) ? `\n${channelHintsForBlog(ctx).slice(0, 500)}` : ""}

【구조】
1) 옵션 우선: 브랜드명·브랜드유형·업종·지역·목적·톤·문체·플랫폼·글자수를 먼저 고정한 뒤 본문 시작
2) SaaS/AI/플랫폼/academy/마케팅은 감성 에세이 금지, 문제 해결형 + 브랜드 전략형 흐름으로 작성
3) ${isBriclogMissionEnforced() ? `Signature 순서: ${SIGNATURE_WRITING_FLOW.join(" → ")}. 도입·첫 섹션은 「왜」·불편함·비교 기준 — 브랜드 소개·제품·기능 설명 금지.` : `3000자급(중간/긴 글)은 7단 장문 구조를 사용: 문제 제기 → 원인 분석 → 브랜드 철학 → 운영 흐름 → 기능 설명 → 활용 방식 → 방향성 정리`}
3-1) ${longForm ? "각 섹션은 짧은 소개문이 아니라 3~5문장 이상의 실질 내용으로 작성" : "각 섹션은 최소 2~3문장 이상의 실질 내용으로 작성"}
4) ${isAntiSeoSpamEnforced() ? `지역·브랜드·주제(${ctx.brandName || ""}${ctx.region ? ` · ${ctx.region}` : ""}${ctx.v2ProductName || ctx.topic ? ` · ${ctx.v2ProductName || ctx.topic}` : ""})는 필요한 위치에만 — 동일 키워드 3회 초과 반복 금지` : `브랜드·지역·제품명 각 5회 이상 자연 반영 (${ctx.brandName ? `브랜드「${ctx.brandName}」` : ""}${ctx.region ? ` · 지역「${ctx.region}」` : ""}${ctx.v2ProductName || ctx.topic ? ` · 주제「${ctx.v2ProductName || ctx.topic}」` : ""})`}
5) SEO는 결과로 취급: 키워드 나열 대신 브랜드 맥락과 독자 의사결정 흐름을 우선
6) 분량: tier ${tierLabel} — 공백 포함 ${blogMin}~${blogMax}자 참고. 정보가 부족하면 짧게 마무리하고, 반복·일반론·SEO 나열로 채우지 말 것. 글자수만 맞추는 패딩 절대 금지.
7) 금지: "사용자 친화적 인터페이스", "초보자도 쉽게", "전국 어디서나" 같은 범용 앱 소개 문장 반복.
JSON만 반환. blog 키만 포함.${buildSensitiveUserAddon(
    ctx.sensitiveCompliance,
    ctx.pipeline?.complianceRegenNote || ctx.pipeline?.regenNote
  )}`;
}

export function buildBlogGenerationMessages(ctx) {
  return [
    { role: "system", content: blogOnlySystemPrompt(ctx) },
    { role: "user", content: buildBlogUserPrompt(ctx) },
  ];
}
