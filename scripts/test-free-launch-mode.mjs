/**
 * free launch mode — studio entitlements, checkout off
 */
import assert from "node:assert/strict";
import {
  freeLaunchPlanOverride,
  isBriclogFreeLaunchMode,
} from "../lib/billing/freeLaunchMode.js";
import { betaPlanOverride } from "../lib/billing/betaAccess.js";
import { getBillingPresentation } from "../lib/billing/billingPresentation.js";

process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_FREE_LAUNCH = "true";

assert.equal(isBriclogFreeLaunchMode(), true);
const override = freeLaunchPlanOverride();
assert.equal(override?.planId, "studio");
assert.equal(override?.bypassQuotas, true);
assert.equal(betaPlanOverride()?.source, "free_launch");

const ui = getBillingPresentation();
assert.equal(ui.checkoutEnabled, false);
assert.equal(ui.paymentStatus, "free_launch");
assert.equal(ui.freeLaunchActive, true);

console.log("OK free-launch-mode");
