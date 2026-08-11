/**
 * Brand Content OS Centers — LEVER Xpert에서 접합한 운영 UX SSOT (2026-08)
 *
 * A) 센터형 패키징 (조사·기획·글·검수·운영)
 * B) 시간 절감 KPI
 * C) 송출 후 액션 인사이트
 * D) 콘텐츠 DNA 레이블
 * E) 자연어 레퍼런스 검색
 * F) 업종별 1주 온보딩 템플릿
 */
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import { buildContentOperatingPlan } from "@/lib/product/briclogBrandContentOS";
import { getIndustryDNA } from "@/lib/prompts/industryDNA";
import { brandLearningProfileForUI } from "@/lib/feedback/brandLearningProfile";

export const BRAND_CONTENT_OS_CENTERS_VERSION = "os-centers-v1";

/** LEVER식 센터 — 브릭로그 Brand Content OS 운영 축 */
export const BRAND_CONTENT_OS_CENTERS = Object.freeze([
  {
    id: "research",
    label: "조사 센터",
    short: "조사",
    role: "지역·브랜드·주제 팩트 수집",
    menuHint: "blog",
  },
  {
    id: "plan",
    label: "기획 센터",
    short: "기획",
    role: "이번 주·이번 달 무엇을·왜",
    menuHint: "plan",
  },
  {
    id: "write",
    label: "글쓰기 센터",
    short: "글쓰기",
    role: "사람이 읽을 문장으로 완성",
    menuHint: "blog",
  },
  {
    id: "review",
    label: "검수 센터",
    short: "검수",
    role: "90점·placeholder·업종 차단",
    menuHint: "blog",
  },
  {
    id: "ops",
    label: "운영 센터",
    short: "운영",
    role: "채널 리듬·다음 액션·습관",
    menuHint: "plan",
  },
]);

/** 수동 조사+초안+검수 기준선(분) — 시간 절감 KPI 분모 */
export const MANUAL_OPS_BASELINE_MINUTES = 90;

/**
 * @param {{ totalSec?: number, researchSec?: number, blogSec?: number, timing?: object, _meta?: object }} packOrMeta
 */
export function estimateDeliveryTimeSavings(packOrMeta = {}) {
  const meta = packOrMeta._meta || packOrMeta;
  const timing = meta.timing || packOrMeta.timing || {};
  const fromParts =
    (Number(timing.researchSec) || 0) + (Number(timing.blogSec) || 0);
  const fromMs = Number(meta.generationMs)
    ? Math.round(Number(meta.generationMs) / 1000)
    : 0;
  const totalSec =
    Number(timing.totalSec) ||
    Number(meta.totalSec) ||
    fromParts ||
    fromMs ||
    0;

  const actualMin = totalSec > 0 ? Math.max(1, Math.round(totalSec / 60)) : null;
  const baseline = MANUAL_OPS_BASELINE_MINUTES;
  if (!actualMin) {
    return {
      version: BRAND_CONTENT_OS_CENTERS_VERSION,
      ok: false,
      baselineMin: baseline,
      actualMin: null,
      savedMin: null,
      savedPct: null,
      label: `수동 대비 약 ${baseline}분 기준 · 실측 대기`,
    };
  }
  const savedMin = Math.max(0, baseline - actualMin);
  const savedPct = Math.round((savedMin / baseline) * 100);
  return {
    version: BRAND_CONTENT_OS_CENTERS_VERSION,
    ok: true,
    baselineMin: baseline,
    actualMin,
    savedMin,
    savedPct,
    label:
      savedPct >= 50
        ? `조사·초안 ${actualMin}분 · 수동 대비 약 ${savedPct}% 절감`
        : `조사·초안 ${actualMin}분 (기준 ${baseline}분)`,
  };
}

/**
 * 송출 후 액션 — 다음 주제 · 피할 말 · 채널 믹스
 */
export function buildDeliveryActionInsights(input = {}, opts = {}) {
  const plan = opts.plan || buildContentOperatingPlan(input);
  const learning = brandLearningProfileForUI(opts.learningProfile || input.brandLearningProfile);
  const nextTopics = (plan.whatToWrite || [])
    .filter((w) => w.channel === "blog" && w.topic !== plan.primaryTopic)
    .slice(0, 3)
    .map((w) => w.topic);
  if (nextTopics.length < 2 && plan.primaryTopic) {
    nextTopics.push(`시즌 새로고침: ${plan.primaryTopic}`);
    nextTopics.push(`${input.brandName || "브랜드"} 방문 전 체크리스트`);
  }

  const avoidPhrases = (learning?.avoidPhrases || input.avoidPhrases || []).slice(0, 5);
  const channelMix = (plan.whatToWrite || []).slice(0, 3).map((w) => ({
    channel: w.channel,
    label: w.channelLabel || w.channel,
    topic: w.topic,
    priority: w.priority,
  }));

  return {
    version: BRAND_CONTENT_OS_CENTERS_VERSION,
    headline: "다음에 할 일",
    nextTopics: nextTopics.slice(0, 3),
    avoidPhrases,
    channelMix,
    researchMustKnow: (plan.researchMustKnow || []).slice(0, 3),
  };
}

