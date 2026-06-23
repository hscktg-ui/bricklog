/**
 * Launch publish-first flags — briclogDefaults SSOT
 */
import {
  getDefaultLaunchPublishBudgetMs,
  getDefaultLaunchClientFetchMs,
  getDefaultLaunchMaxAttempts,
  BRICLOG_PIPELINE_DEFAULTS,
} from "@/lib/config/briclogDefaults";

export const LAUNCH_PUBLISH_TIME_BUDGET_MS = getDefaultLaunchPublishBudgetMs();
export const LAUNCH_PUBLISH_MAX_LLM_ATTEMPTS = getDefaultLaunchMaxAttempts();
export const LAUNCH_PUBLISH_CLIENT_FETCH_MS = getDefaultLaunchClientFetchMs();

export function isLaunchPublishFirstMode() {
  if (process.env.BRICLOG_LAUNCH_PUBLISH_FIRST === "false") return false;
  if (process.env.BRICLOG_LAUNCH_PUBLISH_FIRST === "true") return true;
  return BRICLOG_PIPELINE_DEFAULTS.launchPublishFirst;
}

export function getLaunchPublishTimeBudgetMs() {
  return getDefaultLaunchPublishBudgetMs();
}

export function getLaunchPublishMaxAttempts() {
  return getDefaultLaunchMaxAttempts();
}

export function shouldWithholdCustomerDelivery() {
  return !isLaunchPublishFirstMode();
}
