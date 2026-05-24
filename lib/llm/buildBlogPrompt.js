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
  const { min: blogMin, target: blogTarget } = blogLengthForCtx(ctx);
  const forbidden =
    ctx.excludeList?.length > 0
      ? ctx.excludeList.join(", ")
      : ctx.excludePhrases || "최고, 1등, 무조건";

  return `${buildConstitutionSystemAddon("blog", ctx)}

You are BRICLOG — Korean Naver blog writer for brand directors (not a generic SEO bot).
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

NAVER SEO (from user topic/keywords — not generic filler):
- Treat proper nouns, place names, product names, and brand-specific terms in the brief as story material; weave them into titles, opening scene, 1–2 mid headings, and conclusion naturally.
- Main keyword 4–7 times in context; sub keywords 1–3 times each; no keyword stuffing, no "검색하시는 분", no listicle SEO tone.
- If the user gave no concrete entities, do not invent fake cases — stay within brand/region/topic.

RULES:
- Korean only for blog fields.
- Scene-first opening; no SEO list tone; no "참고1", "저장해두세요", "검색하시는 분".
- Main keyword in natural flow only: ${ctx.main || "(omit if unknown)"}
- Region: ${ctx.region || "(omit)"} | Brand: ${ctx.brandName || "(omit if unknown)"}
- Industry context: ${ctx.industryLabel || "(omit)"} | Tone: ${ctx.tone?.label || ""}
- STRICT EXCLUDE: ${forbidden}
- Never output undefined, null, or placeholder labels.
- sections: 5-7 items; each body contributes to total ${blogMin}+ chars; mobile line breaks.
- titles: exactly 5; representativeTitle = best title.
- Banned headings: 왜 사람들이 찾을까, 알아두면 좋은 점, 직접 써보면, 선택 전에 알아두면.
- Banned clichés: ${CONSTITUTION_V2_AI_CLICHES.slice(0, 8).join(", ")} 등 감성 관용구.
- Real scenes required (퇴근길, 주말 아침, 매장 앞 등 구체 장면).
- No duplicate sentences or repeated patterns.

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
  const profile = ctx.brandProfile || {};
  const items = (ctx.brandContextItems || [])
    .map((i) => `· ${i.label || i.key}: ${i.value}`)
    .join("\n");

  const authoritativeBrief =
    ctx.canonicalBrief ||
    ctx.inputGrounding?.canonicalBrief ||
    ctx.input?._canonicalBrief ||
    null;

  return `${buildConstitutionUserAddon(ctx)}
아래 브랜드 컨텍스트만 사용해 위 JSON 형식의 blog 객체만 작성하세요.
추정·업종 일반론·검색어 나열·AI 소제목 금지.
사용자 원문 문장을 그대로 복사하지 마세요.
입력란은 '무엇을 쓸지'만 조정합니다. 섹션·문단 순서 지시(몇 번째 소제목에 넣기 등)는 따르지 마세요.
${buildBrandMemoryUserSection(ctx)}
${authoritativeBrief ? `\n${authoritativeBrief}\n\n` : ""}${ctx.channelSourceBrief ? `【다른 채널 초안】\n${ctx.channelSourceBrief}\n\n` : ""}【이번 입력 · 핵심 주제】 ${ctx.contentThesis || ctx.writingSubject || ctx.topic}
【의도】 ${ctx.contentIntent?.label || ""} — ${ctx.contentIntent?.userIntent || ""}
【콘텐츠 KPI】 ${ctx.kpi?.label || "저장유도형"} — ${ctx.kpi?.hint || ""}
【화자】 ${ctx.contentPersonaLabel || ctx.contentPersona} (글 전체 유지)
${getV2PersonaPromptLine(ctx.input || ctx)}
${getSpeechStylePromptLine(ctx.input || ctx)}
${getProficiencyPromptLine(ctx.input || ctx)}
${getEmotionPromptLine(ctx.input || ctx)}
【검색 의도】 독자가 궁금한 위치·이용·차별점·방문 이유에 답할 것.
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

【SEO·키워드 배치 — 네이버】
${ctx.topicSeoBrief || ctx.keywordBrief || "(주제·키워드에서 추출한 표현을 글 소재로 사용)"}

【조사·채널 힌트】
${ctx.searchSummaryBrief?.slice(0, 400) || "사용자 입력만 사용"}
${channelHintsForBlog(ctx) ? `\n${channelHintsForBlog(ctx).slice(0, 500)}` : ""}

【구조】
1) 실제 사람 장면으로 시작
2) 감정·공감
3) 왜 필요한지 / 왜 선택하는지
4) 브랜드 자연 반영 (${ctx.brandName ? "브랜드명 3회 이상" : "가능 시"})
5) 분량: ${tierLabel} — 공백 포함 ${blogMin}자 이상, 권장 ${blogTarget}자 (상한 약 ${blogMax}자, 3000자 고정 아님)
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