const TAG_DNA_LABELS = {
  too_ad: "광고톤↓",
  too_ai: "AI티↓",
  brand_weak: "브랜드↑",
  too_long: "길이↓",
  too_short: "밀도↑",
  dry: "경험↑",
  checklist: "체크리스트↓",
  region_weak: "지역↑",
};

/**
 * 피드백·업종 DNA → UI 칩
 */
export function buildContentDnaLabels(input = {}, opts = {}) {
  const learning = brandLearningProfileForUI(opts.learningProfile || input.brandLearningProfile);
  const industry = resolveBriclogIndustryKey(input);
  const dna = getIndustryDNA?.(industry) || null;
  const labels = [];

  for (const tone of learning?.preferredWritingTone || []) {
    labels.push({ id: `tone:${tone}`, label: String(tone), source: "feedback" });
  }
  for (const persona of learning?.preferredPersona || []) {
    labels.push({ id: `persona:${persona}`, label: String(persona), source: "feedback" });
  }
  for (const tag of learning?.topNegativeTags || []) {
    labels.push({
      id: `avoid:${tag}`,
      label: TAG_DNA_LABELS[tag] || `피함:${tag}`,
      source: "feedback",
      avoid: true,
    });
  }
  for (const phrase of (learning?.avoidPhrases || []).slice(0, 3)) {
    if (!labels.some((l) => l.label === phrase)) {
      labels.push({ id: `phrase:${phrase}`, label: phrase, source: "feedback", avoid: true });
    }
  }

  if (labels.length < 3 && dna) {
    if (dna.voice) {
      labels.push({ id: `industry:${industry}`, label: String(dna.voice).slice(0, 24), source: "industry" });
    }
    for (const hook of (dna.emphasize || []).slice(0, 2)) {
      labels.push({ id: `hook:${hook}`, label: String(hook).slice(0, 20), source: "industry" });
    }
  }

  if (input.region) {
    labels.push({ id: `region:${input.region}`, label: String(input.region).slice(0, 16), source: "input" });
  }
  if (input.v4Speaker || input.speaker) {
    const sp = input.v4Speaker || input.speaker;
    labels.push({ id: `speaker:${sp}`, label: String(sp), source: "input" });
  }

  const seen = new Set();
  const uniq = [];
  for (const row of labels) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    uniq.push(row);
  }
  return {
    version: BRAND_CONTENT_OS_CENTERS_VERSION,
    industry,
    labels: uniq.slice(0, 8),
  };
}

/**
 * 자연어 쿼리로 과거 글·조사 레퍼런스 랭킹 (로컬 키워드)
 */
