/**
 * Evolution architecture — 유저별 개인화 vs 전역 엔진 학습 경로 검증 (코드·구조)
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

// 1) 피드백 제출 → DB 저장 → 브랜드 프로필 재계산
const submitRoute = read("app/api/feedback/submit/route.js");
assert.match(submitRoute, /upsertContentFeedback/);
assert.match(submitRoute, /recomputeBrandLearningProfile/);
assert.match(submitRoute, /refreshPersonalizationAfterContent/);

// 2) 개인화는 프롬프트 주입 (유저·브랜드별)
const brandProfile = read("lib/feedback/brandLearningProfile.js");
assert.match(brandProfile, /brand_learning_profiles/);
assert.match(brandProfile, /user_id/);

const memoryBrief = read("lib/memory/personalizationBrief.js");
assert.match(memoryBrief, /loadPersonalizationLayers/);
assert.match(memoryBrief, /getBrandLearningBrief/);
assert.match(memoryBrief, /getUserWritingProfile/);

const blogPrompt = read("lib/llm/buildBlogPrompt.js");
assert.match(blogPrompt, /buildBrandMemoryUserSection/);

const channelPrompt = read("lib/llm/buildChannelPrompt.js");
assert.match(channelPrompt, /buildBrandMemoryUserSection/);
assert.match(channelPrompt, /buildStoryTargetChannelBrief/);

// 3) 전역 인사이트 — 자동 엔진 반영 없음 (관리자 승인 대기)
const globalInsights = read("lib/feedback/globalInsights.js");
assert.match(globalInsights, /autoApply:\s*false/);
assert.match(globalInsights, /global_quality_insights/);
assert.match(globalInsights, /applyInsightToEvolutionRules/);
assert.match(globalInsights, /status:\s*"pending"/);

const approveRoute = read("app/api/admin/insights/approve/route.js");
assert.match(approveRoute, /approveInsight/);
assert.match(read("lib/feedback/globalInsights.js"), /export async function approveInsight/);

// 4) 로컬-only 피드백 스토어는 서버 경로와 분리
const feedbackStore = read("lib/learning/feedbackStore.js");
assert.match(feedbackStore, /localStorage/);

// 5) 채널도 동일 스토리·미션 엔진 SSOT 경유
const channelStory = read("lib/content/channelStoryEngine.js");
assert.match(channelStory, /applyChannelStoryGate/);
assert.match(channelStory, /applyHaeyoConsistencyToChannelPack/);

const channelStack = read("lib/product/channelQualityStack.js");
assert.match(channelStack, /applyChannelStoryGate/);

const rewritePolish = read("lib/content/channelRewritePolish.js");
assert.match(rewritePolish, /polishChannelPackAfterPipeline/);

const contentCtx = read("context/ContentContext.jsx");
assert.match(contentCtx, /polishChannelPackAfterPipeline/);

const postChannel = read("lib/llm/postProcessLlmChannel.js");
assert.match(postChannel, /applyChannelStoryGate/);

console.log("OK: evolution architecture");
console.log("  per-user: feedback → brand_learning_profiles → prompt injection");
console.log("  global: pending insights → admin approve → evolution-lab rules files");
console.log("  channel: story gate wired in pipeline + LLM post-process + delivery");
