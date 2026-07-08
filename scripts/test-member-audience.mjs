/**
 * memberAudience — 팀·외부 분류 회귀
 * Run: npm run test:member-audience
 */
import assert from "node:assert/strict";
import { classifyMemberAudience } from "../lib/admin/memberAudience.js";

assert.ok(
  ["team_internal", "admin_operator"].includes(classifyMemberAudience("hscktg@gmail.com")),
  "hscktg team or admin"
);
assert.equal(classifyMemberAudience("qpdb1818@naver.com"), "external");
assert.equal(classifyMemberAudience("hundred-ux-smoke@briclog.ai"), "e2e_test");
assert.equal(classifyMemberAudience("meticulous-123@briclog.ai"), "automated_test");
assert.equal(classifyMemberAudience("charoo333@naver.com"), "team_internal");

console.log("OK member-audience (5 cases)");
