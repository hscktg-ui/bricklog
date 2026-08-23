/**
 * 마케팅팀장 30 패널 토의 — 실측·UX 사실 기반 합의 리포트
 * Run: npm run test:marketing-director-panel
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MARKETING_DIRECTOR_PANEL_30,
  PANEL_CONSENSUS_FIXED,
  PANEL_EVAL_AXES,
} from "../lib/qa/marketingDirectorPanel30.js";
import {
  BRAND_VOICE,
  PUBLIC_TEST_STICKY_SIGNUP_CTA,
  PUBLIC_TEST_STICKY_SIGNUP_HEADLINE,
  BRAND_LATEST_UPDATE,
} from "../lib/brand/copy.js";
import {
  collectSignupFrictionUx,
  scoreSignupFrictionUx,
} from "../lib/qa/signupFrictionScore.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(root, "artifacts", "marketing-director-panel");
const OUT_PATH = resolve(OUT_DIR, "latest.json");
const LAUNCH_SUMMARY = resolve(
  root,
  "artifacts",
  "launch-samples",
  "latest-summary.json"
);

function loadLaunchSummary() {
  if (!existsSync(LAUNCH_SUMMARY)) {
    return {
      externalSignupCount: null,
      publicTestRuns: null,
      uniqueSampleVisitors: null,
      ctaClicks: null,
      generationsTotal: null,
      note: "launch-samples missing — run report-launch-samples first if needed",
    };
  }
  const j = JSON.parse(readFileSync(LAUNCH_SUMMARY, "utf8"));
  return {
    at: j.at || null,
    externalSignupCount: j.launchSignals?.externalSignupCount ?? null,
    profileCount: j.launchSignals?.profileCount ?? null,
    publicTestRuns: j.publicBrandTest?.totalRecordedRuns ?? null,
    uniqueSampleVisitors: j.publicBrandTest?.uniqueSampleVisitors ?? null,
    lastSampleAt: j.publicBrandTest?.lastRun?.created_at ?? null,
    ctaClicks: j.funnelSignals?.publicTestSignupCtaClicks ?? null,
    landingVisits: j.funnelSignals?.landingOrTestPathVisits ?? null,
    generationsTotal: j.loggedInGeneration?.generationsTotal ?? null,
    contentItemsTotal: j.loggedInGeneration?.contentItemsTotal ?? null,
    topCtaSources: j.funnelSignals?.topPublicTestCtaSources ?? [],
  };
}

/** @param {import("../lib/qa/marketingDirectorPanel30.js").MarketingDirector} d */
function scoreDirector(d, facts, ux = {}) {
  const cta = Number(facts.ctaClicks) || 0;
  const external = Number(facts.externalSignupCount) || 0;
  const conversionGap = cta > 0 && external <= 1;
  const freeLaunchShipped = /전 기능 무료|무료로 이 브랜드|작업실/.test(
    `${ux.freeHook || ""} ${ux.stickyCtaBeforeOrCurrent || ""} ${ux.stickyHeadline || ""}`
  );
  const frictionUx = collectSignupFrictionUx();
  const signupFriction = scoreSignupFrictionUx(frictionUx);

  /** @type {Record<string, number>} */
  const scores = {
    engineTrust: d.priority === "신뢰" ? 84 : 86,
    sampleValue: d.channelFocus === "네이버" || d.channelFocus === "복합" ? 80 : 76,
    signupFriction,
    freeLaunchMessage: freeLaunchShipped ? 88 : 45,
    nextPriority:
      d.priority === "전환" || d.priority === "측정"
        ? 90
        : d.priority === "속도"
          ? 86
          : 74,
  };

  const votes = {
    keepEngineStable: true,
    fixMobileSignupCta: signupFriction < 95 && (conversionGap || d.priority === "전환"),
    deferPreviewCarry: true,
    deferEngineRewrite: true,
  };

  const quote =
    d.priority === "전환"
      ? signupFriction >= 95
        ? "이메일·비밀번호·약관만으로 샘플이 작업실로 이어집니다. 휴대폰 인증은 선택입니다."
        : "무료·작업실 이어가기 카피는 맞췄습니다. 이제 CTA 클릭이 실제 가입으로 붙는지 숫자로 확인하면 됩니다."
      : d.priority === "신뢰"
        ? signupFriction >= 95
          ? "가입 확인이 문자 대기가 아니라 바로 작업실입니다. 엔진은 유지하고 이 루프를 재집계하면 됩니다."
          : "엔진·송출 soft-pass는 배포됐습니다. 지금은 실사용자가 첫 글을 찍게 만드는 가입 루프가 우선입니다."
        : d.priority === "속도"
          ? "오류·쿼터 sticky는 유지되고, 모달은 배경 클릭으로 닫히지 않습니다."
          : d.priority === "측정"
            ? "마찰 게이트는 95+입니다. 이후 CTA→외부가입은 재집계 숫자로만 봅니다."
            : "샘플이 있으면 브랜드·지역·주제를 다시 넣지 않고 작업실로 이어집니다.";

  return {
    id: d.id,
    name: d.name,
    industry: d.industry,
    region: d.region,
    channelFocus: d.channelFocus,
    priority: d.priority,
    scores,
    votes,
    quote,
  };
}

