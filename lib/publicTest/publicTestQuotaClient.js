import { PUBLIC_TEST_DAILY_LIMIT } from "@/lib/publicTest/publicTestConfig";
import { getUnifiedVisitSessionId } from "@/lib/analytics/visitSessionClient";

const STORAGE_COUNT_PREFIX = "briclog-public-test-count-";

export function getPublicTestSessionId() {
  return getUnifiedVisitSessionId();
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function getLocalPublicTestQuota() {
  if (typeof window === "undefined") {
    return { used: 0, remaining: PUBLIC_TEST_DAILY_LIMIT };
  }
  const raw = localStorage.getItem(`${STORAGE_COUNT_PREFIX}${todayKey()}`);
  const used = raw ? Number(raw) || 0 : 0;
  return {
    used,
    remaining: Math.max(0, PUBLIC_TEST_DAILY_LIMIT - used),
  };
}

export function bumpLocalPublicTestQuota() {
  if (typeof window === "undefined") return getLocalPublicTestQuota();
  const key = `${STORAGE_COUNT_PREFIX}${todayKey()}`;
  const used = (Number(localStorage.getItem(key)) || 0) + 1;
  localStorage.setItem(key, String(used));
  return {
    used,
    remaining: Math.max(0, PUBLIC_TEST_DAILY_LIMIT - used),
  };
}

export function stashPublicTestDraftForSignup(draft = {}) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      "briclog-public-test-signup-draft",
      JSON.stringify({
        brandName: draft.brandName,
        region: draft.region,
        topic: draft.topic,
        at: Date.now(),
      })
    );
  } catch {
    /* ignore */
  }
}
