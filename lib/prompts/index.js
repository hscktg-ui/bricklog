/**
 * BRICLOG Prompt Engine — public API
 * Matrix(업종×목적×톤) + Channel(블로그·플레이스·인스타·해시태그·이미지)
 */

export {
  BUSINESS_TYPE_OPTIONS,
  INDUSTRY_BY_TYPE,
  getIndustriesForType,
  getDefaultIndustry,
  findIndustryEntry,
  resolveBusinessProfile,
  inferMatrixFromLegacy,
  resolveIndustryKey,
} from "./businessTypes";

export {
  PURPOSE_OPTIONS,
  PURPOSE_TO_ARTICLE,
  getPurposeModifier,
  getArticleTypeKeyFromPurpose,
} from "./purposes";

export { TONE_OPTIONS, getToneModifier } from "./tones";

export {
  CHANNEL_SPECS,
  channelBuilders,
  buildChannel,
  buildAllChannels,
} from "./channels";

export {
  getOpenAIResponseSchema,
  getOpenAISystemPrompt,
} from "./openaiSchema";

export { parseOpenAIJson, validateContentPack } from "./parseResponse";

/** @deprecated 레거시 업종 모듈 */
export { PROMPT_REGISTRY, INDUSTRY_OPTIONS, getPromptModule } from "./legacyRegistry";
