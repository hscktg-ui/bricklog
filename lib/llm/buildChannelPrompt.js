/**
 * BRICLOG 시그니처 채널 프롬프트 — 조사 brief + 채널별 전용 규칙 (블로그 미션 스택 분리)
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
import {
  MASTER_ENGINE_V12_DATA_PRIORITY,
} from "@/lib/content/contentIntelligenceV12";
import {
  MASTER_ENGINE_V17_CHANNEL_RULES,
} from "@/lib/content/contentIntelligenceV17";
import { buildBrandContentPromptBlock } from "@/lib/content/brandContentEngine";
import { buildChannelMarketerPromptBlock } from "@/lib/content/channelMarketerEngine";
import { formatEmojiEngineBrief, EMOJI_ENGINE_BRIEF } from "@/lib/emoji/emojiEngine";
import {
  MASTER_QUALITY_POSITIONING_BRIEF,
} from "@/lib/product/masterQualityDirective";
import { PLACE_CHANNEL } from "@/styles/channels/placeStyle";
import { INSTAGRAM_CHANNEL } from "@/styles/channels/instagramStyle";
import { OUTLINE_PLAN_HEADING_PHRASES } from "@/lib/content/outlinePackGuard";
import { buildSmartPlaceVoicePromptBlock } from "@/lib/channel/smartPlaceVoiceProfile";
import { buildInstagramVoicePromptBlock } from "@/lib/channel/instagramVoiceProfile";
import { buildHumanityCommonSensePromptBlock } from "@/lib/product/humanityCommonSenseEngine";
import { buildEditorV95PromptBlock } from "@/lib/product/briclogEditorEngineV95";
import { buildPersonaEnginePromptBlock } from "@/lib/persona/personaEngineProfile";
import { buildStoryTargetChannelBrief } from "@/lib/product/storyTargetEngine";
import { buildFurnitureExhibitionWriterBrief } from "@/lib/product/furnitureExhibitionEngine";

const CHANNEL_SPECS = {
  place: {
    label: "네이버 스마트플레이스 소식",
    jsonKey: "smartplace",
    rules: `NOT a blog summary or customer review. Smart Place = marketplace owner notice board.
POV: business owner (저희/매장/안내드립니다). Short owner notice: title + shortNotice (≤120 chars) + detailBody (200–380 chars).
Forbidden customer voice: 솔직 후기, 다녀왔, 방문 후기, 체험담, 만족했, 추천해요.
Publish-ready PLACE notice only — NOT a plan/outline/checklist.
Forbidden outline phrases: ${OUTLINE_PLAN_HEADING_PHRASES.slice(0, 4).join(" / ")}.
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
Concrete scene, brand/region mood, product context from brief.
ONLY image prompts — never output blog, smartplace, or instagram copy.`,
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

function mergeChannelPromptCtx(channel, ctx = {}) {
  const input = ctx.input || ctx;
  const merged = { ...input, ...ctx, input };
  if (channel === "place" && !merged.speechStyle) {
    merged.speechStyle = "brand_official";
  }
  return merged;
}

function channelMentionRule(channel) {
  if (channel === "place") {
    return "Brand·region·topic each 1–2 natural mentions (공지에 맞게, 키워드 나열 금지).";
  }
  if (channel === "instagram") {
    return "Brand·region·topic each 2–3 natural mentions in caption.";
  }
  return "Brand·region·topic each ≥5 natural mentions in channel text.";
}

function placeMarketerFieldsBlock(ctx = {}) {
  const i = ctx.input || ctx;
  return [
    i.placePostType ? `공지 유형: ${i.placePostType}` : "",
    i.placeNoticeKind ? `공지 종류: ${i.placeNoticeKind}` : "",
    i.placeGoal ? `목표: ${i.placeGoal}` : "",
    i.placeCtaType ? `CTA 유형: ${i.placeCtaType}` : "",
    i.placeHeadline ? `제목 힌트: ${i.placeHeadline}` : "",
    i.placePeriod ? `기간: ${i.placePeriod}` : "",
    i.placeOffer ? `혜택·내용: ${i.placeOffer}` : "",
    i.placeKeyFacts || i.placeDetailHint
      ? `핵심 안내: ${i.placeKeyFacts || i.placeDetailHint}`
      : "",
    i.placeCtaNote ? `CTA 문구: ${i.placeCtaNote}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function instaMarketerFieldsBlock(ctx = {}) {
  const i = ctx.input || ctx;
  return [
    i.instaFormat ? `형식: ${i.instaFormat}` : "",
    i.instaBodyLength ? `본문 길이: ${i.instaBodyLength}` : "",
    i.instaTone ? `톤: ${i.instaTone}` : "",
    i.instaPurposeQuestion ? `목적: ${i.instaPurposeQuestion}` : "",
    i.instaMoodQuestion ? `무드: ${i.instaMoodQuestion}` : "",
    i.instaCampaignGoal ? `캠페인: ${i.instaCampaignGoal}` : "",
    i.instaAudience ? `타깃: ${i.instaAudience}` : "",
    i.instaHookAngle ? `훅 각도: ${i.instaHookAngle}` : "",
    i.instaEmojiLevel ? `이모지: ${i.instaEmojiLevel}` : "",
    i.instaCta ? `마무리 CTA: ${i.instaCta}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function channelResearchBriefBlock(channel, ctx) {
  const facts = ctx.researchFacts || ctx.input?.researchFacts || [];
  const factsPrompt =
    ctx.factsPrompt || formatResearchFactsForPrompt(facts, { maxItems: channel === "image" ? 12 : 20 });
  const parts = [
    ctx.v3MasterBrief || ctx.input?.v3MasterBrief
      ? `【조사·전략】\n${String(ctx.v3MasterBrief || ctx.input?.v3MasterBrief).slice(0, channel === "place" ? 1600 : 2200)}`
      : "",
    ctx.v2AxisBrief ? `【조사 요약】\n${String(ctx.v2AxisBrief).slice(0, 1000)}` : "",
    factsPrompt ? `【수집 실마리】\n${factsPrompt}` : "",
    ctx.channelSourceBrief
      ? `【참고(톤·사실만, 문장 복붙 금지)】\n${String(ctx.channelSourceBrief).slice(0, 900)}`
      : "",
  ].filter(Boolean);
  return parts.join("\n\n");
}

function channelSystemEditorialStack(channel, ctx) {
  if (channel === "image") {
    return "Use research facts for visual mood only. Output English image prompts only.";
  }
  const blocks = [
    MASTER_ENGINE_V12_DATA_PRIORITY.replace(/\n/g, " "),
    MASTER_ENGINE_V17_CHANNEL_RULES[channel]?.replace(/\n/g, " ") || "",
    EMOJI_ENGINE_BRIEF.replace(/\n/g, " "),
    channel === "place"
      ? buildSmartPlaceVoicePromptBlock().replace(/\n/g, " ")
      : buildInstagramVoicePromptBlock().replace(/\n/g, " "),
    buildChannelMarketerPromptBlock(channel, ctx, ctx.input || ctx).replace(/\n/g, " "),
    buildHumanityCommonSensePromptBlock().replace(/\n/g, " "),
    buildEditorV95PromptBlock().replace(/\n/g, " "),
    buildPersonaEnginePromptBlock(ctx.input || ctx).replace(/\n/g, " "),
    buildStoryTargetChannelBrief(ctx.input || ctx, channel).replace(/\n/g, " "),
    channel === "place" ? (buildFurnitureExhibitionWriterBrief(ctx.input || ctx) || "").replace(/\n/g, " ") : "",
  ];
  return blocks.filter(Boolean).join("\n- ");
}

function channelUserEditorialStack(channel, ctx) {
  if (channel === "image") return "";
  const i = ctx.input || ctx;
  return [
    (i.brandContentBrief || buildBrandContentPromptBlock()).slice(0, 1200),
    (i.brandWikiBrief || "").slice(0, 1200),
    formatEmojiEngineBrief(i, channel),
    buildChannelMarketerPromptBlock(channel, ctx, i),
  ]
    .filter(Boolean)
    .join("\n");
}

function systemPrompt(channel, ctx) {
  const spec = CHANNEL_SPECS[channel];
  if (!spec) throw new Error(`Unknown channel: ${channel}`);
  const promptCtx = mergeChannelPromptCtx(channel, ctx);

  return `${buildConstitutionSystemAddon(channel === "blog" ? "blog" : channel, promptCtx)}
${channel === "place" || channel === "instagram" ? buildSensitiveSystemAddon(promptCtx) : ""}

${MASTER_QUALITY_POSITIONING_BRIEF.replace(/\n/g, " ")}
Channel: ${spec.label}. Pipeline: research → channel write → review → output.
Return ONLY one JSON object:
${spec.shape}

RULES:
- Korean for place/instagram text fields; English for image.* prompts.
- ${spec.rules}
- ${channelMentionRule(channel)}
- Banned templates: ${V2_BANNED_TEMPLATE_PHRASES.slice(0, 12).join(" · ")}
- No ${CONSTITUTION_V2_AI_CLICHES.slice(0, 6).join(", ")}.
- Internal plan only → WRITE finished ${spec.label} JSON. Never output 「구성안」, scene checklist, or bullet-only stubs.
- 주제 입력 문장 그대로 출력 금지 — 채널 형식(공지/캡션/이미지)으로 재해석.
- ${channelSystemEditorialStack(channel, promptCtx)}
- 조사 실마리가 적어도 채널 형식으로 작성. 단정은 【수집 실마리】·조사 요약 범위 내.
${getV2PersonaPromptLine(promptCtx)}
${getSpeechStylePromptLine(promptCtx)}
${getProficiencyPromptLine(promptCtx)}
${getEvolutionPromptAddon(promptCtx.input || promptCtx)}
${buildBrandMemoryUserSection(promptCtx)}`;
}

function userPrompt(channel, ctx) {
  const spec = CHANNEL_SPECS[channel];
  const promptCtx = mergeChannelPromptCtx(channel, ctx);
  const regen = ctx.pipeline?.regenNote
    ? `\n【재작성】 ${ctx.pipeline.regenNote}\n`
    : "";
  const marketerBlock =
    channel === "place"
      ? placeMarketerFieldsBlock(promptCtx)
      : channel === "instagram"
        ? instaMarketerFieldsBlock(promptCtx)
        : "";

  return `${buildConstitutionUserAddon(promptCtx)}
${buildSensitiveUserAddon(promptCtx)}
${channelResearchBriefBlock(channel, promptCtx)}
${regen}
【입력】 브랜드 ${promptCtx.brandName} | 지역 ${promptCtx.region} | 주제 ${promptCtx.topic || promptCtx.main}
업종 ${promptCtx.industryLabel || promptCtx.industry || ""} | 톤 ${promptCtx.tone?.label || ""}
${marketerBlock ? `【채널 설정】\n${marketerBlock}\n` : ""}
${channelUserEditorialStack(channel, promptCtx)}
Write ${spec.jsonKey} only. JSON object, no markdown.
구성안·PLAN·체크리스트 출력 금지. ${channel === "place" ? "플레이스 공지" : channel === "instagram" ? "인스타 캡션" : "이미지 프롬프트"} 완성본만 작성.`;
}

export function buildChannelGenerationMessages(channel, ctx = {}) {
  const promptCtx = mergeChannelPromptCtx(channel, ctx);
  return [
    { role: "system", content: systemPrompt(channel, promptCtx) },
    { role: "user", content: userPrompt(channel, promptCtx) },
  ];
}
