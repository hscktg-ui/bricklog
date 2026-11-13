/**
 * Smoke: cron GET handlers export + auth accepts CRON_SECRET.
 * Run: node --import ./scripts/register-alias.mjs scripts/test-cron-auto-refresh.mjs
 */
import assert from "node:assert/strict";
import { authorizeCronRequest, getCronSecretCandidates } from "../lib/cron/cronAuth.js";

const prev = {
  CRON_SECRET: process.env.CRON_SECRET,
  BRICLOG_CRON_SECRET: process.env.BRICLOG_CRON_SECRET,
  TREND_COLLECT_SECRET: process.env.TREND_COLLECT_SECRET,
};

try {
  delete process.env.CRON_SECRET;
  delete process.env.BRICLOG_CRON_SECRET;
  delete process.env.TREND_COLLECT_SECRET;

  assert.equal(getCronSecretCandidates().length, 0);
  assert.equal(
    authorizeCronRequest(new Request("https://briclog.ai/api/trends/collect")).status,
    503
  );

  process.env.CRON_SECRET = "vercel-cron-secret";
  process.env.BRICLOG_CRON_SECRET = "briclog-only";

  const okReq = new Request("https://briclog.ai/api/trends/collect", {
    headers: { authorization: "Bearer vercel-cron-secret" },
  });
  assert.equal(authorizeCronRequest(okReq).ok, true);

  const altReq = new Request("https://briclog.ai/api/trends/collect", {
    headers: { authorization: "Bearer briclog-only" },
  });
  assert.equal(authorizeCronRequest(altReq).ok, true);

  const badReq = new Request("https://briclog.ai/api/trends/collect", {
    headers: { authorization: "Bearer wrong" },
  });
  assert.equal(authorizeCronRequest(badReq).status, 401);

  console.log("ok: cron auto-refresh auth");
} finally {
  for (const [k, v] of Object.entries(prev)) {
    if (v == null) delete process.env[k];
    else process.env[k] = v;
  }
}
