/**
 * Prod smoke: login + POST /api/content/detail-page
 * One-off. Do not commit secrets; uses .env.local + e2e fallback.
 */
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import {
  E2E_TEST_EMAIL,
  E2E_TEST_PASSWORD,
} from "../lib/qa/e2eTestCredentials.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = process.env.BASE_URL || "https://briclog.ai";
const OUT = join(root, "artifacts", "p0-proof-test", "detail-page-prod.json");

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
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

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.BRICLOG_TEST_EMAIL || E2E_TEST_EMAIL;
const password = process.env.BRICLOG_TEST_PASSWORD || E2E_TEST_PASSWORD;

if (!url || !anon) {
  console.error("missing supabase env");
  process.exit(1);
}

const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
if (error || !data?.session?.access_token) {
  console.error(JSON.stringify({ ok: false, step: "login", err: error?.message }));
  process.exit(1);
}

const payload = {
  productName: "여주 햅쌀 10kg",
  topic: "여주 햅쌀 10kg",
  brandName: "우리쌀가게",
  region: "여주",
  industry: "쌀가게",
  target: "집밥 차리는 손님",
  searchIntent: "포장만 보고 밥맛까지는 가늠이 안 된다",
  features: "당일 도정\n진공 포장\n여주 수확",
  highlights: "여주에서 당일 도정",
  mustInclude: "도정 시각은 방문 당일만 안내합니다.",
  pageLength: "standard",
  accent: "#03a94d",
  presetId: "open-rice",
  imageCount: 0,
};

const t0 = Date.now();
const res = await fetch(`${BASE}/api/content/detail-page`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.session.access_token}`,
  },
  body: JSON.stringify(payload),
});
const ms = Date.now() - t0;
const body = await res.json().catch(() => ({}));
const pack = body.pack || {};
const meta = pack._meta || body.meta || {};
const sections = Array.isArray(pack.sections) ? pack.sections : [];
const html = String(body.html || "");
const report = {
  ok: !!body.ok,
  status: res.status,
  ms,
  mode: body.mode,
  productName: pack.productName,
  score: meta.sqv?.score ?? meta.score ?? null,
  chars: meta.chars ?? null,
  compositionOk: meta.compositionOk ?? null,
  densityOk: meta.densityOk ?? null,
  standardOk: body.standard?.ok ?? meta.standard?.ok ?? null,
  standardReasons: body.standard?.reasons || meta.standard?.reasons || [],
  sectionCount: sections.length,
  sectionTypes: sections.map((s) => s.type),
  headlines: {
    headline: pack.headline || null,
    subhead: pack.subhead || null,
  },
  sample: sections.slice(0, 4).map((s) => ({
    type: s.type,
    title: String(s.title || s.heading || "").slice(0, 48),
    body: String(s.body || "").slice(0, 120),
  })),
  userMessage: body.userMessage || null,
  htmlLen: html.length,
  has860: html.includes("860px"),
  hasPretendard: /pretendard/i.test(html + String(body.documentHtml || "")),
  hasGrade95: html.includes('data-grade="95"'),
  filledToGrade: meta.filledToGrade ?? meta.gradeFill ?? null,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.ok || report.score == null || report.score < 95) process.exit(1);
