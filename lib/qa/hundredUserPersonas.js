/**
 * 100명 실사용자 페르소나 — 업종(10) × 여정 유형(10)
 * @see lib/qa/eightUserPersonas.js (기존 8명)
 * @see lib/persona/customerJourneyPersonas.js (기존 3명)
 *
 * 동일 실험 축: 가독성 · 오류 체감 · 개선점 (코드·플로우 정적 매핑)
 */

import { QUICK_DEMO_POOL } from "@/lib/onboarding/quickDemoPool";

const INDUSTRIES = [
  { id: "cafe", label: "카페·F&B" },
  { id: "flower", label: "꽃집·선물" },
  { id: "medical", label: "의료·클리닉" },
  { id: "beauty", label: "뷰티·피부" },
  { id: "academy", label: "학원·교육" },
  { id: "restaurant", label: "음식점" },
  { id: "retail", label: "리테일·패션" },
  { id: "fitness", label: "피트니스·운동" },
  { id: "professional", label: "전문서비스" },
  { id: "lodging", label: "숙박·펜션" },
];

const JOURNEY_TYPES = [
  {
    id: "guest_mobile",
    label: "첫 방문 게스트(모바일)",
    needsAuth: false,
    primaryMenu: null,
    device: "mobile",
    focus: ["landing", "intro", "cta"],
  },
  {
    id: "guest_desktop",
    label: "첫 방문 게스트(PC)",
    needsAuth: false,
    primaryMenu: null,
    device: "desktop",
    focus: ["landing", "sample", "pricing"],
  },
  {
    id: "signup_mobile",
    label: "신규 가입(모바일)",
    needsAuth: true,
    primaryMenu: "blog",
    device: "mobile",
    focus: ["auth", "fast_onboarding", "first_write"],
  },
  {
    id: "signup_desktop",
    label: "신규 가입(PC)",
    needsAuth: true,
    primaryMenu: "blog",
    device: "desktop",
    focus: ["auth", "brand_form", "sidebar"],
  },
  {
    id: "email_unverified",
    label: "이메일 미인증",
    needsAuth: true,
    primaryMenu: "blog",
    device: "desktop",
    focus: ["email_verify", "generate_block"],
  },
  {
    id: "blog_writer",
    label: "이야기 집중 작성",
    needsAuth: true,
    primaryMenu: "blog",
    device: "mobile",
    focus: ["generate", "overlay", "result_view"],
  },
  {
    id: "channel_pack",
    label: "채널팩(이야기+연쇄)",
    needsAuth: true,
    primaryMenu: "blog",
    device: "tablet",
    focus: ["blog_only_toggle", "pipeline", "post_tail"],
  },
  {
    id: "channel_standalone",
    label: "단독 채널(플레이스/인스타)",
    needsAuth: true,
    primaryMenu: "place",
    device: "mobile",
    focus: ["derive_vs_standalone", "channel_start"],
  },
  {
    id: "paste_review",
    label: "붙여넣기 검수",
    needsAuth: true,
    primaryMenu: "review",
    device: "desktop",
    focus: ["draft_review", "compliance", "audit"],
  },
  {
    id: "history_power",
    label: "기록·브랜드 작업실",
    needsAuth: true,
    primaryMenu: "history",
    device: "tablet",
    focus: ["history", "growth", "research"],
  },
];

const DEVICES = ["mobile", "tablet", "desktop"];

function deviceForIndex(i) {
  return DEVICES[i % 3];
}

function seedBrand(rowIndex) {
  const seed = QUICK_DEMO_POOL[rowIndex % QUICK_DEMO_POOL.length];
  return {
    brandName: seed.brandName,
    region: seed.region,
    topic: seed.topic,
    mainKeyword: seed.mainKeyword,
  };
}

function buildPersona(row, col, index) {
  const industry = INDUSTRIES[row];
  const journey = JOURNEY_TYPES[col];
  const id = `u${String(index + 1).padStart(3, "0")}`;
  const device =
    journey.device === "mobile" || journey.device === "tablet"
      ? journey.device
      : deviceForIndex(row + col);

  let primaryMenu = journey.primaryMenu;
  if (journey.id === "channel_standalone") {
    primaryMenu = row % 2 === 0 ? "place" : "insta";
  }

  return {
    id,
    label: `${industry.label} · ${journey.label}`,
    industry: industry.id,
    industryLabel: industry.label,
    journeyType: journey.id,
    journeyLabel: journey.label,
    needsAuth: journey.needsAuth,
    device,
    viewport:
      device === "mobile"
        ? { width: 390, height: 844 }
        : device === "tablet"
          ? { width: 834, height: 1194 }
          : { width: 1440, height: 900 },
    primaryMenu,
    focus: journey.focus,
    brand: seedBrand(row),
    sensitiveIndustry: industry.id === "medical",
  };
}

/** 100명 — 업종 행 × 여정 열 */
export const HUNDRED_USER_PERSONAS = (() => {
  const list = [];
  let n = 0;
  for (let row = 0; row < INDUSTRIES.length; row += 1) {
    for (let col = 0; col < JOURNEY_TYPES.length; col += 1) {
      list.push(buildPersona(row, col, n));
      n += 1;
    }
  }
  return list;
})();

export const HUNDRED_USER_CLUSTERS = JOURNEY_TYPES.map((j) => ({
  journeyType: j.id,
  label: j.label,
  personaIds: HUNDRED_USER_PERSONAS.filter((p) => p.journeyType === j.id).map(
    (p) => p.id
  ),
}));

export function getHundredUserPersona(id) {
  return HUNDRED_USER_PERSONAS.find((p) => p.id === id);
}

export function getPersonasByJourney(journeyType) {
  return HUNDRED_USER_PERSONAS.filter((p) => p.journeyType === journeyType);
}

export function getPersonasByDevice(device) {
  return HUNDRED_USER_PERSONAS.filter((p) => p.device === device);
}
