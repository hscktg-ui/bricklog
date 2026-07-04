/**
 * prod 베타 — 날짜 컷오프 기준 (7/15까지 포함)
 */
import assert from "node:assert/strict";
import { isBetaFullAccessActive } from "../lib/billing/betaAccess.js";

const prevBeta = process.env.BRICLOG_BETA_FULL_ACCESS;
const prevVercel = process.env.VERCEL_ENV;
const prevUntil = process.env.BETA_FULL_ACCESS_UNTIL;

process.env.BETA_FULL_ACCESS_UNTIL = "2026-07-15";
process.env.VERCEL_ENV = "production";
delete process.env.BRICLOG_BETA_FULL_ACCESS;
assert.equal(
  isBetaFullAccessActive(new Date("2026-07-15T12:00:00")),
  true,
  "production respects beta until inclusive cutoff"
);
assert.equal(
  isBetaFullAccessActive(new Date("2026-07-16T00:00:00")),
  false,
  "production ends beta after cutoff"
);

process.env.BRICLOG_BETA_FULL_ACCESS = "false";
assert.equal(
  isBetaFullAccessActive(new Date("2026-07-10T12:00:00")),
  false,
  "BRICLOG_BETA_FULL_ACCESS=false disables beta"
);

delete process.env.BRICLOG_BETA_FULL_ACCESS;
delete process.env.VERCEL_ENV;
assert.equal(
  isBetaFullAccessActive(new Date("2026-07-15T12:00:00")),
  true,
  "non-prod respects beta until date"
);

if (prevBeta === undefined) delete process.env.BRICLOG_BETA_FULL_ACCESS;
else process.env.BRICLOG_BETA_FULL_ACCESS = prevBeta;
if (prevVercel === undefined) delete process.env.VERCEL_ENV;
else process.env.VERCEL_ENV = prevVercel;
if (prevUntil === undefined) delete process.env.BETA_FULL_ACCESS_UNTIL;
else process.env.BETA_FULL_ACCESS_UNTIL = prevUntil;

console.log("OK: beta-access-prod");
