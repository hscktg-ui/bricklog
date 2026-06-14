import { pickSessionIndex } from "@/lib/landing/landingSession";
import {
  getPublicTestSampleByIndex,
  PUBLIC_TEST_SAMPLE_COUNT,
} from "@/lib/publicTest/publicTestSamples";

export const STORAGE_PUBLIC_TEST_SAMPLE = "briclog-public-test-sample-idx";
const STORAGE_PUBLIC_TEST_POOL_VERSION = "briclog-public-test-sample-pool-v2";

function ensurePublicTestSamplePoolVersion() {
  if (typeof window === "undefined") return;
  const poolVer = sessionStorage.getItem(STORAGE_PUBLIC_TEST_POOL_VERSION);
  if (poolVer !== "2") {
    sessionStorage.removeItem(STORAGE_PUBLIC_TEST_SAMPLE);
    sessionStorage.setItem(STORAGE_PUBLIC_TEST_POOL_VERSION, "2");
  }
}

/** 이번 방문에 쓸 가상 샘플 (클라이언트) */
export function pickPublicTestSampleForSession() {
  ensurePublicTestSamplePoolVersion();
  const idx = pickSessionIndex(
    STORAGE_PUBLIC_TEST_SAMPLE,
    PUBLIC_TEST_SAMPLE_COUNT
  );
  return { ...getPublicTestSampleByIndex(idx), index: idx };
}

export function getNextPublicTestSampleIndex(current = 0) {
  return (current + 1) % PUBLIC_TEST_SAMPLE_COUNT;
}
