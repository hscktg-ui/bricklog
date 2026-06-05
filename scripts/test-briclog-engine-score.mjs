/**
 * BRICLOG Engine Score smoke test
 */
import { applyV17PostWritePack } from "../lib/content/v17PostProcess.js";
import { scoreBriclogEngine, BRICLOG_ENGINE_PASS } from "../lib/product/briclogEngineScore.js";
import { buildNaverEnginePromptAddon, buildNaverVoiceProfileBlock } from "../lib/channel/naverBlogEngineRules.js";
import { buildBrandSubenginePromptBlock } from "../lib/product/brandSubengine.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

const ctx = {
  brandName: "에이스침대",
  region: "파주",
  topic: "오피모 전시 소식",
  industry: "가구/침대",
};

const pack = applyV17PostWritePack(
  {
    title: "파주 에이스침대 체험 전 알아둘 것",
    sections: [
      {
        heading: "방문·예약 안내",
        body: "방문·예약 안내 기준으로 확인하세요. 체크리스트로 삼으면 좋습니다.",
      },
      {
        heading: "전시",
        body: "오피모 전시 소식를 검색하시는 분들께 권합니다.",
      },
      { heading: "매장", body: "파주 매장 주차·영업 시간을 방문 전에 확인하세요." },
    ],
    conclusion: "방문·예약 안내 참고하세요.",
  },
  { input: ctx, ...ctx },
  "blog"
);

const score = scoreBriclogEngine(pack, ctx);
const full = getBlogFullText(pack);
const checks = [
  ["score >= pass", score.total >= BRICLOG_ENGINE_PASS],
  ["belief component", score.components.belief >= 72],
  ["naver addon", buildNaverEnginePromptAddon(ctx).includes("1만 건")],
  ["voice profile", buildNaverVoiceProfileBlock(ctx).includes("가구점")],
  ["no placeholder", !/방문·예약\s*안내/.test(full)],
  ["brand subengine inactive", !buildBrandSubenginePromptBlock({ ...ctx, approvedContentCount: 0 })],
  ["brand subengine active", buildBrandSubenginePromptBlock({ ...ctx, approvedContentCount: 3 }).includes("SUBENGINE")],
];

let fail = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} · ${name}`);
  if (!ok) fail += 1;
}
console.log(`briclogEngine=${score.total} belief=${score.components.belief}`);
process.exit(fail ? 1 : 0);
