/**
 * place · instagram — 채널별 에디터 송출 (중복 제거·발행 구조) 회귀
 */
import {
  applyEditorDuplicateSweep,
  detectDuplicateKillerIssues,
  stripChannelCrossFieldDuplicates,
} from "@/lib/content/duplicateKillerEngine.js";
import { applyChannelEditorWriterDeliveryPass } from "@/lib/product/editorWriterDeliveryPass.js";
import { finishChannelPackForDelivery } from "@/lib/product/channelQualityStack.js";
import { getChannelFullText } from "@/lib/content/channelPack.js";

process.env.BRICLOG_MISSION = "true";

const INPUT = {
  brandName: "다온티하우스",
  region: "경주",
  topic: "가을 시즌 티 메뉴",
  mainKeyword: "가을 시즌 티 메뉴",
  industry: "티카페",
  researchFacts: [
    { fact: "가을 시즌 밤차·사과차·보이차", source: "research" },
    { fact: "창가 단독석·2~4인 테이블", source: "research" },
  ],
};

let placePack = {
  title: "다온티하우스 가을 시즌 티 메뉴",
  shortNotice: "경주 다온티하우스 가을 시즌 티 메뉴를 안내드립니다.",
  detailBody:
    "경주 다온티하우스 가을 시즌 티 메뉴를 안내드립니다.\n\n· 밤차·사과차·보이차를 준비했습니다.\n\n경주 다온티하우스 가을 시즌 티 메뉴를 안내드립니다.",
};

const placeBefore = getChannelFullText(placePack, "place");
const placeDupBefore = detectDuplicateKillerIssues(placeBefore);
if (placeDupBefore.ok) {
  throw new Error("expected place duplicate issues before sweep");
}

placePack = stripChannelCrossFieldDuplicates(placePack, "place");
placePack = applyEditorDuplicateSweep(placePack, { input: INPUT }, "place");
const placeDupAfter = detectDuplicateKillerIssues(getChannelFullText(placePack, "place"));
if (!placeDupAfter.ok && placeDupAfter.issues.length > placeDupBefore.issues.length) {
  throw new Error(`place duplicate sweep worsened: ${JSON.stringify(placeDupAfter.issues.slice(0, 2))}`);
}

placePack = applyChannelEditorWriterDeliveryPass(placePack, "place", INPUT);
if (!placePack._meta?.channelEditorWriterPass) {
  throw new Error("missing channelEditorWriterPass for place");
}
if (!String(placePack.cta || "").trim()) {
  throw new Error("place missing cta after channel editor pass");
}
if (!String(placePack.shortNotice || "").trim()) {
  throw new Error("place missing shortNotice after channel editor pass");
}

let instaPack = {
  hook: "경주 다온티하우스 가을 티 ☕",
  body: "경주 다온티하우스 가을 티 ☕\n\n창가 자리에서 천천히.\n\n창가 자리에서 천천히.",
  ending: "프로필 링크에서 더 보기",
  hashtags: ["#경주카페"],
};

instaPack = applyChannelEditorWriterDeliveryPass(instaPack, "instagram", INPUT);
if (!instaPack._meta?.channelEditorWriterPass) {
  throw new Error("missing channelEditorWriterPass for instagram");
}
const instaLines = String(instaPack.lineBreakBody || instaPack.body || "")
  .split(/\n+/)
  .filter((l) => l.trim() && !/^#\S+/.test(l.trim())).length;
if (instaLines < 2) {
  throw new Error(`instagram line breaks thin: ${instaLines}`);
}
const tagCount = (getChannelFullText(instaPack, "instagram").match(/#\S+/g) || []).length;
if (tagCount < 4) {
  throw new Error(`instagram hashtags thin: ${tagCount}`);
}

const finished = finishChannelPackForDelivery("place", placePack, { input: INPUT });
const expert = finished._meta?.placeExpertPanel;
if (!finished._meta?.channelPackFinished) {
  throw new Error("finishChannelPackForDelivery missing channelPackFinished");
}

console.log("OK: channel-editor-writer-delivery", {
  placeDupOk: placePack._meta?.editorDuplicateOk,
  placeCta: Boolean(finished.cta),
  placeExpertScore: expert?.score,
  instaLines,
  instaTags: tagCount,
  channelEditorWriter: finished._meta?.channelEditorWriterPass,
});
