/**
 * 에디터 반복 제거·작가 분량 보강 회귀
 */
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback.js";
import {
  applyEditorDuplicateSweep,
  detectDuplicateKillerIssues,
} from "@/lib/content/duplicateKillerEngine.js";
import {
  applyEditorWriterDeliveryPass,
} from "@/lib/product/editorWriterDeliveryPass.js";
import { getBlogFullText } from "@/utils/qualityCheck.js";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils.js";

const INPUT = {
  brandName: "티카페",
  region: "강남",
  topic: "시즌 디저트 추천",
  mainKeyword: "시즌 디저트 추천",
  industry: "카페",
  blogLengthTier: "short",
  v4Speaker: "plain_review",
};

let pack = buildMissionProseFallbackPack(INPUT);
pack = {
  ...pack,
  sections: [
    {
      heading: "시즌 디저트, 알아보게 된 이유",
      body: "강남 티카페 시즌 디저트를 찾다가 매장 분위기부터 봤어요.\n\n강남 티카페 시즌 디저트를 찾다가 매장 분위기부터 봤어요.\n\n디저트 진열대를 천천히 봤어요.",
    },
    {
      heading: "직접 맛본 뒤 정리",
      body: "크림 톤이 부담 없어서 오후에 앉기 좋았어요.\n\n크림 톤이 부담 없어서 오후에 앉기 좋았어요.",
    },
  ],
  conclusion: "강남 티카페 시즌 디저트를 찾다가 매장 분위기부터 봤어요.",
  _meta: { missionProseFallback: true },
};

const beforeDup = detectDuplicateKillerIssues(getBlogFullText(pack));
if (beforeDup.ok) {
  throw new Error("expected duplicate issues before sweep");
}

pack = applyEditorDuplicateSweep(pack, { input: INPUT }, "blog");
const afterSweep = detectDuplicateKillerIssues(getBlogFullText(pack));
const repeatIssues = (afterSweep.issues || []).filter(
  (i) => i.type === "same_info_repeat" || i.type === "duplicate_paragraph"
);
if (repeatIssues.length > 0) {
  throw new Error(
    `duplicate sweep left repeats: ${JSON.stringify(repeatIssues.slice(0, 3))}`
  );
}

const beforeChars = countBlogBodyCharsWithSpaces(pack);
pack = applyEditorWriterDeliveryPass(pack, INPUT);
const afterChars = countBlogBodyCharsWithSpaces(pack);

if (afterChars < beforeChars) {
  throw new Error(`length shrank after writer pass: ${beforeChars} -> ${afterChars}`);
}

if (!pack._meta?.editorWriterLengthPass) {
  throw new Error("missing editorWriterLengthPass meta");
}

console.log("OK: editor-writer-delivery-pass", {
  beforeChars,
  afterChars,
  dupOk: pack._meta?.editorDuplicateOk ?? pack._meta?.editorWriterLengthDupOk,
  lengthMet: pack._meta?.editorWriterLengthMet,
});