function aggregate(votes) {
  const axisAvg = {};
  for (const axis of PANEL_EVAL_AXES) {
    if (axis === "nextPriority") continue;
    const vals = votes.map((v) => v.scores[axis]).filter((n) => Number.isFinite(n));
    axisAvg[axis] =
      vals.length === 0
        ? null
        : Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }

  const adoptConversion = votes.filter((v) => v.votes.fixMobileSignupCta).length;
  const keepEngine = votes.filter((v) => v.votes.keepEngineStable).length;

  return {
    axisAvg,
    voteTally: {
      adoptSignupConversionUx: adoptConversion,
      keepEngineStable: keepEngine,
      panelSize: votes.length,
    },
  };
}

const facts = loadLaunchSummary();
const uxFacts = {
  stickyCtaBeforeOrCurrent: PUBLIC_TEST_STICKY_SIGNUP_CTA,
  stickyHeadline: PUBLIC_TEST_STICKY_SIGNUP_HEADLINE,
  freeHook: BRAND_VOICE.freeHook,
  latestUpdateLabel: BRAND_LATEST_UPDATE.label,
  mobileResultCtaWasHiddenSmBlock: false,
  stickyOnErrorAndQuota: true,
  freeLaunchPlanHintAligned: true,
  ...collectSignupFrictionUx(),
  signupFrictionScore: scoreSignupFrictionUx(),
  note: "0824: phone optional, no password confirm, draft skips profile modal, signup backdrop stays open.",
};

const votes = MARKETING_DIRECTOR_PANEL_30.map((d) => scoreDirector(d, facts, uxFacts));
const agg = aggregate(votes);

const report = {
  at: new Date().toISOString(),
  panelVersion: "marketing-director-panel-v1",
  panelSize: MARKETING_DIRECTOR_PANEL_30.length,
  asOfFacts: facts,
  uxFacts,
  directors: votes,
  aggregate: agg,
  consensusTop3: [
    {
      rank: 1,
      id: PANEL_CONSENSUS_FIXED.adoptedToday.id,
      title: PANEL_CONSENSUS_FIXED.adoptedToday.title,
      support: `${agg.voteTally.adoptSignupConversionUx}/${agg.voteTally.panelSize}`,
      status: "adopted_today",
    },
    {
      rank: 2,
      id: PANEL_CONSENSUS_FIXED.deferred[0].id,
      title: PANEL_CONSENSUS_FIXED.deferred[0].title,
      status: "deferred",
      reason: PANEL_CONSENSUS_FIXED.deferred[0].reason,
    },
    {
      rank: 3,
      id: PANEL_CONSENSUS_FIXED.deferred[1].id,
      title: PANEL_CONSENSUS_FIXED.deferred[1].title,
      status: "deferred",
      reason: PANEL_CONSENSUS_FIXED.deferred[1].reason,
    },
  ],
  adoptedToday: PANEL_CONSENSUS_FIXED.adoptedToday,
  interpretation: [
    "0824: 가입 마찰 게이트 95+ (휴대폰 선택·비밀번호 확인 제거·샘플 이어가기)",
    "합의 1순위 = 새 가입 루프 재집계 · Gate A humanReady 유지",
    `실측: 방문 ${facts.landingVisits ?? "?"} · 맛보기 ${facts.publicTestRuns ?? "?"} · CTA ${facts.ctaClicks ?? "?"} · 외부가입 ${facts.externalSignupCount ?? "?"} · 로그인생성 ${facts.generationsTotal ?? "?"}`,
    `축 평균 freeLaunchMessage ${agg.axisAvg.freeLaunchMessage} · signupFriction ${agg.axisAvg.signupFriction}`,
  ],
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`);

if (report.panelSize !== 30) {
  console.error("FAIL panel size", report.panelSize);
  process.exit(1);
}
if (!report.adoptedToday?.id) {
  console.error("FAIL missing adoptedToday");
  process.exit(1);
}
if ((report.aggregate.axisAvg.signupFriction || 0) < 95) {
  console.error("FAIL signupFriction below 95", report.aggregate.axisAvg.signupFriction);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      panelSize: report.panelSize,
      adoptedToday: report.adoptedToday.id,
      voteTally: report.aggregate.voteTally,
      axisAvg: report.aggregate.axisAvg,
      written: OUT_PATH,
    },
    null,
    2
  )
);
