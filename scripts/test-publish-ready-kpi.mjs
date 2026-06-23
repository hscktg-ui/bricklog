/**
 * Publish-ready KPI — Launch North Star (출시 전 50%+)
 * Run: npm run test:publish-ready-kpi
 * Prod API: $env:BASE_URL='https://briclog.ai'; $env:API_ONLY='1'; npm run test:publish-ready-kpi
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { finalizeLaunchPublishBlogPack } from "../lib/config/launchPublishMode.js";
import { assessBlogApiDeliveryWithhold } from "../lib/product/blogApiDeliveryGate.js";
import { enforceCustomerBlogOutput } from "../lib/product/brandContentCustomerGate.js";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";
import { loadEnvLocal } from "./lib/loadEnvLocal.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const OUT = join(root, "artifacts", "publish-ready-kpi", "latest-summary.json");
const BASE = (process.env.BASE_URL || "http://localhost:3005").replace(/\/$/, "");
const TARGET_RATE = Number(process.env.PUBLISH_READY_TARGET) || 0.5;
const API_SAMPLES = Number(process.env.PUBLISH_READY_API_SAMPLES) || 1;

const FIXTURES = [
  {
    id: "cafe-brunch",
    input: {
      brandName: "모닝브루",
      region: "서울 강남",
      topic: "봄 브런치 메뉴",
      industry: "카페",
    },
    pack: {
      title: "봄 브런치",
      sections: [
        {
          heading: "아침의 여유",
          body: "강남 골목에서 문을 열면 빵 굽는 냄새가 먼저 맞습니다. 에그 베네딕트와 시즌 과일이 한 상에 올라오는 브런치는 주말 아침에 특히 잘 어울려요.",
        },
        {
          heading: "메뉴 고르기",
          body: "커피는 산미 있는 싱글 오리진, 브런치는 가벼운 샐러드와 함께 골라 보세요. 처음 오신 분은 직원에게 오늘의 추천을 물어보시면 부담 없이 시작할 수 있어요.",
        },
        {
          heading: "방문 팁",
          body: "11시 전에 오면 대기가 짧은 편입니다. 창가 자리는 햇빛이 좋아 사진 찍기에도 괜찮아요.",
        },
        {
          heading: "정리",
          body: "봄 시즌 브런치는 가볍게 즐기기 좋습니다. 모닝브루에서 한 번 들러 보세요.",
        },
      ],
      _meta: { llmGenerated: true, missionProseFallback: true },
    },
  },
  {
    id: "flower-gift",
    input: {
      brandName: "플로라하우스",
      region: "여주",
      topic: "어버이날 꽃 선물",
      industry: "flower",
    },
    pack: {
      title: "어버이날 꽃",
      sections: [
        {
          heading: "마음을 담아",
          body: "어버이날에는 말로 전하기 어려운 마음을 꽃 한 다발로 대신할 때가 많아요. 여주 플로라하우스에서는 계절 생화를 아침에 받아 정리합니다.",
        },
        {
          heading: "고르는 기준",
          body: "밝은 색은 화사한 인상, 흰색과 연보라는 차분한 느낌을 줍니다. 부모님 취향이 화사한 편이면 핑크·코랄 계열을 추천해요.",
        },
        {
          heading: "전달 방법",
          body: "카드 문구는 짧게, 이름과 감사 한 줄이면 충분합니다. 배송이 필요하면 전날까지 예약해 주세요.",
        },
        {
          heading: "마무리",
          body: "꽃은 도착 후 바로 물을 갈아 주시면 더 오래 봄을 느낄 수 있어요.",
        },
      ],
      _meta: { llmGenerated: true },
    },
  },
];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function isPublishReady(pack) {
  return pack?._meta?.publishReady === true;
}

function assessFixture({ id, input, pack }) {
  const finalized = finalizeLaunchPublishBlogPack(pack, input);
  const gated = enforceCustomerBlogOutput(finalized, input);
  const api = assessBlogApiDeliveryWithhold(
    { blogContent: gated.pack || finalized, mode: "llm" },
    input
  );
  const publishReady = isPublishReady(gated.pack || finalized);
  const sections = (gated.pack || finalized)?.sections?.length || 0;
  return {
    id,
    ok: gated.ok && !api.withhold && sections >= 2,
    publishReady,
    sections,
    withheld: api.withhold,
  };
}

async function runApiSample(index) {
  const auth = await getE2eBearerToken();
  if (!auth.ok) return { skipped: true, reason: auth.reason };

  const topics = [
    { brandName: "KPI테스트카페", region: "부산 해운대", topic: "여름 시원한 음료", industry: "카페" },
    { brandName: "KPI테스트꽃집", region: "대구 수성", topic: "졸업 축하 꽃다발", industry: "flower" },
  ];
  const sample = topics[index % topics.length];
  const started = Date.now();
  const res = await fetch(`${BASE}/api/content/blog`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({
      ...sample,
      mainKeyword: sample.topic,
      blogLengthTier: "short",
      skipAutoPipeline: true,
      v2PipelineEnforced: true,
    }),
  });
  const body = await res.json().catch(() => ({}));
  const elapsedMs = Date.now() - started;
  const sections = body?.blogContent?.sections?.length || 0;
  const publishReady =
    body?.blogContent?._meta?.publishReady === true ||
    body?.meta?.publishReady === true;
  return {
    id: `api-${index}`,
    ok: body?.ok !== false && sections >= 2 && !body?.withheld,
    publishReady,
    sections,
    withheld: Boolean(body?.withheld),
    elapsedMs,
    userMessage: body?.userMessage,
  };
}

loadEnvLocal(root);
applyE2eTestCredentialsToEnv(process.env);

const localRuns = FIXTURES.map(assessFixture);
let apiRuns = [];
if (process.env.API_ONLY === "1" && API_SAMPLES > 0) {
  for (let i = 0; i < API_SAMPLES; i += 1) {
    try {
      apiRuns.push(await runApiSample(i));
    } catch (err) {
      apiRuns.push({
        id: `api-${i}`,
        ok: false,
        publishReady: false,
        error: err?.message,
      });
    }
  }
}

const runs = [...localRuns, ...apiRuns.filter((r) => !r.skipped)];
const publishReadyCount = runs.filter((r) => r.publishReady).length;
const deliveryOkCount = runs.filter((r) => r.ok).length;
const rate = runs.length ? publishReadyCount / runs.length : 0;

const summary = {
  at: new Date().toISOString(),
  base: BASE,
  targetRate: TARGET_RATE,
  publishReadyRate: rate,
  publishReadyPercent: Math.round(rate * 1000) / 10,
  deliveryOkRate: runs.length ? deliveryOkCount / runs.length : 0,
  total: runs.length,
  publishReadyCount,
  deliveryOkCount,
  runs,
  pass: rate >= TARGET_RATE,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(summary, null, 2), "utf8");

console.log("\n=== PUBLISH-READY KPI ===\n");
console.log(
  `rate: ${summary.publishReadyPercent}% (${publishReadyCount}/${runs.length}) target ${TARGET_RATE * 100}%`
);
console.log(`delivery ok: ${deliveryOkCount}/${runs.length}`);
console.log(`report: ${OUT}`);

if (!summary.pass) {
  console.error("\nFAIL: publish-ready below target");
  process.exit(1);
}
console.log("\nPASS: publish-ready-kpi");
