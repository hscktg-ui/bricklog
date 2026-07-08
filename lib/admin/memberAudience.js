/**
 * Admin 회원 분류 — 운영자 · 팀 · 테스트 · 외부
 * BRICLOG_TEAM_EMAILS(쉼표)로 팀 로스터 덮어쓰기 가능
 */
import { isAdminEmail } from "@/lib/api/auth";
import { E2E_TEST_EMAIL } from "@/lib/qa/e2eTestCredentials";

/** @typedef {"admin_operator"|"team_internal"|"e2e_test"|"automated_test"|"external"} MemberAudience */

const DEFAULT_TEAM_EMAILS = [
  "hscktg@gmail.com",
  "haeshincompany@naver.com",
  "leenk0302@naver.com",
  "charoo333@naver.com",
  "paenoo@naver.com",
];

export const MEMBER_AUDIENCE_LABELS = {
  admin_operator: "운영자",
  team_internal: "팀·직원",
  e2e_test: "E2E 테스트",
  automated_test: "자동화 테스트",
  external: "외부 유저",
};

function teamEmailSet() {
  const raw = String(process.env.BRICLOG_TEAM_EMAILS || "").trim();
  const fromEnv = raw
    ? raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
    : [];
  const merged = new Set([...DEFAULT_TEAM_EMAILS.map((e) => e.toLowerCase()), ...fromEnv]);
  return merged;
}

/**
 * @param {string} [email]
 * @returns {MemberAudience}
 */
export function classifyMemberAudience(email = "") {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return "external";
  if (isAdminEmail(e)) return "admin_operator";
  if (teamEmailSet().has(e)) return "team_internal";
  if (e === E2E_TEST_EMAIL.toLowerCase()) return "e2e_test";
  if (/@briclog\.ai$/i.test(e)) return "automated_test";
  if (/^meticulous-/i.test(e) || /^hundred-/i.test(e)) return "automated_test";
  if (/smoke|e2e|test@/i.test(e)) return "automated_test";
  return "external";
}

export function isExternalAudience(audience) {
  return audience === "external";
}

export function isInternalAudience(audience) {
  return audience !== "external";
}
