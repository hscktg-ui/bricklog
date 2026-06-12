/**
 * 브릭로그 맥락·발행 준비도 — 가입 전 샘플·작업실 공통 품질 표시
 * (단순 맥락 점수가 아니라 브랜드·지역·주제·근거·채널 확장을 분리해 보여 줌)
 */
import { resolvePublishReadiness } from "@/lib/product/publishReadinessDisplay";
import { resolvePublishGrade } from "@/lib/product/publishGradeDisplay";
import { assessBriclogSurfaceDepth } from "@/lib/product/engineeringDepthLevels";

function clampScore(n, min = 42, max = 94) {
  if (typeof n !== "number" || Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * @param {Record<string, unknown>} input
 * @param {object} pack
 * @param {object} gate
 */
export function buildBriclogContextScore(input = {}, pack = {}, gate = {}) {
  const relevance = gate.relevance?.rate ?? 0;
  const groundedRate =
    typeof gate.grounded?.rate === "number"
      ? gate.grounded.rate
      : gate.grounded?.ok
        ? 0.78
        : 0.55;
  const v3 = pack._meta?.qualityScore?.v3?.scores;
  const v2 =
    pack._meta?.qualityScore?.v2?.scores || pack._meta?.v2Axis?.scores;

  const axes = [
    {
      id: "brand",
      label: "브랜드 맥락",
      score: clampScore(v3?.brand ?? v2?.brand ?? 50 + relevance * 40),
    },
    {
      id: "region",
      label: "지역 정합",
      score: clampScore(v3?.region ?? v2?.region ?? 48 + relevance * 38),
    },
    {
      id: "topic",
      label: "주제 답변",
      score: clampScore(v3?.topic ?? v2?.product ?? 52 + relevance * 36),
    },
    {
      id: "trust",
      label: "신뢰·근거",
      score: clampScore(
        v3?.trust ??
          v2?.grounding ??
          (groundedRate * 88 + (gate.infoCount >= 3 ? 6 : 0))
      ),
    },
  ];

  const v3Nums = v3
    ? Object.values(v3).filter((n) => typeof n === "number")
    : [];
  const engineTotal =
    pack._meta?.qualityScore?.total ?? pack._meta?.aiEditorAudit?.score;
  const axisAvg =
    axes.reduce((sum, a) => sum + a.score, 0) / Math.max(1, axes.length);
  const v3Avg =
    v3Nums.length > 0
      ? v3Nums.reduce((a, b) => a + b, 0) / v3Nums.length
      : null;

  const goldenGate = pack._meta?.goldenGate;
  const haeshinScore =
    goldenGate?.haeshin?.score ?? pack._meta?.haeshinScore;
  const goldenScore = goldenGate?.score ?? pack._meta?.goldenGateScore;
  const llmPolished =
    pack._meta?.llmDeliveryPolish || pack._meta?.llmAdaptivePublish;

  const sqvScore = pack._meta?.sqv?.score;
  const editorGrade =
    pack._meta?.professionalEditorGrade || pack._meta?.sqv?.professionalEditorGrade;

  let publishScore = clampScore(engineTotal ?? v3Avg ?? axisAvg);
  if (typeof sqvScore === "number") {
    publishScore = clampScore(Math.max(publishScore, sqvScore));
  }
  if (editorGrade) {
    publishScore = clampScore(Math.max(publishScore, 88));
  }
  if (pack._meta?.publishReady && typeof goldenScore === "number") {
    publishScore = clampScore(
      Math.max(publishScore, goldenScore, haeshinScore ?? 0)
    );
  } else if (llmPolished && typeof haeshinScore === "number") {
    publishScore = clampScore(
      Math.max(publishScore, Math.round(haeshinScore * 0.92 + (goldenScore ?? haeshinScore) * 0.08))
    );
  }

  const readiness = resolvePublishReadiness(pack);
  const industry = input.contextLock?.industry || input.industry || "브랜드";

  const channelOpts = gate.channelOpts || {};
  const channels = [
    {
      id: "blog",
      label: "이야기",
      ready: Boolean(pack?.sections?.length),
      hint: channelOpts.blogHint || "지금 본 샘플",
    },
    {
      id: "place",
      label: "플레이스",
      ready:
        channelOpts.hasPlace ||
        (publishScore >= 70 && relevance >= 0.55),
      hint: channelOpts.placeHint || "작업실에서 이어 만들기",
    },
    {
      id: "insta",
      label: "인스타",
      ready:
        channelOpts.hasInsta ||
        (publishScore >= 68 && relevance >= 0.5),
      hint: channelOpts.instaHint || "작업실에서 이어 만들기",
    },
  ];

  const depth = assessBriclogSurfaceDepth({
    hasContextScore: true,
    hasWorkspaceScore: Boolean(channelOpts.workspace),
    hasPublicTest: Boolean(input.publicTestMode),
    hasMultiChannel: channels.some((c) => c.id !== "blog" && c.ready),
    hasBrandMemory: Boolean(input.brandId || input.brandMemory?.id),
    generationReliable: readiness.status === "ready",
  });

  const publishGrade = resolvePublishGrade({
    publishScore,
    readiness: { status: readiness.status },
    professionalEditorGrade: editorGrade,
  });

  const sqvDiagnostic =
    typeof sqvScore === "number"
      ? { score: sqvScore, grade: pack._meta?.sqv?.grade, label: `글값 ${pack._meta?.sqv?.grade || "—"} (${sqvScore})` }
      : null;

  return {
    publishScore,
    publishGrade,
    sqvDiagnostic,
    humanVoiceMet: pack._meta?.humanVoiceMet,
    catalogProseOk: pack._meta?.humanColumnProseScore?.ok !== false,
    brandUnderstandingPct: clampScore(relevance * 100, 38, 92),
    axes,
    readiness: {
      status: readiness.status,
      label: readiness.label,
      hint: readiness.hint,
    },
    channels,
    checks: {
      relevancePct: Math.round(relevance * 100),
      infoUnits: gate.infoCount ?? 0,
      grounded: gate.grounded?.ok !== false,
    },
    depth,
    improvementHint:
      pack._meta?.publishReady && llmPolished
        ? "조사·업종 DNA 기반 AI 원고를 해신 기준으로 마감했습니다. 그대로 복사해 올리셔도 됩니다."
        : publishScore >= 80
          ? "작업실을 만들면 톤·반복 메시지·지난 글이 쌓여 다음 발행 준비도가 더 올라갑니다."
          : `${industry} 맥락과 근거를 작업실에 쌓으면 발행 준비도가 올라갑니다.`,
    qualityGate:
      typeof haeshinScore === "number" || typeof goldenScore === "number"
        ? {
            haeshin: haeshinScore,
            golden: goldenScore,
            llmPolished: Boolean(llmPolished),
            adaptiveMode: pack._meta?.adaptiveQualityModeLabel,
          }
        : null,
  };
}

/** 작업실 편집본 — gate 없이 메타·입력에서 추정 */
export function buildWorkspaceContextScore(pack = {}, blogInput = {}, opts = {}) {
  const meta = pack._meta || {};
  const qs = meta.qualityScore || {};
  const relevance =
    meta.contextRelevance ??
    meta.similarity?.rate ??
    (qs.v3?.scores?.topic ? qs.v3.scores.topic / 100 : 0.72);

  return buildBriclogContextScore(blogInput, pack, {
    relevance: { rate: relevance },
    infoCount:
      meta.informationUnitCount ??
      blogInput.researchFactCount ??
      blogInput.researchFacts?.length ??
      0,
    grounded: {
      ok:
        meta.researchGroundedHumanPack ||
        meta.researchFactsWoven ||
        (blogInput.researchFacts?.length ?? 0) >= 2,
    },
    channelOpts: {
      workspace: true,
      hasPlace: Boolean(opts.hasPlace),
      hasInsta: Boolean(opts.hasInsta),
      blogHint: "현재 편집본",
      placeHint: opts.hasPlace ? "생성됨" : "메뉴에서 이어 만들기",
      instaHint: opts.hasInsta ? "생성됨" : "메뉴에서 이어 만들기",
    },
  });
}
