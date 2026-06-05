/**
 * 에이스침대·파주·오피모 — 블로그·플레이스·인스타 엔진 실행 데모
 * npm run demo:ace-opimo
 */
process.env.BRICLOG_MISSION = "true";

import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback.js";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass.js";
import { applyV17PostWritePack } from "@/lib/content/v17PostProcess.js";
import { applyFurnitureExhibitionPackPolish } from "@/lib/product/furnitureExhibitionEngine.js";
import { runPlacePipeline, runInstagramPipeline } from "@/lib/contentPipeline.js";
import { getBlogFullText } from "@/utils/qualityCheck.js";
import { getChannelFullText } from "@/lib/content/channelPack.js";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils.js";
import { resolveBlogLengthTier } from "@/lib/constants.js";

const input = {
  brandName: "에이스침대",
  region: "파주",
  industry: "가구",
  topic: "오피모 전시 소식",
  mainKeyword: "파주 신혼가구 오피모",
  blogLengthTier: "short",
  v2PreWriteVerified: true,
};

const blogProxy = {
  title: "파주 신혼가구 오피모 전시",
  sections: [
    {
      heading: "쇼룸",
      body: "파주 에이스침대 쇼룸에서 오피모 프레임 전시를 봤어요. 화이트 톤 침실 무드가 신혼집에 잘 맞을 것 같았어요.",
    },
  ],
};

let blog = buildMissionProseFallbackPack(input);
blog = applyV17PostWritePack(blog, { input }, "blog");
blog = applyFurnitureExhibitionPackPolish(blog, input);
blog = applyHumanityFinishPass(blog, { input }, "blog");

const tier = resolveBlogLengthTier(input.blogLengthTier);
const blogText = getBlogFullText(blog);
const blogChars = countBlogBodyCharsWithSpaces(blog);

const place = runPlacePipeline(input, blog, "데모");
const insta = runInstagramPipeline(input, blog, "emotional", "데모");

console.log("=== BRICLOG 엔진 실행 · 에이스침대·파주·오피모 ===\n");
console.log(`【blog】 ${blogChars}자 (tier min ${tier.min}) | storyTarget: ${blog._meta?.storyTargetLabel || "신혼가구"}`);
console.log(`  title: ${blog.title}`);
console.log(`  opener: ${blogText.slice(0, 220).replace(/\n/g, " ")}…\n`);

console.log(`【smartplace】 storyEngine: ${place._meta?.channelStoryEngine || "-"}`);
console.log(`  title: ${place.title}`);
console.log(`  short: ${place.shortNotice}`);
console.log(`  detail: ${place.detailBody?.slice(0, 200)}…\n`);

console.log(`【instagram】 storyEngine: ${insta._meta?.channelStoryEngine || "-"}`);
console.log(`  hook: ${insta.hook}`);
console.log(`  body: ${(insta.lineBreakBody || insta.body || "").slice(0, 180).replace(/\n/g, " / ")}…`);
console.log(`  tags: ${(insta.hashtags || []).slice(0, 6).join(" ")}\n`);

const checks = {
  blogHaeyo: !/합니다\.|가능합니다/.test(blogText.slice(0, 800)),
  blogNoCompetitor: !/다른\s*브랜드/.test(blogText),
  blogTier: blogChars >= tier.min,
  placeScene: /쇼룸|전시|매장|방문|다녀|봤/.test(getChannelFullText(place, "place")),
  instaVoice: /해요|었어요|봤|느껴/.test(getChannelFullText(insta, "instagram")),
};
const ok = Object.values(checks).every(Boolean);
console.log("checks:", checks);
console.log(ok ? "\n✅ 데모 PASS — http://localhost:3005 에서 바로 생성 가능" : "\n⚠️ 일부 체크 미달");
process.exit(ok ? 0 : 1);
