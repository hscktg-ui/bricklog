import assert from "node:assert/strict";
import {
  getUnifiedVisitSessionId,
  PUBLIC_TEST_SESSION_KEY,
  VISIT_SESSION_KEY,
} from "../lib/analytics/visitSessionClient.js";
import { getPublicTestSessionId } from "../lib/publicTest/publicTestQuotaClient.js";

class MemoryStorage {
  constructor() {
    this.data = new Map();
  }
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }
  setItem(key, value) {
    this.data.set(key, String(value));
  }
  clear() {
    this.data.clear();
  }
}

globalThis.window = {};
globalThis.sessionStorage = new MemoryStorage();

sessionStorage.setItem(VISIT_SESSION_KEY, "visit-first");
assert.equal(getPublicTestSessionId(), "visit-first");
assert.equal(sessionStorage.getItem(PUBLIC_TEST_SESSION_KEY), "visit-first");

sessionStorage.clear();
sessionStorage.setItem(PUBLIC_TEST_SESSION_KEY, "test-first");
assert.equal(getUnifiedVisitSessionId(), "test-first");
assert.equal(sessionStorage.getItem(VISIT_SESSION_KEY), "test-first");

sessionStorage.clear();
const created = getUnifiedVisitSessionId();
assert.ok(created);
assert.equal(sessionStorage.getItem(VISIT_SESSION_KEY), created);
assert.equal(sessionStorage.getItem(PUBLIC_TEST_SESSION_KEY), created);

console.log("OK: visit · public test · signup share one session_id");
