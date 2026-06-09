import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import {
  AI_CLICHE_PHRASES,
  BLOG_STRUCTURE_ARC,
  DEFAULT_STYLE_PROFILE,
  FAILURE_ARTICLE_RULES,
  FORBIDDEN_GLOBAL_PHRASES,
  HAESHIN_CONTENT_PHILOSOPHY,
  HAESHIN_DNA_VERSION,
  HAESHIN_SCORE_WEIGHTS,
  INDUSTRY_CONTENT_DNA,
  KIM_TAEGYU_VOICE_DNA,
} from "@/lib/golden/haeshinContentDnaSeed";
import { GOLDEN_FAILURE_SAMPLES } from "@/lib/golden/goldenFailureSeed";
import { GOLDEN_SEED_SAMPLES } from "@/lib/golden/goldenSeedSamples";

export const runtime = "nodejs";

export async function GET(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;

  return NextResponse.json({
    ok: true,
    version: HAESHIN_DNA_VERSION,
    philosophy: HAESHIN_CONTENT_PHILOSOPHY,
    styleProfile: DEFAULT_STYLE_PROFILE,
    structureArc: BLOG_STRUCTURE_ARC,
    forbiddenGlobal: FORBIDDEN_GLOBAL_PHRASES,
    aiCliche: AI_CLICHE_PHRASES,
    kimTaegyuVoice: KIM_TAEGYU_VOICE_DNA,
    industryDna: INDUSTRY_CONTENT_DNA,
    failureRules: FAILURE_ARTICLE_RULES,
    scoreWeights: HAESHIN_SCORE_WEIGHTS,
    seedExcellentCount: GOLDEN_SEED_SAMPLES.length,
    seedFailureCount: GOLDEN_FAILURE_SAMPLES.length,
    seedFailureSamples: GOLDEN_FAILURE_SAMPLES,
  });
}
