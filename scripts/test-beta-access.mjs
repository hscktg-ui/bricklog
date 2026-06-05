import {
  DEFAULT_BETA_UNTIL,
  isBetaFullAccessActive,
  parseBetaEndExclusive,
} from "../lib/billing/betaAccess.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log("\n=== BETA ACCESS ===\n");
assert(DEFAULT_BETA_UNTIL === "2026-08-01", "default until 2026-08-01");

const end = parseBetaEndExclusive("2026-08-01");
assert(end.getTime() === new Date("2026-08-02T00:00:00").getTime(), "inclusive Aug 1");

assert(
  isBetaFullAccessActive(new Date("2026-08-01T12:00:00")),
  "active on Aug 1 noon"
);
assert(
  !isBetaFullAccessActive(new Date("2026-08-02T00:00:00")),
  "inactive from Aug 2"
);

console.log("ALL BETA ACCESS TESTS OK\n");
