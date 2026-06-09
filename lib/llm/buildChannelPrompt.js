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
import { buildBrandContentPromptBlock } from "@/lib/content/brandContentEngine";
import { buildPerspectivePromptBlock } from "@/lib/content/perspectiveEngine";
import { buildChannelMarketerPromptBlock } from "@/lib/content/channelMarketerEngine";
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
} from "@/lib/product/masterQualityDirective";
import { CLUE_DISCOVERY_WRITING_RULES } from "@/lib/content/clueDiscoveryEngine";
import { PLACE_CHANNEL } from "@/styles/channels/placeStyle";
import { INSTAGRAM_CHANNEL } from "@/styles/channels/instagramStyle";
import { OUTLINE_PLAN_HEADING_PHRASES } from "@/lib/content/outlinePackGuard";
import { buildSmartPlaceVoicePromptBlock } from "@/lib/channel/smartPlaceVoiceProfile";
import { buildInstagramVoicePromptBlock } from "@/lib/channel/instagramVoiceProfile";
import { buildHumanityCommonSensePromptBlock } from "@/lib/product/humanityCommonSenseEngine";
import { buildEditorV95PromptBlock } from "@/lib/product/briclogEditorEngineV95";
import { buildPersonaEnginePromptBlock } from "@/lib/persona/personaEngineProfile";
import { buildStoryTargetChannelBrief, buildStoryTargetEnginePromptBlock } from "@/lib/product/storyTargetEngine";
import { buildFurnitureExhibitionWriterBrief } from "@/lib/product/furnitureExhibitionEngine";
import {
  buildContentDoctrinePromptBlock,
  buildSpeakerPurposeExplainBrief,
} from "@/lib/product/briclogContentDoctrine";
import { buildBriclogMissionPromptBlock } from "@/lib/product/briclogMission";

