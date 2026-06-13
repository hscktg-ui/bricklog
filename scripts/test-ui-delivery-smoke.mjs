/**
 * UI 배달 경로 스모크 — 로컬 fallback + 채널 파생 + tier 메타
 */
import { prepareBriclogPreWriteContext } from "../lib/content/briclogPreWriteContext.js";
import { enrichMinimalBlogInput } from "../lib/llm/blogDeliveryFallback.js";
import { forceLocalBlogPreviewDelivery } from "../lib/generation/ensureBlogDelivery.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { resolveBlogLengthTier } from "../lib/constants.js";
import {
  runPlacePipeline,
  runInstagramPipeline,
  buildFormBlogProxy,
} from "../lib/contentPipeline.js";
import { getChannelFullText } from "../lib/content/channelPack.js";

const CASES = [
  {
    label: "꽃집·short",
    input: {
      brandName: "꽃집 노을",
      region: "강릉",
      topic: "졸업식 하회전 꽃다발 선물",
      industry: "꽃/플로리스트",
      blogLengthTier: "short",
      contentPerspective: "storytelling",
    },
  },
  {
    label: "치과·medium",
    input: {
      brandName: "해운대선치과",
      region: "부산",
      topic: "임플란트 무료 상담 예약",
      industry: "의료/치과",
      blogLengthTier: "medium",
      contentPerspective: "informational",
    },
  },
  {
    label: "요가·long",
    input: {
      brandName: "숨결요가",
      region: "제주",
      topic: "1월 신규 회원 등록 혜택",
      industry: "피트니스/요가",
      blogLengthTier: "long",
      contentPerspective: "comparison",
    },
  },
];

/** draft fallback — tier별 로컬 rescue 현실치 */
function draftFallbackMinChars(tierKey, tier) {
  if (tierKey === "long") return Math.max(800, Math.round(tier.min * 0.22));
  if (tierKey === "medium") return Math.max(400, Math.round(tier.min * 0.36));
  return Math.max(400, Math.round(tier.min * 0.55));
}

let fails = 0;

console.log("\n=== UI 배달 경로 스모크 (local fallback) ===\n");

for (const c of CASES) {
  const preWrite = prepareBriclogPreWriteContext(c.input);
  const input = enrichMinimalBlogInput({
    ...c.input,
    ...preWrite,
    v2PreWriteVerified: true,
    knowledgeExpansionReady: true,
    researchFacts: [
      { fact: `${c.input.region} ${c.input.topic}`, source: "research" },
      { fact: `${c.input.brandName} 예약·상담`, source: "research" },
    ],
  });
  const tier = resolveBlogLengthTier(input.blogLengthTier);
  const delivered = forceLocalBlogPreviewDelivery(input);
  const blog = delivered?.blogContent;
  const chars = countBlogBodyCharsWithSpaces(blog);
  const metaTier = blog?._meta?.blogLengthTier;
  const metaChars = blog?._meta?.charCount ?? blog?._meta?.blogCharCount;
  const softMin = draftFallbackMinChars(input.blogLengthTier, tier);

  const proxy = buildFormBlogProxy(input);
  const place = runPlacePipeline(input, proxy);
  const insta = runInstagramPipeline(input, proxy, "emotional");

  const issues = [];
  if (!blog?.sections?.length) issues.push("no blog sections");
  if ((blog?.sections?.length || 0) < 2) issues.push("sections under 2");
  if (chars < softMin) {
    issues.push(`length ${chars} under draft min ${softMin} (tier ${tier.min})`);
  }
  if (metaTier && metaTier !== input.blogLengthTier) issues.push(`meta tier ${metaTier}`);
  if (metaChars != null && Math.abs(metaChars - chars) > 30) {
    issues.push(`meta chars ${metaChars} vs ${chars}`);
  }
  if (/매트리스|모션\s*베드|설치\/배송/.test(getChannelFullText(place, "place"))) {
    issues.push("place furniture leak");
  }
  if (/봄\s*(운영|관련)\s*안내/.test(place?.title || "") && !/봄/.test(input.topic || "")) {
    issues.push(`generic place title: ${place.title}`);
  }
  if (input.brandName && place?.title && !String(place.title).includes(input.brandName)) {
    issues.push(`place title missing brand: ${place.title}`);
  }

  const ok = issues.length === 0;
  if (!ok) fails += 1;
  console.log(`【${c.label}】 ${ok ? "OK" : "FAIL: " + issues.join("; ")}`);
  console.log(
    `  blog: ${chars}자 (draft≥${softMin}, tier ${tier.min}~${tier.max}) meta=${metaChars} tier=${metaTier || input.blogLengthTier}`
  );
  console.log(`  place: ${(place?.title || "").slice(0, 40)}`);
  console.log(`  insta: ${(insta?.hook || "").slice(0, 40)}`);
}

if (fails) {
  console.error(`\nFAILURES: ${fails}`);
  process.exit(1);
}
console.log("\nALL UI SMOKE CASES OK");
