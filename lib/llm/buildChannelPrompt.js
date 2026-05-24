/**
 * BRICLOG 시그니처 채널 프롬프트 — 블로그와 동일한 조사·검증·V3 brief 기반
 */
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
import { PLACE_CHANNEL } from "@/styles/channels/placeStyle";
import { INSTAGRAM_CHANNEL } from "@/styles/channels/instagramStyle";

const CHANNEL_SPECS = {
  place: {
    label: "네이버 스마트플레이스 소식",
    jsonKey: "smartplace",
    rules: `NOT a blog summary. Short owner notice: title + shortNotice (≤120 chars) + detailBody (200–380 chars).
Banned: ${PLACE_CHANNEL.banned.slice(0, 8).join(", ")}.
No "블로그", SEO lecture, keyword stuffing.`,
    shape: `{
  "smartplace": {
    "title": "...",
    "shortNotice": "...",
    "detailBody": "..."
  }
}`,
  },
  instagram: {
    label: "인스타그램 캡션",
    jsonKey: "instagram",
    rules: `Save-worthy caption: hook (≤56 chars) + line-broken body + soft ending. Hashtags 5–12.
Banned: ${INSTAGRAM_CHANNEL.banned.slice(0, 8).join(", ")}.
No blog tone, no "저장해두세요" spam.`,
    shape: `{
  "instagram": {
    "hook": "...",
    "body": "...",
    "ending": "...",
    "hashtags": ["...", ...]
  }
}`,
  },
  image: {
    label: "비주얼 프롬프트 (이미지 생성용)",
    jsonKey: "image",
    rules: `English image prompts for Korean local brand. No text overlay, no watermark.
Concrete scene, brand/region mood, product context from brief.`,
    shape: `{
  "image": {
    "thumbnailPrompt": "...",
    "placeImagePrompt": "...",
    "instagramCardPrompt": "...",
    "bannerPrompt": "..."
  }
}`,
  },
};

function signatureBriefBlock(ctx) {
  const facts = ctx.researchFacts || ctx.input?.researchFacts || [];
  const factsPrompt =
    ctx.factsPrompt ||
    formatResearchFactsForPrompt(facts, { maxItems: 24 });

  return `${ctx.v3MasterBrief || ctx.input?.v3MasterBrief ? `\n【BRICLOG V3 — 조사·검증·전략 완료】\n${(ctx.v3MasterBrief || ctx.input?.v3MasterBrief || "").slice(0, 2800)}\n` : ""}
${RESEARCH_DEPTH_WRITING_RULES}
\n【수집 실마리】\n${factsPrompt}\n${ctx.v2AxisBrief ? `\n【조사 요약】\n${String(ctx.v2AxisBrief).slice(0, 1600)}\n` : ""}${
    ctx.channelSourceBrief
      ? `\n【참고 스토리(톤·사실만, 문장 복붙 금지)】\n${String(ctx.channelSourceBrief).slice(0, 1200)}\n`
      : ""
  }`;
}

function systemPrompt(channel, ctx) {
  const spec = CHANNEL_SPECS[channel];
  if (!spec) throw new Error(`Unknown channel: ${channel}`);

  return `${buildConstitutionSystemAddon(channel === "blog" ? "blog" : channel, ctx)}
${channel === "place" || channel === "instagram" ? buildSensitiveSystemAddon(ctx) : ""}

You are BRICLOG — brand-based Korean content platform (not generic ChatGPT).
Channel: ${spec.label}. Same research → verify → strategy → write → verify pipeline as blog.
Return ONLY one JSON object:
${spec.shape}

RULES:
- Korean for place/instagram text fields; English for image.* prompts.
- ${spec.rules}
- Brand「${ctx.brandName || ""}」·Region「${ctx.region || ""}」·Topic「${ctx.topic || ctx.main || ""}」each ≥5 natural mentions in channel text.
- Banned templates: ${V2_BANNED_TEMPLATE_PHRASES.slice(0, 12).join(" · ")}
- No ${CONSTITUTION_V2_AI_CLICHES.slice(0, 6).join(", ")}.
- ${RESEARCH_DEPTH_WRITING_RULES.replace(/\n/g, " ")}
- 주제 직접 팩트가 적어도 작성을 중단하지 말 것. 【수집 실마리】와 조사 요약 안에서만 단정.
${getV2PersonaPromptLine(ctx)}
${getSpeechStylePromptLine(ctx)}
${getProficiencyPromptLine(ctx)}
${getEvolutionPromptAddon(ctx)}
${buildBrandMemoryUserSection(ctx)}`;
}

function userPrompt(channel, ctx) {
  const spec = CHANNEL_SPECS[channel];
  const regen = ctx.pipeline?.regenNote
    ? `\n【재작성】 ${ctx.pipeline.regenNote}\n`
    : "";

  return `${buildConstitutionUserAddon(channel, ctx)}
${buildSensitiveUserAddon(ctx)}
${signatureBriefBlock(ctx)}
${regen}
【입력】 브랜드 ${ctx.brandName} | 지역 ${ctx.region} | 주제 ${ctx.topic || ctx.main}
업종 ${ctx.industryLabel || ctx.industry || ""} | 톤 ${ctx.tone?.label || ""}
${ctx.placePostType ? `플레이스 유형: ${ctx.placePostType}` : ""}
${ctx.instaFormat ? `인스타 형식: ${ctx.instaFormat}` : ""}
Write ${spec.jsonKey} only. JSON object, no markdown.`;
}

export function buildChannelGenerationMessages(channel, ctx = {}) {
  return [
    { role: "system", content: systemPrompt(channel, ctx) },
    { role: "user", content: userPrompt(channel, ctx) },
  ];
}
