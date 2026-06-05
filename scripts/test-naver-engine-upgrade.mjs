/**
 * 1만 건 네이버 학습 → 엔진 규칙 스모크 테스트 (v17 파이프라인)
 */
import { applyV17PostWritePack } from "../lib/content/v17PostProcess.js";
import { buildHumanClickTitles } from "../lib/content/humanTitleEngine.js";
import { scoreChecklistVoice } from "../lib/product/checklistVoiceEngine.js";
import { scoreHumanBelief } from "../lib/product/humanBeliefEngine.js";
import {
  buildNaverLearnedTitleCandidates,
  getNaverCategoryTargets,
  polishNaverBlogVoice,
  resolveNaverLearnCategory,
  scoreNaverVoiceDensity,
} from "../lib/channel/naverBlogEngineRules.js";
import { buildNaverBlogChannelPromptBlock } from "../lib/channel/naverBlogChannelProfile.server.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

const ctx = {
  brandName: "에이스침대",
  region: "파주",
  topic: "오피모 전시 소식",
  industry: "가구/침대",
  v2PreWriteVerified: true,
  knowledgeExpansionReady: true,
};

const polluted = {
  title: "파주 에이스침대 오피모 전시 소식를 체험 전 알아둘 것",
  sections: [
    {
      heading: "방문·예약 안내",
      body:
        "방문·예약 안내 기준으로 확인하세요. 체크리스트로 삼으면 좋습니다. 해당 브랜드는 공식·매장 안내 기준입니다.",
    },
    {
      heading: "전시 정보",
      body: "오피모 전시 소식를 검색하시는 분들께 권합니다.",
    },
    {
      heading: "파주 에이스침대",
      body: "파주 매장 주차·대중교통·영업 시간·휴무일을 방문 전에 확인하세요.",
    },
  ],
  conclusion: "방문·예약 안내를 참고하시길 권합니다.",
};

const improved = applyV17PostWritePack(polluted, { input: ctx, ...ctx }, "blog");
const text = getBlogFullText(improved);
const belief = scoreHumanBelief(text, ctx, improved);
const checklist = scoreChecklistVoice(text, improved);
const titles = buildHumanClickTitles(ctx, ctx).slice(0, 3);
const learnedTitles = buildNaverLearnedTitleCandidates(ctx);
const targets = getNaverCategoryTargets(ctx.industry);
const cat = resolveNaverLearnCategory(ctx.industry);
const title = improved.title || improved.representativeTitle || "";

const checks = [
  ["category", cat === "가구점"],
  ["voice target", targets.voiceRate >= 50],
  ["no 방문·예약 안내 placeholder", !/방문·예약\s*안내/.test(text)],
  ["no 소식를", !/소식를/.test(title)],
  ["no 확인하세요 flood", !/확인하세요/.test(text)],
  ["voice density", scoreNaverVoiceDensity(text) >= 2],
  ["belief ok", belief.ok],
  ["checklist ok", checklist.ok],
  ["learned title shape", learnedTitles.some((t) => /솔직|후기|다녀/.test(t))],
  ["prompt block", buildNaverBlogChannelPromptBlock(ctx).includes("구어체")],
  ["polish", /했어요|추천드려요/.test(polishNaverBlogVoice("확인하세요."))],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} · ${name}`);
  if (!ok) failed += 1;
}

console.log("\n=== titles ===");
console.log(titles.join("\n"));
console.log("\n=== body head ===");
console.log(text.slice(0, 420));
console.log(`\nbelief=${belief.score} checklist=${checklist.ok}`);

process.exit(failed ? 1 : 0);
