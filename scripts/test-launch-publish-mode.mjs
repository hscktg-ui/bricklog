/**
 * Launch publish-first mode SSOT
 * Run: npm run test:launch-publish-mode
 */
import {
  isLaunchPublishFirstMode,
  getLaunchPublishTimeBudgetMs,
  getLaunchPublishMaxAttempts,
  finalizeLaunchPublishBlogPack,
  shouldWithholdCustomerDelivery,
} from "../lib/config/launchPublishMode.js";
import { LAUNCH_PUBLISH_CLIENT_FETCH_MS } from "../lib/config/launchPublishFlags.js";
import {
  getGenerationTimeBudgetMs,
  getCoreMaxRewrites,
  getBlogClientFetchTimeoutMs,
} from "../lib/config/briclogFastPipeline.js";
import { enforceCustomerBlogOutput } from "../lib/product/brandContentCustomerGate.js";
import { assessBlogApiDeliveryWithhold } from "../lib/product/blogApiDeliveryGate.js";
import { gateOrchestratorBlogPack } from "../lib/llm/orchestratorDeliveryGate.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(isLaunchPublishFirstMode(), "launch publish first default on");
assert(!shouldWithholdCustomerDelivery(), "customer withhold off");
assert(getLaunchPublishTimeBudgetMs() === 75_000, "75s budget");
assert(getLaunchPublishMaxAttempts() === 1, "1 attempt");
assert(getGenerationTimeBudgetMs() === 75_000, "pipeline gen budget");
assert(getCoreMaxRewrites() === 1, "core rewrites 1");
assert(getBlogClientFetchTimeoutMs() === 120_000, "client fetch 120s");

const pack = {
  sections: [
    { heading: "도입", body: "여주 카페에서 아침 커피 한 잔의 여유를 느껴 보세요. 창가 자리에서 하루를 시작하기 좋습니다." },
    { heading: "메뉴", body: "에스프레소와 라떼, 시즌 음료까지 골라 마실 수 있어요. 디저트와 함께 즐기기에도 좋습니다." },
  ],
  title: "아침 커피",
  _meta: { llmGenerated: true, missionProseFallback: true },
};
const input = { brandName: "모닝브루", region: "여주", topic: "아침 커피" };

const gated = enforceCustomerBlogOutput(pack, input);
assert(gated.ok && gated.pack?.sections?.length, "blog gate passes fallback pack");

const api = assessBlogApiDeliveryWithhold(
  { blogContent: pack, mode: "draft_fallback" },
  input
);
assert(!api.withhold, "api withhold off");

const orch = gateOrchestratorBlogPack(input, pack, { llmAvailable: true });
assert(orch.ok && orch.blogContent?.sections?.length, "orchestrator delivers");

const finalized = finalizeLaunchPublishBlogPack(pack, input);
assert(finalized._meta?.publishReady, "publishReady stamped");

console.log("PASS: launch-publish-mode");
