/**
 * Auth + brand + memory persistence smoke (API level)
 * Run: npm run test:auth-persistence
 * Env (.env.local): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *   BRICLOG_TEST_EMAIL, BRICLOG_TEST_PASSWORD
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { pipelineContentFromMemoryItem } from "../lib/memory/contentStore.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const OUT = join(root, "config", "auth-persistence-report.json");
const BASE = process.env.BASE_URL || "http://localhost:3005";

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  } catch {
    /* optional */
  }
}

async function apiFetch(path, { token, method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const PLACE_FIXTURE = {
  title: "평택 템퍼 — 모션베드 방문 안내",
  shortNotice: "매장에서 직접 체험해 보세요.",
  body: "평택에서 모션베드를 고민 중이시라면 매장 방문 전 확인할 포인트를 정리했습니다.",
  detailBody: "체험 동선과 상담 예약 방법을 안내드립니다.",
  cta: "전화 문의 또는 방문 예약",
  hashtags: ["#평택", "#모션베드", "#템퍼"],
};

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.BRICLOG_TEST_EMAIL;
  const password = process.env.BRICLOG_TEST_PASSWORD;

  const report = {
    at: new Date().toISOString(),
    baseUrl: BASE,
    steps: [],
    ok: false,
  };

  if (!url || !anon || !email || !password) {
    report.steps.push({
      step: "env",
      ok: false,
      detail: "NEXT_PUBLIC_SUPABASE_* + BRICLOG_TEST_EMAIL/PASSWORD required",
    });
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log("SKIP: missing env for auth persistence smoke");
    process.exit(0);
  }

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();
  const brandName = `스모크브랜드${String(stamp).slice(-6)}`;

  let token = null;
  let brandId = null;
  let contentItemId = null;

  const login = await supabase.auth.signInWithPassword({ email, password });
  if (login.error) {
    report.steps.push({ step: "login", ok: false, detail: login.error.message });
    writeReport(report);
    process.exit(1);
  }
  token = login.data.session?.access_token;
  report.steps.push({ step: "login", ok: !!token });

  const brandRes = await apiFetch("/api/brands", {
    token,
    method: "POST",
    body: {
      brandName,
      region: "평택",
      industry: "가구/침대",
      metadata: {},
    },
  });
  brandId = brandRes.data?.brand?.id || brandRes.data?.id;
  report.steps.push({
    step: "create_brand",
    ok: brandRes.status < 300 && !!brandId,
    status: brandRes.status,
  });
  if (!brandId) {
    writeReport(report);
    process.exit(1);
  }

  const memRes = await apiFetch("/api/memory/content", {
    token,
    method: "POST",
    body: {
      brandId,
      channel: "place",
      title: PLACE_FIXTURE.title,
      fullContent: PLACE_FIXTURE.body,
      hashtags: PLACE_FIXTURE.hashtags.join(" "),
      promptInput: { structured_content: PLACE_FIXTURE },
      versionSource: "auth_persistence_smoke",
    },
  });
  contentItemId = memRes.data?.item?.id;
  report.steps.push({
    step: "save_place_memory",
    ok: !!contentItemId || memRes.data?.skipped === true,
    skipped: memRes.data?.skipped,
    memoryReady: memRes.data?.memoryReady !== false,
    status: memRes.status,
  });

  await supabase.auth.signOut();

  const relogin = await supabase.auth.signInWithPassword({ email, password });
  token = relogin.data.session?.access_token;
  report.steps.push({ step: "relogin", ok: !!token && !relogin.error });

  const brandsList = await apiFetch("/api/brands", { token });
  const foundBrand = (brandsList.data?.brands || []).some(
    (b) => b.id === brandId || b.brandName === brandName
  );
  report.steps.push({
    step: "brand_persisted",
    ok: foundBrand,
    count: brandsList.data?.brands?.length,
  });

  const memList = await apiFetch(
    `/api/memory/content?brandId=${encodeURIComponent(brandId)}&channel=place`,
    { token }
  );
  const item = memList.data?.items?.[0];
  const restored = item
    ? pipelineContentFromMemoryItem("place", item)
    : null;
  report.steps.push({
    step: "place_memory_persisted",
    ok: !!restored?.title,
    itemId: item?.id || contentItemId,
    title: restored?.title,
  });

  report.ok = report.steps.every((s) => s.ok);
  writeReport(report);

  if (report.ok) {
    console.log("OK: auth persistence smoke");
    console.log("  brand:", brandId);
    console.log("  place item:", item?.id || contentItemId);
    process.exit(0);
  }

  console.error("FAIL: auth persistence smoke", report.steps.filter((s) => !s.ok));
  process.exit(1);
}

function writeReport(report) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
