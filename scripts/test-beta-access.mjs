import {
  DEFAULT_BETA_UNTIL,
  isBetaFullAccessActive,
  parseBetaEndExclusive,
} from "../lib/billing/betaAccess.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log("\n=== BETA ACCESS ===\n");
assert(DEFAULT_BETA_UNTIL === "2026-07-15", "default until 2026-07-15");

const end = parseBetaEndExclusive("2026-07-15");
assert(
  end.getTime() === new Date("2026-07-16T00:00:00").getTime(),
  "inclusive Jul 15"
);

assert(
  isBetaFullAccessActive(new Date("2026-07-15T12:00:00")),
  "active on Jul 15 noon"
);
assert(
  !isBetaFullAccessActive(new Date("2026-07-16T00:00:00")),
  "inactive from Jul 16"
);

console.log("ALL BETA ACCESS TESTS OK\n");
