/**
 * prod place/instagram SLA — standalone + blog-derived
 * Run: node --import ./scripts/register-alias.mjs scripts/probe-prod-channel-sla.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";
import { getChannelFullText } from "../lib/content/channelPack.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");
const SLA_MS = Number(process.env.CHANNEL_SLA_MS) || 90_000;
const OUT_DIR = join(root, "artifacts", "prod-channel-sla");
const OUT_JSON = join(OUT_DIR, "latest-summary.json");

try {
  for (const raw of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
    const line = raw.replace(/\r$/, "").trim();
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* ignore */
}
applyE2eTestCredentialsToEnv(process.env);

const auth = await getE2eBearerToken();
if (!auth.ok) {
  console.error("auth fail", auth.reason);
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${auth.token}`,
};

async function postJson(path, body, timeoutMs = SLA_MS + 30_000) {
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 300) };
    }
    return { status: res.status, ms: Date.now() - t0, data };
  } finally {
    clearTimeout(timer);
  }
}

function channelHasContent(channel, data) {
  if (data?.withheld || data?.ok === false) return false;
  if (channel === "place") {
    const p = data.placeContent;
    return Boolean(p?.title && (p.detailBody || p.shortNotice));
  }
  if (channel === "instagram") {
    const p = data.instagramContent;
    return Boolean(p?.hook || p?.lineBreakBody || p?.body);
  }
  return false;
}

const FORM = {
  brandName: "SLA레이어드살롱",
  region: "서울 홍대",
  topic: "5월 컬러 이벤트 예약 안내",
  industry: "미용실",
  storeFeatures: "시즌 컬러·예약제·주차 3대",
  brandDescription: "홍대 미용실 · 컬러 전문 · 예약 우선",
  v2ResearchReady: true,
  v2PreWriteVerified: true,
  v2AxisVerified: true,
  researchEnabled: true,
  researchFacts: [
    { axis: "brand", fact: "5월 컬러 이벤트 예약 접수 중" },
    { axis: "brand", fact: "시즌 컬러·클리닉 패키지 운영" },
    { axis: "region", fact: "홍대역 도보 5분 · 주차 3대" },
  ],
};

const results = [];

async function runCase(id, channel, payload) {
  const t0 = Date.now();
  process.stdout.write(`\n  ${id} … `);
  try {
    const { status, ms, data } = await postJson("/api/content/channel", {
      ...FORM,
      ...payload,
      channel,
      contentChannel: channel,
    });
    const ok =
      status === 200 &&
      channelHasContent(channel, data) &&
      !data.withheld;
    const textLen = channelHasContent(channel, data)
      ? getChannelFullText(
          channel === "place" ? data.placeContent : data.instagramContent,
          channel
        ).length
      : 0;
    const row = {
      id,
      channel,
      status,
      ms,
      slaOk: ms <= SLA_MS,
      ok,
      mode: data.mode || data.meta?.generationMode || null,
      northStarFastPass: data.meta?.channelNorthStarFastPass || data.placeContent?._meta?.channelNorthStarFastPass || data.instagramContent?._meta?.channelNorthStarFastPass || false,
      withheld: Boolean(data.withheld),
      userMessage: data.userMessage || null,
      textLen,
    };
    results.push(row);
    console.log(ok ? `PASS ${ms}ms len=${textLen}` : `FAIL ${status} ${ms}ms ${data.userMessage || data.raw?.slice?.(0, 80) || ""}`);
    return row;
  } catch (err) {
    const ms = Date.now() - t0;
    const row = {
      id,
      channel,
      ok: false,
      ms,
      slaOk: false,
      error: err?.message || String(err),
    };
    results.push(row);
    console.log(`FAIL ${row.error}`);
    return row;
  }
}

console.log(`\n=== prod channel SLA (${BASE}) deadline=${SLA_MS}ms ===`);

await runCase("place_standalone", "place", {
  channelStandaloneFast: true,
  placeHeadline: "컬러 이벤트",
  placeKeyFacts: "5월 예약 · 시즌 컬러 · 홍대역 5분",
  sourceChannel: "form",
});

await runCase("instagram_standalone", "instagram", {
  channelStandaloneFast: true,
  brandName: "SLA꽃담",
  region: "부산 해운대",
  topic: "어버이날 꽃다발 예약",
  industry: "꽃집",
  instaScene: "매장 픽업",
  sourceChannel: "form",
});

console.log("\n  blog async (derive source) …");
const blogForm = {
  brandName: "산책카페",
  region: "전주 한옥마을",
  topic: "봄 시즌 브런치",
  industry: "카페",
  storeFeatures: "루프탑",
  blogLengthTier: "short",
  researchEnabled: false,
  skipAutoPipeline: true,
};
const blogStart = await postJson("/api/content/blog/async/start", blogForm, 30_000);
const jobId = blogStart.data?.jobId;
let blogPack = null;
if (jobId) {
  await postJson(`/api/content/blog/async/${jobId}/run`, {}, 310_000);
  const poll = await fetch(`${BASE}/api/content/blog/async/${jobId}`, { headers }).then((r) =>
    r.json()
  );
  blogPack = poll.blogContent || poll.result?.blogContent || null;
  console.log(
    `  blog done sections=${blogPack?.sections?.length || 0} status=${poll.status}`
  );
}

if (blogPack?.sections?.length) {
  await runCase("place_derived", "place", {
    sourceChannel: "blog",
    _sourceBlogPack: blogPack,
    blogContent: blogPack,
  });
  await runCase("instagram_derived", "instagram", {
    sourceChannel: "blog",
    _sourceBlogPack: blogPack,
    blogContent: blogPack,
    instaTone: "informative",
  });
} else {
  results.push({ id: "place_derived", ok: false, error: "no_blog_source" });
  results.push({ id: "instagram_derived", ok: false, error: "no_blog_source" });
  console.log("  SKIP derived — blog source missing");
}

const pass = results.filter((r) => r.ok).length;
const summary = {
  at: new Date().toISOString(),
  base: BASE,
  slaMs: SLA_MS,
  total: results.length,
  pass,
  passRate: results.length ? Math.round((pass / results.length) * 1000) / 10 : 0,
  slaPass: results.filter((r) => r.slaOk).length,
  results,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2), "utf8");
console.log(`\n${JSON.stringify(summary, null, 2)}`);
console.log(`\nwritten: ${OUT_JSON}`);
process.exit(pass === results.length ? 0 : 1);
