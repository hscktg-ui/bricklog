/**
 * Smoke: admin extras cache single-flight + TTL.
 * Run: node --import ./scripts/register-alias.mjs scripts/test-admin-dashboard-cache.mjs
 */
import assert from "node:assert/strict";
import {
  clearAdminExtrasCache,
  withAdminExtrasCache,
} from "../lib/admin/adminDashboardCache.js";

clearAdminExtrasCache();
let loads = 0;
const loader = async () => {
  loads += 1;
  await new Promise((r) => setTimeout(r, 40));
  return { n: loads };
};

const [a, b] = await Promise.all([
  withAdminExtrasCache("k", loader),
  withAdminExtrasCache("k", loader),
]);
assert.equal(loads, 1, "single-flight should load once");
assert.deepEqual(a, b);

const c = await withAdminExtrasCache("k", loader);
assert.equal(loads, 1, "TTL cache should reuse");
assert.deepEqual(c, a);

const d = await withAdminExtrasCache("k", loader, { force: true });
assert.equal(loads, 2, "force should reload");
assert.equal(d.n, 2);

console.log("ok: admin dashboard cache");