const CHANNEL_SPECS = {
  place: {
    label: "네이버 스마트플레이스 소식",
    jsonKey: "smartplace",
    rules: `NOT a blog summary. Short owner notice: title + shortNotice (≤120 chars) + detailBody (200–380 chars).
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

function signatureBriefBlock(ctx) {
  const facts = ctx.researchFacts || ctx.input?.researchFacts || [];
  const factsPrompt =
    ctx.factsPrompt ||
    formatResearchFactsForPrompt(facts, { maxItems: 24 });

  return `${ctx.v3MasterBrief || ctx.input?.v3MasterBrief ? `\n【BRICLOG V3 — 조사·검증·전략 완료】\n${(ctx.v3MasterBrief || ctx.input?.v3MasterBrief || "").slice(0, 2800)}\n` : ""}
${ctx.knowledgeExpansionBrief || ctx.input?.knowledgeExpansionBrief ? `\n${String(ctx.knowledgeExpansionBrief || ctx.input?.knowledgeExpansionBrief).slice(0, 2400)}\n` : ""}
${ctx.informationUnitBrief || ctx.input?.informationUnitBrief ? `\n${String(ctx.informationUnitBrief || ctx.input?.informationUnitBrief).slice(0, 2400)}\n` : ""}
${RESEARCH_DEPTH_WRITING_RULES}
${CLUE_DISCOVERY_WRITING_RULES}
\n【수집 실마리】\n${factsPrompt}\n${ctx.knowledgeMapBrief || ctx.input?.knowledgeMapBrief ? `\n${String(ctx.knowledgeMapBrief || ctx.input?.knowledgeMapBrief).slice(0, 2000)}\n` : ""}${ctx.v2AxisBrief ? `\n【조사 요약】\n${String(ctx.v2AxisBrief).slice(0, 1600)}\n` : ""}${
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

${MASTER_QUALITY_POSITIONING_BRIEF.replace(/\n/g, " ")}
Channel: ${spec.label}. Pipeline: topic decompose → research → expand → editor write → review → output (never write before research).
Return ONLY one JSON object:
${spec.shape}

RULES:
- Korean for place/instagram text fields; English for image.* prompts.
- ${spec.rules}
- Brand「${ctx.brandName || ""}」·Region「${ctx.region || ""}」·Topic「${ctx.topic || ctx.main || ""}」each ≥5 natural mentions in channel text.
- Banned templates: ${V2_BANNED_TEMPLATE_PHRASES.slice(0, 12).join(" · ")}
- No ${CONSTITUTION_V2_AI_CLICHES.slice(0, 6).join(", ")}.
- ${RESEARCH_DEPTH_WRITING_RULES.replace(/\n/g, " ")}
- ${MASTER_ENGINE_V12_DATA_PRIORITY.replace(/\n/g, " ")}
- ${MASTER_ENGINE_V12_RULES.replace(/\n/g, " ")}
- ${MASTER_ENGINE_V17_GLOBAL_RULES.replace(/\n/g, " ")}
- ${MASTER_ENGINE_V17_INFORMATION_RULES.replace(/\n/g, " ")}
- ${MASTER_ENGINE_V17_CHANNEL_RULES[channel]?.replace(/\n/g, " ") || ""}
- ${EMOJI_ENGINE_BRIEF.replace(/\n/g, " ")}
- Internal plan only → WRITE finished ${spec.label} JSON. Never output 「구성안」, scene checklist, or bullet-only stubs.
- Brand·region·topic·promo·visit·purchase (or caption hook) must dominate the text (~90%).
- ${TOPIC_DECOMPOSITION_BRIEF.replace(/\n/g, " ")}
- 주제 입력 문장 그대로 출력 금지 — 장면·공지·캡션으로 재해석.
- ${channel === "place" ? buildSmartPlaceVoicePromptBlock().replace(/\n/g, " ") : channel === "instagram" ? buildInstagramVoicePromptBlock().replace(/\n/g, " ") : ""}
- ${channel === "place" || channel === "instagram" ? buildChannelMarketerPromptBlock(channel, ctx, ctx.input || ctx).replace(/\n/g, " ") : ""}
- ${channel === "place" || channel === "instagram" ? buildHumanityCommonSensePromptBlock().replace(/\n/g, " ") : ""}
- ${channel === "place" || channel === "instagram" ? buildEditorV95PromptBlock().replace(/\n/g, " ") : ""}
- ${channel === "place" || channel === "instagram" ? buildPersonaEnginePromptBlock(ctx.input || ctx).replace(/\n/g, " ") : ""}
- ${channel === "place" || channel === "instagram" ? buildStoryTargetEnginePromptBlock().replace(/\n/g, " ") : ""}
- ${channel === "place" || channel === "instagram" ? buildStoryTargetChannelBrief(ctx.input || ctx, channel).replace(/\n/g, " ") : ""}
- ${channel === "place" || channel === "instagram" ? (buildFurnitureExhibitionWriterBrief(ctx.input || ctx) || "").replace(/\n/g, " ") : ""}
- 주제 직접 팩트가 적어도 작성을 중단하지 말 것. 【수집 실마리】와 조사 요약 안에서만 단정. 온라인 단서 1건이라도 있으면 그걸 풀어 채널 형식으로 쓸 것.
${getV2PersonaPromptLine(ctx)}
${getSpeechStylePromptLine(ctx)}
${getProficiencyPromptLine(ctx)}
${getEvolutionPromptAddon(ctx.input || ctx)}
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
${formatSectionPlanForPrompt(ctx, ctx.input || ctx)}
${regen}
【입력】 브랜드 ${ctx.brandName} | 지역 ${ctx.region} | 주제 ${ctx.topic || ctx.main}
업종 ${ctx.industryLabel || ctx.industry || ""} | 톤 ${ctx.tone?.label || ""}
${ctx.placePostType ? `플레이스 유형: ${ctx.placePostType}` : ""}
${ctx.instaFormat ? `인스타 형식: ${ctx.instaFormat}` : ""}
${(ctx.brandContentBrief || ctx.input?.brandContentBrief || buildBrandContentPromptBlock()).slice(0, 1800)}
${(ctx.brandWikiBrief || ctx.input?.brandWikiBrief || "").slice(0, 2000)}
${buildSpeakerPurposeExplainBrief(ctx.input || ctx).slice(0, 1400)}
${buildContentDoctrinePromptBlock().slice(0, 900)}
${buildBriclogMissionPromptBlock(ctx.input || ctx).slice(0, 1200)}
${(ctx.informationUnitBrief || ctx.input?.informationUnitBrief || "").slice(0, 2000)}
${MASTER_QUALITY_EDITOR_BRIEF.slice(0, 1400)}
${(ctx.editorColumnBrief || ctx.input?.editorColumnBrief || KNOWLEDGE_EXPANSION_EDITOR_BRIEF).slice(0, 800)}
${BETA_GUARD_EDITOR_BRIEF.slice(0, 900)}
${formatEmojiEngineBrief(ctx.input || ctx, channel)}
${buildChannelMarketerPromptBlock(channel, ctx, ctx.input || ctx)}
${(ctx.perspectiveBrief || ctx.input?.perspectiveBrief || buildPerspectivePromptBlock(ctx, ctx.input || ctx)).slice(0, 1600)}
Write ${spec.jsonKey} only. JSON object, no markdown.
구성안·PLAN·체크리스트 출력 금지. 네이버/인스타에 바로 붙여넣을 완성 본문만 작성.`;
}

export function buildChannelGenerationMessages(channel, ctx = {}) {
  return [
    { role: "system", content: systemPrompt(channel, ctx) },
    { role: "user", content: userPrompt(channel, ctx) },
  ];
}
