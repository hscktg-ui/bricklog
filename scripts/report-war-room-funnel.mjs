/**
 * 대책회의 Gate B 측정 — 방문·맛보기·CTA·외부가입·로그인 생성
 * Run: npm run test:war-room-funnel
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(root, "artifacts", "war-room-funnel");
const OUT_PATH = resolve(OUT_DIR, "latest.json");
const LAUNCH = resolve(root, "artifacts", "launch-samples", "latest-summary.json");

function refreshLaunchSamples() {
  spawnSync("npm", ["run", "test:launch-samples"], {
    cwd: root,
    shell: true,
    stdio: "inherit",
    env: process.env,
  });
}

refreshLaunchSamples();

if (!existsSync(LAUNCH)) {
  console.error("FAIL: launch-samples missing after refresh");
  process.exit(1);
}

const j = JSON.parse(readFileSync(LAUNCH, "utf8"));
const visits = Number(j.funnelSignals?.landingOrTestPathVisits) || 0;
const tests = Number(j.publicBrandTest?.totalRecordedRuns) || 0;
const cta = Number(j.funnelSignals?.publicTestSignupCtaClicks) || 0;
const external = Number(j.launchSignals?.externalSignupCount) || 0;
const gens = Number(j.loggedInGeneration?.generationsTotal) || 0;
const profiles = Number(j.launchSignals?.profileCount) || 0;

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

const report = {
  at: new Date().toISOString(),
  asOf: "war-room-gate-b",
  funnel: {
    visits,
    publicTests: tests,
    ctaClicks: cta,
    externalSignups: external,
    loggedInGenerations: gens,
    profiles,
  },
  rates: {
    visitToTestPct: pct(tests, visits),
    testToCtaPct: pct(cta, tests),
    ctaToExternalPct: pct(external, cta),
    visitToExternalPct: pct(external, visits),
  },
  targets: {
    ctaToExternalPct: 15,
    weeklyExternalSignups: 10,
  },
  gateB: {
    ctaToExternalMet: pct(external, cta) != null && pct(external, cta) >= 15,
    note:
      external <= 1
        ? "퍼널 중간 정체 — sticky 전면 노출·운영 계획 카피 강화 후 재측정"
        : "전환 개선 중",
  },
  topCtaSources: j.funnelSignals?.topPublicTestCtaSources || [],
  interpretation: [
    `CTA ${cta} → 외부 가입 ${external} (${pct(external, cta) ?? 0}%, 목표 15%)`,
    `로그인 생성 ${gens} · profiles ${profiles}`,
  ],
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, ...report.funnel, rates: report.rates, written: OUT_PATH }, null, 2));