export function searchBrandContentReferences(items = [], query = "", opts = {}) {
  const q = String(query || "").trim().toLowerCase();
  const limit = opts.limit ?? 12;
  if (!q) {
    return {
      version: BRAND_CONTENT_OS_CENTERS_VERSION,
      query: "",
      results: (items || []).slice(0, limit).map((it, i) => ({
        ...normalizeContentItem(it),
        score: 1 - i * 0.01,
      })),
    };
  }

  const tokens = q
    .split(/[\s,./·|/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 1);

  const scored = (items || []).map((raw) => {
    const it = normalizeContentItem(raw);
    const hay = `${it.title}\n${it.fullContent}\n${it.hashtags}\n${it.channel}\n${it.persona}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (hay.includes(t)) score += t.length >= 2 ? 3 : 1;
      if (it.title.toLowerCase().includes(t)) score += 4;
    }
    if (/소재|사진|영상|비주얼/.test(q) && /instagram|insta|이미지/.test(it.channel)) score += 2;
    if (/방문|플레이스|위치|주차/.test(q) && /place/.test(it.channel)) score += 2;
    if (/블로그|후기|이야기/.test(q) && /blog/.test(it.channel)) score += 2;
    return { ...it, score };
  });

  return {
    version: BRAND_CONTENT_OS_CENTERS_VERSION,
    query: q,
    results: scored
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit),
  };
}

function normalizeContentItem(it = {}) {
  return {
    id: it.id,
    brandId: it.brand_id || it.brandId,
    channel: String(it.channel || "blog"),
    title: String(it.title || "(제목 없음)"),
    fullContent: String(it.full_content || it.fullContent || "").slice(0, 4000),
    hashtags: Array.isArray(it.hashtags) ? it.hashtags.join(" ") : String(it.hashtags || ""),
    persona: String(it.persona || ""),
    createdAt: it.created_at || it.createdAt || null,
  };
}

/** 업종별 1주차 운영 템플릿 */
export const INDUSTRY_WEEK1_TEMPLATES = Object.freeze({
  cafe: {
    label: "카페 1주차",
    days: [
      { day: 1, channel: "blog", topic: "대표 메뉴·원두 — 직접 마셔본 메모" },
      { day: 2, channel: "place", topic: "좌석·테라스·주차 방문 전 체크" },
      { day: 3, channel: "instagram", topic: "시그니처 음료 한 장면" },
      { day: 5, channel: "blog", topic: "주말 브런치·웨이팅 팁" },
      { day: 7, channel: "plan", topic: "다음 주 시즌 메뉴 기획" },
    ],
  },
  flower: {
    label: "꽃집 1주차",
    days: [
      { day: 1, channel: "blog", topic: "시즌 꽃 3종 추천 — 특징·선물 용도" },
      { day: 2, channel: "place", topic: "픽업·운영시간·가격대 안내" },
      { day: 3, channel: "instagram", topic: "오늘의 다발 한 컷" },
      { day: 5, channel: "blog", topic: "보관·수명 관리 팁" },
      { day: 7, channel: "plan", topic: "기념일 시즌 캘린더" },
    ],
  },
  pension: {
    label: "펜션 1주차",
    days: [
      { day: 1, channel: "blog", topic: "객실·뷰 — 직접 묵어본 메모" },
      { day: 2, channel: "place", topic: "체크인·바베큐·주차 동선" },
      { day: 3, channel: "instagram", topic: "테라스·일출 한 장면" },
      { day: 5, channel: "blog", topic: "주말 패키지·예약 팁" },
      { day: 7, channel: "plan", topic: "성수기 주제 3안" },
    ],
  },
  salon: {
    label: "살롱 1주차",
    days: [
      { day: 1, channel: "blog", topic: "상담·시술 코스 — 다녀온 기록" },
      { day: 2, channel: "place", topic: "예약·주차·소요시간" },
      { day: 3, channel: "instagram", topic: "스타일 비포어/애프터" },
      { day: 5, channel: "blog", topic: "시즌 펌·염색 관리 팁" },
      { day: 7, channel: "plan", topic: "다음 주 시술 주제" },
    ],
  },
  restaurant: {
    label: "식당 1주차",
    days: [
      { day: 1, channel: "blog", topic: "시그니처 코스 — 먹어본 후기" },
      { day: 2, channel: "place", topic: "예약·주차·웨이팅" },
      { day: 3, channel: "instagram", topic: "대표 메뉴 클로즈업" },
      { day: 5, channel: "blog", topic: "점심·저녁 선택 가이드" },
      { day: 7, channel: "plan", topic: "시즌 메뉴 기획" },
    ],
  },
  furniture: {
    label: "가구 1주차",
    days: [
      { day: 1, channel: "blog", topic: "쇼룸 체험 — 앉아본 비교" },
      { day: 2, channel: "place", topic: "방문·상담·주차" },
      { day: 3, channel: "instagram", topic: "제품 디테일 한 컷" },
      { day: 5, channel: "blog", topic: "배송·A/S·견적 팁" },
      { day: 7, channel: "plan", topic: "다음 제품 라인 주제" },
    ],
  },
  default: {
    label: "브랜드 1주차",
    days: [
      { day: 1, channel: "blog", topic: "브랜드·지역 — 현장 메모" },
      { day: 2, channel: "place", topic: "방문 전 확인 정보" },
      { day: 3, channel: "instagram", topic: "분위기 한 장면" },
      { day: 5, channel: "blog", topic: "고객이 자주 묻는 점" },
      { day: 7, channel: "plan", topic: "다음 주 운영 주제 3안" },
    ],
  },
});

export function resolveIndustryWeek1Template(input = {}) {
  const key = resolveBriclogIndustryKey(input);
  const tpl =
    INDUSTRY_WEEK1_TEMPLATES[key] ||
    (key === "unmanned_flower" ? INDUSTRY_WEEK1_TEMPLATES.flower : null) ||
    (key === "tea_cafe" ? INDUSTRY_WEEK1_TEMPLATES.cafe : null) ||
    (key === "lodging" ? INDUSTRY_WEEK1_TEMPLATES.pension : null) ||
    INDUSTRY_WEEK1_TEMPLATES.default;
  return {
    version: BRAND_CONTENT_OS_CENTERS_VERSION,
    industry: key,
    ...tpl,
    brandName: String(input.brandName || "").trim() || null,
    region: String(input.region || "").trim() || null,
  };
}

/**
 * 송출·기획 UI에 붙이는 통합 스냅샷
 */
export function buildBrandContentOsCenterSnapshot(input = {}, opts = {}) {
  const plan = opts.plan || buildContentOperatingPlan(input);
  const timeSavings = estimateDeliveryTimeSavings(opts.pack || opts.meta || {});
  const actions = buildDeliveryActionInsights(input, {
    plan,
    learningProfile: opts.learningProfile,
  });
  const dna = buildContentDnaLabels(input, { learningProfile: opts.learningProfile });
  const week1 = resolveIndustryWeek1Template(input);

  return {
    version: BRAND_CONTENT_OS_CENTERS_VERSION,
    centers: BRAND_CONTENT_OS_CENTERS,
    timeSavings,
    actions,
    dna,
    week1,
    operatingHeadline: plan.operatingHeadline,
  };
}
