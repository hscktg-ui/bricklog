/**
 * 전혀 다른 카테고리·스토리로 플레이스·인스타 결과 검수
 */
import { prepareBriclogPreWriteContext } from "../lib/content/briclogPreWriteContext.js";
import { postProcessLlmChannel } from "../lib/llm/postProcessLlmChannel.js";
import {
  applyPlaceMarketerPack,
  applyInstagramMarketerPack,
  detectPlaceMarketerIssues,
  detectInstagramMarketerIssues,
} from "../lib/content/channelMarketerEngine.js";
import { isMechanicalListingTitle } from "../lib/content/humanTitleEngine.js";
import { getChannelFullText } from "../lib/content/channelPack.js";
import {
  runPlacePipeline,
  runInstagramPipeline,
  buildFormBlogProxy,
} from "../lib/contentPipeline.js";

const SCENARIOS = [
  {
    label: "꽃집 · 졸업 선물",
    input: {
      brandName: "꽃집 노을",
      region: "강릉",
      topic: "졸업식 하회전 꽃다발 선물",
      industry: "꽃/플로리스트",
      contentPerspective: "storytelling",
      instaBodyLength: "medium",
    },
  },
  {
    label: "치과 · 임플란트",
    input: {
      brandName: "해운대선치과",
      region: "부산",
      topic: "임플란트 무료 상담 예약",
      industry: "의료/치과",
      contentPerspective: "informational",
      instaBodyLength: "medium",
    },
  },
  {
    label: "반려카페 · 생일파티",
    input: {
      brandName: "멍멍놀이터",
      region: "대전",
      topic: "반려견 생일파티 패키지",
      industry: "반려동물/카페",
      contentPerspective: "customer",
      instaBodyLength: "long",
    },
  },
  {
    label: "한식당 · 시즌메뉴",
    input: {
      brandName: "옛날밥상",
      region: "전주",
      topic: "겨울 한정 보양식 코스",
      industry: "음식/한식",
      contentPerspective: "brand",
      instaBodyLength: "medium",
    },
  },
  {
    label: "요가 · 신규회원",
    input: {
      brandName: "숨결요가",
      region: "제주",
      topic: "1월 신규 회원 등록 혜택",
      industry: "피트니스/요가",
      contentPerspective: "comparison",
      instaBodyLength: "short",
    },
  },
];

const BLOG_TONE_RE =
  /(이번\s*글|결론적으로|정리하면|소개해드릴|저장해두세요|알아보시다)/;

function badLlmPlace(input) {
  const { brandName, region, topic } = input;
  return {
    title: `${region} ${brandName} ${topic}`,
    shortNotice: `이번 글은 ${topic}에 답하려고 썼어요.`,
    detailBody: `결론적으로 ${region} ${brandName} ${topic}을 정리했습니다. 알아보시다 보면 도움이 됩니다.`,
  };
}

function badLlmInsta(input) {
  const { brandName, region, topic } = input;
  return {
    hook: `${region} ${brandName} ${topic}`,
    body: `이번 글에서는 ${topic}을 소개해드릴게요. 결론적으로 블로그와 같은 내용입니다. 저장해두세요.`,
    ending: "지금 바로 방문해 보세요",
    hashtags: [`#${brandName.replace(/\s/g, "")}`],
  };
}

