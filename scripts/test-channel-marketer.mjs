/**
 * 스마트플레이스·인스타 — 전문 마케터/인플루언서 관점 검수
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

const input = {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드 특별할인",
  industry: "가구/침대",
  contentPerspective: "review",
  blogLengthTier: "medium",
};

const ctx = { brandName: "템퍼", region: "평택", input };
const preWrite = prepareBriclogPreWriteContext(input);
Object.assign(ctx, preWrite);
Object.assign(input, preWrite);

const badPlace = {
  title: "평택 템퍼 모션베드 특별할인",
  shortNotice: "이번 글은 모션베드 특별할인에 답하려고 썼어요.",
  detailBody: "결론적으로 평택 템퍼 모션베드 특별할인을 정리했습니다. 알아보시다 보면 도움이 됩니다.",
};

const badInsta = {
  hook: "평택 템퍼 모션베드 특별할인",
  body: "이번 글에서는 모션베드 특별할인을 소개해드릴게요. 결론적으로 정리하면 블로그에서 봤던 내용과 같습니다. 저장해두세요.",
  ending: "지금 바로 방문해 보세요",
  hashtags: ["#템퍼"],
};

const placeFixed = applyPlaceMarketerPack(badPlace, ctx, input);
const placeIssues = detectPlaceMarketerIssues(placeFixed, ctx, input);
if (isMechanicalListingTitle(placeFixed.title, ctx, input)) {
  console.error("FAIL: place title still mechanical", placeFixed.title);
  process.exit(1);
}
if (/다녀온|체험\s*전|알아둘\s*것/.test(placeFixed.title)) {
  console.error("FAIL: place title still blog-style", placeFixed.title);
  process.exit(1);
}
if (/이번\s*글|결론적으로|알아보시다/.test(getChannelFullText(placeFixed, "place"))) {
  console.error("FAIL: place blog tone remained");
  process.exit(1);
}
if (placeFixed.detailBody.replace(/\s/g, "").length < 100) {
  console.error("FAIL: place detail too thin");
  process.exit(1);
}

const instaFixed = applyInstagramMarketerPack(badInsta, ctx, input);
const instaIssues = detectInstagramMarketerIssues(instaFixed, ctx, input);
const instaFull = getChannelFullText(instaFixed, "instagram");
if (/소개해드릴|저장해두세요|결론적으로/.test(instaFull)) {
  console.error("FAIL: insta banned/blog tone remained", instaFull.slice(0, 120));
  process.exit(1);
}
if (!instaFixed.hook || instaFixed.hook.length < 8) {
  console.error("FAIL: insta hook missing");
  process.exit(1);
}
if (isMechanicalListingTitle(instaFixed.hook, ctx, input)) {
  console.error("FAIL: insta hook still mechanical", instaFixed.hook);
  process.exit(1);
}
const lines = (instaFixed.lineBreakBody || "").split(/\n+/).filter(Boolean);
if (lines.length < 3) {
  console.error("FAIL: insta line breaks thin", lines.length);
  process.exit(1);
}

const placeProcessed = postProcessLlmChannel("place", badPlace, ctx, input);
if (!placeProcessed?.pack?.title) {
  console.error("FAIL: place postProcess null");
  process.exit(1);
}

const instaProcessed = postProcessLlmChannel("instagram", badInsta, ctx, input);
if (!instaProcessed?.pack?.hook) {
  console.error("FAIL: insta postProcess null");
  process.exit(1);
}

for (const perspective of ["brand", "review", "comparison"]) {
  const pInput = { ...input, contentPerspective: perspective };
  const pPlace = applyPlaceMarketerPack(badPlace, ctx, pInput);
  const pInsta = applyInstagramMarketerPack(badInsta, ctx, pInput);
  if (pPlace.title === pInsta.hook) {
    console.error("FAIL: perspective should differ", perspective);
    process.exit(1);
  }
}

console.log("OK: place title=", placeFixed.title);
console.log("OK: place detail chars=", placeFixed.detailBody.replace(/\s/g, "").length);
console.log("OK: insta hook=", instaFixed.hook);
console.log("OK: insta lines=", lines.length);
console.log("OK: place issues after fix=", placeIssues.issues.length);
console.log("OK: insta issues after fix=", instaIssues.issues.length);
