/**
 * Golden Dataset — 서버 생성 시 DB·파일 우수글 hydrate
 */
import { loadAllGoldenSamples } from "@/lib/golden/goldenDatasetStore.server";

let runtimeCache = null;
let runtimeCacheAt = 0;
const RUNTIME_CACHE_MS = 60_000;

async function loadRuntimeGoldenSamples() {
  if (runtimeCache && Date.now() - runtimeCacheAt < RUNTIME_CACHE_MS) {
    return runtimeCache;
  }
  try {
    const { createServiceSupabase } = await import("@/lib/supabase/server");
    const db = createServiceSupabase?.();
    runtimeCache = await loadAllGoldenSamples(db);
  } catch {
    runtimeCache = await loadAllGoldenSamples(null);
  }
  runtimeCacheAt = Date.now();
  return runtimeCache;
}

/** @param {object} input */
export async function hydrateGoldenSamplesForInput(input = {}) {
  if (input._goldenSamplesHydrated || typeof window !== "undefined") {
    return input;
  }
  const samples = await loadRuntimeGoldenSamples();
  return {
    ...input,
    goldenSamples: samples,
    _goldenSamplesHydrated: true,
  };
}