function checkScenario(label, input, ctx) {
  const fails = [];
  const badPlace = badLlmPlace(input);
  const badInsta = badLlmInsta(input);

  const place = applyPlaceMarketerPack(badPlace, ctx, input);
  const insta = applyInstagramMarketerPack(badInsta, ctx, input);
  const placeProc = postProcessLlmChannel("place", badPlace, ctx, input);
  const instaProc = postProcessLlmChannel("instagram", badInsta, ctx, input);

  const placeIssues = detectPlaceMarketerIssues(place, ctx, input);
  const instaIssues = detectInstagramMarketerIssues(insta, ctx, input);

  if (isMechanicalListingTitle(place.title, ctx, input)) {
    fails.push("place mechanical title");
  }
  if (BLOG_TONE_RE.test(getChannelFullText(place, "place"))) {
    fails.push("place blog tone");
  }
  if (isMechanicalListingTitle(insta.hook, ctx, input)) {
    fails.push("insta mechanical hook");
  }
  const instaFull = getChannelFullText(insta, "instagram");
  if (BLOG_TONE_RE.test(instaFull)) {
    fails.push("insta blog tone");
  }
  if (/[0-9월][^\s]{0,2}(를|가)\s*(찾|알)/.test(insta.lineBreakBody || insta.body || "")) {
    fails.push("insta broken particle");
  }
  if (!placeIssues.ok) fails.push(`place issues: ${placeIssues.issues.map((i) => i.type).join(",")}`);
  if (!instaIssues.ok) fails.push(`insta issues: ${instaIssues.issues.map((i) => i.type).join(",")}`);

  const proxy = buildFormBlogProxy(input);
  const templatePlace = runPlacePipeline(input, proxy);
  const templateInsta = runInstagramPipeline(input, proxy, "emotional");

  if (/체험\s*가능\s*모델|설치\/배송/.test(getChannelFullText(templatePlace, "place") || "")) {
    fails.push("template furniture leak");
  }

  return {
    label,
    industry: input.industry,
    perspective: input.contentPerspective,
    fails,
    llm: {
      place: {
        title: place.title,
        shortNotice: place.shortNotice,
        detailBody: place.detailBody,
        passOutput: placeProc?.passOutput,
      },
      insta: {
        hook: insta.hook,
        lineBreakBody: (insta.lineBreakBody || "").slice(0, 280),
        ending: insta.ending,
        hashtags: (insta.hashtags || []).slice(0, 8),
        passOutput: instaProc?.passOutput,
      },
    },
    template: {
      place: {
        title: templatePlace?.title,
        shortNotice: templatePlace?.shortNotice,
        detailBody: (templatePlace?.detailBody || "").slice(0, 200),
      },
      insta: {
        hook: templateInsta?.hook,
        lineBreakBody: (templateInsta?.lineBreakBody || "").slice(0, 280),
        hashtags: (templateInsta?.hashtags || []).slice(0, 8),
      },
    },
  };
}

let totalFails = 0;

for (const scenario of SCENARIOS) {
  const ctx = {
    brandName: scenario.input.brandName,
    region: scenario.input.region,
    input: scenario.input,
  };
  const preWrite = prepareBriclogPreWriteContext(scenario.input);
  Object.assign(ctx, preWrite);
  const input = { ...scenario.input, ...preWrite };

  const result = checkScenario(scenario.label, input, ctx);
  console.log("\n" + "=".repeat(60));
  console.log(`【${result.label}】 ${result.industry} · 관점: ${result.perspective}`);
  if (result.fails.length) {
    totalFails += result.fails.length;
    console.log("FAIL:", result.fails.join(" | "));
  } else {
    console.log("CHECK: OK (마케터 게이트 통과)");
  }

  console.log("\n— LLM 보정 후 (마케터 엔진) —");
  console.log("[플레이스]");
  console.log("  제목:", result.llm.place.title);
  console.log("  공지:", result.llm.place.shortNotice);
  console.log("  상세:", result.llm.place.detailBody);
  console.log("[인스타]");
  console.log("  hook:", result.llm.insta.hook);
  console.log("  본문:\n", result.llm.insta.lineBreakBody);
  console.log("  ending:", result.llm.insta.ending);
  console.log("  tags:", result.llm.insta.hashtags.join(" "));

  console.log("\n— 템플릿 파생 (블로그 없이) —");
  console.log("[플레이스]");
  console.log("  제목:", result.template.place.title);
  console.log("  공지:", result.template.place.shortNotice);
  console.log("  상세:", result.template.place.detailBody);
  console.log("[인스타]");
  console.log("  hook:", result.template.insta.hook);
  console.log("  본문:\n", result.template.insta.lineBreakBody);
  console.log("  tags:", result.template.insta.hashtags?.join(" ") || "");
}

console.log("\n" + "=".repeat(60));
if (totalFails) {
  console.error(`TOTAL FAILS: ${totalFails}`);
  process.exit(1);
}
console.log(`ALL ${SCENARIOS.length} SCENARIOS OK`);
