/**
 * 4 페르소나 — 가입·회원·채널 유기 활동 + Brand Memory 프롬프트 검증
 * Run: npm run test:brand-memory-journey
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  VIRTUAL_USERS,
  simulateLayersForVirtualUser,
} from "../lib/persona/virtualUsers.js";
import { validateSignupProfilePayload } from "../lib/auth/signupProfile.js";
import { completeChannelOnboarding } from "../lib/user/userPreferences.js";
import { applyPersonalizationToContext } from "../lib/llm/personalizationPrompt.js";
import { buildBrandMemoryUserSection, MEMORY_LABELS } from "../lib/memory/brandMemoryBundle.js";
import { buildBlogUserPrompt } from "../lib/llm/buildBlogPrompt.js";
import { createPromptContext } from "../utils/promptBuilder.js";
import { prepareUltimateBlogContext } from "../lib/ultimate/runUltimateEngine.js";
import {
  buildFormBlogProxy,
  buildBaseContentLabel,
  normalizePipelineInput,
  runPlacePipeline,
  runInstagramPipeline,
  runImagePipeline,
} from "../lib/contentPipeline.js";
import { applyChannelFeedbackPatch } from "../lib/content/blogDerive.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function personaInputFromVirtual(vu) {
  return normalizePipelineInput({
    brandName: vu.brand.brandName,
    region: vu.brand.region,
    industry: vu.brand.industry,
    topic: `${vu.brand.brandName} 시즌 소식`,
    mainKeyword: vu.brand.mainKeyword || vu.brand.brandName,
    tone: vu.brand.tone,
    excludePhrases: vu.brand.excludePhrases || vu.brand.forbiddenWords,
    includePhrases: vu.brand.includePhrases,
    speechStyle: vu.brand.speechStyle,
    sensitiveCategory: vu.brand.sensitiveCategory,
    v4Speaker: vu.profile.primaryUseCase === "instagram" ? "plain_review" : "brand_intro",
  });
}

function simulateSignup(vu) {
  const nick = vu.profile.nickname || "테스트";
  const validated = validateSignupProfilePayload({
    nickname: nick,
    fullName: nick,
    preferredTitle: vu.profile.preferredTitle || "디렉터님",
    customTitle: vu.profile.customTitle || "",
  });
  assert(validated.ok, `${vu.id} signup validation`);
  const prefs = completeChannelOnboarding(vu.id, vu.profile.primaryUseCase === "instagram" ? "insta" : vu.profile.primaryUseCase === "place" ? "place" : "blog");
  assert(prefs.onboardingComplete, `${vu.id} onboarding`);
  return { signup: "ok", primaryChannel: prefs.primaryChannel };
}

function simulateChannelActivity(vu, input, layers) {
  const blog = buildFormBlogProxy(input);
  const label = buildBaseContentLabel(input, blog);
  let place = runPlacePipeline(input, blog, label);
  let insta = runInstagramPipeline(input, blog, input.tone || "emotional", label);
  const image = runImagePipeline(input, blog, label);

  const fb = vu.profile.primaryUseCase === "place" ? "플레이스는 더 짧고 담백하게" : "인스타는 이모지 조금만";
  const patched = applyChannelFeedbackPatch({ ...input }, fb, "place");
  place = runPlacePipeline(patched, blog, label);

  const ctx = createPromptContext({
    ...input,
    brandMemory: vu.brand,
    userWritingBrief: layers.userBrief,
    brandHabitsBrief: layers.brandBrief,
    brandFeedbackBrief: layers.feedbackBrief,
    styleContinuityBrief: layers.styleContinuityBrief,
    combinedPersonalizationAddon: layers.combinedPromptAddon,
    personalizationAddon: layers.combinedPromptAddon,
  });
  const prep = prepareUltimateBlogContext({ ...ctx, ...input });
  assert(prep.ok, `${vu.id} ultimate prep`);

  const enriched = applyPersonalizationToContext(
    { ...ctx, ...prep.enriched },
    layers
  );
  const blogPrompt = buildBlogUserPrompt(enriched);
  const memIdx = blogPrompt.indexOf(MEMORY_LABELS.user);
  const inputIdx = blogPrompt.indexOf("【이번 입력");
  assert(memIdx >= 0 && inputIdx > memIdx, `${vu.id} memory before input`);
  assert(blogPrompt.includes(MEMORY_LABELS.brand), `${vu.id} brand memory`);
  assert(
    blogPrompt.includes(MEMORY_LABELS.content) || blogPrompt.includes("학습"),
    `${vu.id} content memory`
  );

  const memorySection = buildBrandMemoryUserSection(enriched);
  assert(memorySection.includes(MEMORY_LABELS.user), `${vu.id} memory section`);

  return {
    channels: {
      blog: Boolean(blog?.sections?.length || blog?.title),
      place: Boolean(place?.title || place?.shortNotice),
      insta: Boolean(insta?.body || insta?.lineBreakBody),
      image: Boolean(image?.thumbnailPrompt || image?.fullCopyText),
    },
    promptOrder: memIdx < inputIdx,
    forbiddenInBrand: layers.brandBrief.includes("금지") || layers.brandBrief.includes("완치") || layers.brandBrief.length > 5,
  };
}

const report = [];

for (const vu of VIRTUAL_USERS) {
  const row = {
    id: vu.id,
    label: vu.label,
    steps: [],
    pass: true,
    error: null,
  };
  try {
    row.steps.push(simulateSignup(vu));
    const layers = simulateLayersForVirtualUser(vu);
    assert(layers.combinedPromptAddon.includes(MEMORY_LABELS.user), "USER MEMORY label");
    assert(layers.combinedPromptAddon.includes(MEMORY_LABELS.brand), "BRAND MEMORY label");
    row.steps.push({ memoryLayers: ["user", "brand", "content"] });

    const input = personaInputFromVirtual(vu);
    const activity = simulateChannelActivity(vu, input, layers);
    row.steps.push(activity);
    assert(Object.values(activity.channels).every(Boolean), "all 4 channels produce output");
    row.steps.push({ promptOrder: activity.promptOrder });
  } catch (e) {
    row.pass = false;
    row.error = e.message;
  }
  report.push(row);
}

const passed = report.filter((r) => r.pass).length;
mkdirSync(join(root, "config", "persona-journey"), { recursive: true });
writeFileSync(
  join(root, "config", "persona-journey", "brand-memory-four-journey.json"),
  JSON.stringify({ passed, total: report.length, report }, null, 2),
  "utf8"
);

console.log("=== Brand Memory · 4 페르소나 여정 ===\n");
for (const r of report) {
  console.log(`${r.pass ? "✓" : "✗"} ${r.label}`);
  if (r.error) console.log(`  ${r.error}`);
  else console.log(`  단계: ${r.steps.length}`);
}
console.log(`\n통과 ${passed}/${report.length}`);
assert(passed === VIRTUAL_USERS.length, "all personas must pass");
console.log("\nOK — 가입→회원→4채널→USER/BRAND/CONTENT→입력 순서");
