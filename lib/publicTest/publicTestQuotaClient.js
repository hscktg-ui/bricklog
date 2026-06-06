import { PUBLIC_TEST_DAILY_LIMIT } from "@/lib/publicTest/publicTestConfig";

const STORAGE_SESSION = "briclog-public-test-session-id";
const STORAGE_COUNT_PREFIX = "briclog-public-test-count-";

export function getPublicTestSessionId() {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(STORAGE_SESSION);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `pt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(STORAGE_SESSION, id);
  }
  return id;
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
