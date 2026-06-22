/**
 * prod 베타 무제한 해제 회귀
 */
import assert from "node:assert/strict";
import { isBetaFullAccessActive } from "../lib/billing/betaAccess.js";

const prevBeta = process.env.BRICLOG_BETA_FULL_ACCESS;
const prevVercel = process.env.VERCEL_ENV;
const prevUntil = process.env.BETA_FULL_ACCESS_UNTIL;

process.env.BETA_FULL_ACCESS_UNTIL = "2099-12-31";
process.env.VERCEL_ENV = "production";
delete process.env.BRICLOG_BETA_FULL_ACCESS;
assert.equal(
  isBetaFullAccessActive(),
  false,
  "production disables beta bypass by default"
);

process.env.BRICLOG_BETA_FULL_ACCESS = "true";
assert.equal(
  isBetaFullAccessActive(),
  true,
  "production allows beta when explicitly enabled"
);

delete process.env.VERCEL_ENV;
assert.equal(isBetaFullAccessActive(), true, "non-prod respects beta until date");

if (prevBeta === undefined) delete process.env.BRICLOG_BETA_FULL_ACCESS;
else process.env.BRICLOG_BETA_FULL_ACCESS = prevBeta;
if (prevVercel === undefined) delete process.env.VERCEL_ENV;
else process.env.VERCEL_ENV = prevVercel;
if (prevUntil === undefined) delete process.env.BETA_FULL_ACCESS_UNTIL;
else process.env.BETA_FULL_ACCESS_UNTIL = prevUntil;

console.log("OK: beta-access-prod");
