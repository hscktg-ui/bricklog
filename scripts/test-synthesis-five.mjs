/**
 * Claude·Jobs·Musk synthesis — 5-test gate before ship
 */
import { spawnSync } from "child_process";

const tests = [
  "test:fifth-rank-p0-gates",
  "test:keynote-demo-pack",
  "test:signup-trust-copy",
  "test:ui-delivery-smoke",
  "test:prod-health",
];

let failed = 0;
for (const name of tests) {
  console.log(`\n=== ${name} ===\n`);
  const r = spawnSync("npm", ["run", name], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (r.status !== 0) {
    failed += 1;
    console.error(`FAIL ${name}`);
  } else {
    console.log(`OK ${name}`);
  }
}

console.log(`\nsynthesis-five: ${tests.length - failed}/${tests.length} pass`);
process.exit(failed ? 1 : 0);
