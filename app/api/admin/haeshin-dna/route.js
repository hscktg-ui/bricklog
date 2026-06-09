import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api/adminGuard";
import {
  BLOG_STRUCTURE_ARC,
  DEFAULT_STYLE_PROFILE,
  FAILURE_ARTICLE_RULES,
  FORBIDDEN_GLOBAL_PHRASES,
  AI_CLICHE_PHRASES,
  HAESHIN_CONTENT_PHILOSOPHY,
  HAESHIN_DNA_VERSION,
  HAESHIN_SCORE_WEIGHTS,
  INDUSTRY_CONTENT_DNA,
  KIM_TAEGYU_VOICE_DNA,
} from "@/lib/golden/haeshinContentDnaSeed";
import { GOLDEN_FAILURE_SAMPLES } from "@/lib/golden/goldenFailureSeed";
import { GOLDEN_SEED_SAMPLES } from "@/lib/golden/goldenSeedSamples";
import {
  getEffectiveAiCliche,
  getEffectiveForbiddenGlobal,
  getHaeshinDnaOverrides,
  patchHaeshinDnaOverrides,
} from "@/lib/golden/haeshinDnaOverrides.server";

export const runtime = "nodejs";

export async function GET(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;

  const overrides = getHaeshinDnaOverrides();

  return NextResponse.json({
    ok: true,
    version: HAESHIN_DNA_VERSION,
    philosophy: HAESHIN_CONTENT_PHILOSOPHY,
    styleProfile: DEFAULT_STYLE_PROFILE,
    structureArc: BLOG_STRUCTURE_ARC,
    forbiddenGlobal: getEffectiveForbiddenGlobal(),
    aiCliche: getEffectiveAiCliche(),
    forbiddenGlobalSeed: FORBIDDEN_GLOBAL_PHRASES,
    aiClicheSeed: AI_CLICHE_PHRASES,
    overrides,
    kimTaegyuVoice: KIM_TAEGYU_VOICE_DNA,
    industryDna: INDUSTRY_CONTENT_DNA,
    failureRules: FAILURE_ARTICLE_RULES,
    scoreWeights: HAESHIN_SCORE_WEIGHTS,
    seedExcellentCount: GOLDEN_SEED_SAMPLES.length,
    seedFailureCount: GOLDEN_FAILURE_SAMPLES.length,
    seedFailureSamples: GOLDEN_FAILURE_SAMPLES,
  });
}

/** 금칙어·AI 관용구 운영 추가 (config/haeshin-dna-overrides.json) */
export async function PATCH(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied) return gate.denied;
  if (gate.rateLimited) return gate.rateLimited;

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  try {
    const next = patchHaeshinDnaOverrides({
      addForbidden: body.addForbidden || body.forbiddenGlobal,
      addAiCliche: body.addAiCliche || body.aiCliche,
      removeForbidden: body.removeForbidden,
      removeAiCliche: body.removeAiCliche,
    });
    return NextResponse.json({
      ok: true,
      overrides: next,
      forbiddenGlobal: getEffectiveForbiddenGlobal(),
      aiCliche: getEffectiveAiCliche(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
