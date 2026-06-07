/**
 * 제품·엔지니어링 깊이 레벨 (1~5) — 경쟁 벤치마크·표면 품질 SSOT
 *
 * L1 표면: 랜딩·로그인·단일 출력
 * L2 실행: 폼→API→결과 1경로, 단일 지표
 * L3 맥락: 전용 인증·맥락 읽기·독자적 점수(SMC Score급)·B2B 톤
 * L4 파이프라인: 다축 점수·조사·검수·재작성·멀티채널·메모리
 * L5 폐루프: E2E SLA·학습·관측·배포 검증이 점수·품질에 연결
 */

export const DEPTH_LEVELS = {
  1: {
    id: 1,
    key: "surface",
    label: "L1 · 표면",
    summary: "랜딩·로그인·단일 결과",
  },
  2: {
    id: 2,
    key: "execute",
    label: "L2 · 실행",
    summary: "폼→생성 1경로, 단일 점수",
  },
  3: {
    id: 3,
    key: "context",
    label: "L3 · 맥락",
    summary: "맥락 엔진·독자적 점수·인증 UX",
  },
  4: {
    id: 4,
    key: "pipeline",
    label: "L4 · 파이프라인",
    summary: "다축 검수·조사·멀티채널·메모리",
  },
  5: {
    id: 5,
    key: "closed_loop",
    label: "L5 · 폐루프",
    summary: "SLA·학습·관측이 품질에 연결",
  },
};

/** 5축 × 1~5 (2026-06 기준 정성 벤치마크) */
export const DEPTH_BENCHMARK = {
  lens: {
    name: "SMC Lens",
    overall: 3.2,
    axes: {
      authProduct: 3.6,
      scoreSurface: 3.5,
      contextPipeline: 2.8,
      multiChannel: 2.0,
      memoryLoop: 2.2,
      reliability: 3.0,
    },
    strengths: ["전용 로그인·redirect", "SMC Score 노출", "맥락 읽기 내러티브"],
    gaps: ["한국 채널·발행 준비·가입 전 샘플·브랜드 기록"],
  },
  briclog: {
    name: "BRICLOG",
    /** 파이프라인 엔진 깊이 (내부) */
    engineOverall: 4.4,
    /** 사용자가 체감하는 표면 깊이 (개선 전 기준) */
    surfaceOverall: 2.9,
    axes: {
      authProduct: 3.2,
      scoreSurface: 2.6,
      contextPipeline: 4.5,
      multiChannel: 4.2,
      memoryLoop: 4.0,
      reliability: 3.1,
    },
    targetSurfaceOverall: 4.0,
  },
};

const SURFACE_WEIGHTS = {
  scoreSurface: 0.28,
  contextPipeline: 0.18,
  multiChannel: 0.18,
  memoryLoop: 0.14,
  authProduct: 0.12,
  reliability: 0.1,
};

function weightedOverall(axes = {}) {
  let sum = 0;
  let w = 0;
  for (const [key, weight] of Object.entries(SURFACE_WEIGHTS)) {
    const v = axes[key];
    if (typeof v !== "number") continue;
    sum += v * weight;
    w += weight;
  }
  return w > 0 ? Math.round((sum / w) * 10) / 10 : 0;
}

export function overallToDepthLevel(overall) {
  if (overall >= 4.5) return 5;
  if (overall >= 3.6) return 4;
  if (overall >= 2.8) return 3;
  if (overall >= 2.0) return 2;
  return 1;
}

/**
 * 런타임 표면 기능으로 BRICLOG 체감 깊이 추정
 * @param {{ hasContextScore?: boolean, hasWorkspaceScore?: boolean, hasPublicTest?: boolean, hasMultiChannel?: boolean, hasBrandMemory?: boolean, generationReliable?: boolean }} flags
 */
export function assessBriclogSurfaceDepth(flags = {}) {
  const axes = { ...DEPTH_BENCHMARK.briclog.axes };

  if (flags.hasContextScore || flags.hasWorkspaceScore) {
    axes.scoreSurface = Math.max(axes.scoreSurface, 3.8);
  }
  if (flags.hasPublicTest) {
    axes.authProduct = Math.max(axes.authProduct, 3.5);
    axes.scoreSurface = Math.max(axes.scoreSurface, 3.6);
  }
  if (flags.hasMultiChannel) {
    axes.multiChannel = Math.max(axes.multiChannel, 4.2);
  }
  if (flags.hasBrandMemory) {
    axes.memoryLoop = Math.max(axes.memoryLoop, 4.0);
  }
  if (flags.generationReliable) {
    axes.reliability = Math.max(axes.reliability, 3.8);
  }

  const surfaceOverall = weightedOverall(axes);
  const level = overallToDepthLevel(surfaceOverall);
  const vsLens =
    Math.round((surfaceOverall - DEPTH_BENCHMARK.lens.overall) * 10) / 10;

  return {
    level,
    levelLabel: DEPTH_LEVELS[level]?.label || `L${level}`,
    surfaceOverall,
    axes,
    vsLens,
    aheadOfLens: surfaceOverall >= DEPTH_BENCHMARK.lens.overall,
    engineOverall: DEPTH_BENCHMARK.briclog.engineOverall,
    target: DEPTH_BENCHMARK.briclog.targetSurfaceOverall,
  };
}

export function formatDepthComparisonLine() {
  const lens = DEPTH_BENCHMARK.lens;
  const bl = DEPTH_BENCHMARK.briclog;
  return `Lens ${lens.overall} (${DEPTH_LEVELS[overallToDepthLevel(lens.overall)].label}) · BRICLOG 엔진 ${bl.engineOverall} · 표면 목표 ${bl.targetSurfaceOverall}`;
}
