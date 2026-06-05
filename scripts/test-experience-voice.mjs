/**
 * 경험형 말투 학습 프로필 + 생성 파이프라인 검증
 */
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { applyV17PostWritePack } from "../lib/content/v17PostProcess.js";
import {
  loadExperienceVoiceProfile,
  scoreExperienceVoice,
  buildExperienceVoicePromptBlock,
} from "../lib/content/experienceVoiceProfile.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

const INPUT = {
  brandName: "에이스침대",
  region: "파주",
  topic: "오피모 전시 소식",
  mainKeyword: "오피모 전시 소식",
  industry: "가구/침대",
  blogLengthTier: "medium",
  researchFacts: [{ fact: "파주 매장 예약·상담 가능" }],
};

const profile = loadExperienceVoiceProfile();
const pack = applyV17PostWritePack(
  buildMissionProseFallbackPack(INPUT),
  { input: INPUT, ...INPUT },
  "blog"
);
const full = getBlogFullText(pack);
const voice = scoreExperienceVoice(full);
const prompt = buildExperienceVoicePromptBlock();

console.log("=== experience voice ===");
console.log("learned samples:", profile.sampleCount);
console.log("rates:", profile.rates || {});
console.log("voice score:", voice.score, voice.ok, "hits:", voice.hits);
console.log("prompt has real examples:", /네이버 표본|실제 상위글/.test(prompt));
console.log("profile examples:", (profile.promptExamples || []).length);

if (profile.sampleCount < 30) {
  console.warn("WARN: run npm run learn:experience-voice after learn:naver-blog");
}
if (!voice.ok) process.exitCode = 1;

console.log("\n--- learned prompt excerpt ---");
console.log(prompt.split("\n").slice(0, 8).join("\n"));

console.log("\n--- voice lines in output ---");
full
  .split(/(?<=[.!?])\s+/)
  .filter((s) => /그렇|고민|다행|미리|너무 좋|갔는데/.test(s))
  .slice(0, 6)
  .forEach((s) => console.log("-", s.trim()));
