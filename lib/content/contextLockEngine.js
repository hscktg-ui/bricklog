/**
 * CONTEXT LOCK ENGINE — 생성 전 업종·브랜드·주제 확정
 * 확정 후 해당 업종 용어·질문·구조만 허용. 타 업종 단어 → 실패·재작성.
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { detectIndustryCrossContamination } from "@/lib/pipeline/v2/industryLock";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import { detectBrandIndustryMismatch } from "@/lib/product/brandIndustryMismatch";

export const CONTEXT_LOCK_VERSION = "v1";
export const MIN_CONTENT_RELEVANCE_RATE = 0.8;

/** 업종별 허용 어휘·질문·구조 (생성·검수 SSOT) */
const INDUSTRY_PROFILES = {
  marketing: {
    label: "마케팅·광고",
    vocabulary: [
      "광고",
      "블로그",
      "상위노출",
      "콘텐츠",
      "유입",
      "전환",
      "브랜딩",
      "문의",
      "계약",
      "사례",
      "채널",
      "운영",
      "마케팅",
      "홍보",
      "검색",
      "SNS",
      "인스타",
      "네이버",
      "지역 마케팅",
    ],
    questions: [
      "어떤 채널을 운영하나",
      "콘텐츠 전략은",
      "검색·노출은",
      "문의·상담은",
      "사례·실적은",
    ],
    structures: ["service_intro", "case_study", "channel_ops", "inquiry_cta"],
  },
  snack: {
    label: "수제간식·펫푸드",
    vocabulary: [
      "원재료",
      "급여방법",
      "보관",
      "알레르기",
      "영양성분",
      "건조공정",
      "간식",
      "수제",
      "성분",
      "유통기한",
    ],
    questions: [
      "원재료는 무엇인가",
      "급여·보관 방법은",
      "알레르기·성분 표기는",
      "영양·칼로리는",
    ],
    structures: ["ingredient_guide", "feeding_guide", "storage_caution"],
  },
  furniture: {
    label: "침대·가구",
    vocabulary: [
      "매트리스",
      "프레임",
      "스프링",
      "지지력",
      "체험",
      "수면",
      "체압",
      "쿠션감",
      "배송",
      "설치",
    ],
    questions: [
      "매트리스·프레임 차이는",
      "지지력·체압은",
      "매장 체험은",
      "배송·설치는",
    ],
    structures: ["product_compare", "showroom_visit", "sleep_guide"],
  },
  cafe: {
    label: "카페·F&B",
    vocabulary: ["메뉴", "원두", "브런치", "디저트", "테이크아웃", "좌석", "예약"],
    questions: ["메뉴 구성은", "영업·위치는", "예약·픽업은"],
    structures: ["menu_intro", "visit_guide"],
  },
  flower: {
    label: "꽃집",
    vocabulary: ["꽃다발", "화환", "생화", "배달", "픽업", "기념일"],
    questions: ["배달·픽업은", "꽃 종류는", "예약은"],
    structures: ["seasonal_guide", "order_flow"],
  },
  salon: {
    label: "미용·살롱",
    vocabulary: ["컷", "펌", "염색", "시술", "예약", "스타일"],
    questions: ["시술 종류는", "예약 방법은", "관리 팁은"],
    structures: ["service_menu", "booking_guide"],
  },
  hospital: {
    label: "의료",
    vocabulary: ["진료", "검진", "상담", "예약", "시술", "클리닉"],
    questions: ["진료 과목은", "예약·상담은", "주의사항은"],
    structures: ["clinic_intro", "visit_guide"],
  },
  default: {
    label: "로컬 비즈니스",
    vocabulary: ["브랜드", "서비스", "이용", "문의", "예약", "위치", "안내"],
    questions: ["어떤 곳인가", "이용 방법은", "문의는"],
    structures: ["brand_intro", "visit_guide"],
  },
};

/** 타 업종 단서 — 잠금 업종과 불일치 시 relevance·cross 검사 */
const FOREIGN_SIGNAL_GROUPS = {
  snack_food: [/알레르기|영양성분|건조공정|급여\s*방법|급여방법|펫푸드|수제\s*간식/],
  furniture_sleep: [/매트리스|지지력|스프링\s*구조|모션\s*베드|체압\s*분산|누워\s*보/],
  interior_space: [/수납\s*공간|동선\s*설계|조명\s*배치|인테리어\s*쇼룸/],
  medical: [/처방|진단|수술\s*후|의료진\s*상담/],
  flower: [/꽃다발|화환\s*배달|생화\s*관리/],
};

const GROUP_ALLOWED_IN = {
  snack_food: ["snack", "pet", "restaurant", "default"],
  furniture_sleep: ["furniture", "default"],
  interior_space: ["furniture", "default"],
  medical: ["hospital", "default"],
  flower: ["flower", "unmanned_flower", "default"],
};

function profileForKey(key) {
  return INDUSTRY_PROFILES[key] || INDUSTRY_PROFILES.default;
}

function topicTokens(topic = "") {
  return String(topic || "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/**
 * 생성 전 3축 확정
 * @param {Record<string, unknown>} input
 */
export function lockGenerationContext(input = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic =
    String(input.topic || "").trim() ||
    String(input.mainKeyword || "").trim();
  const industry = String(input.industry || input.industryLabel || "").trim();
  const industryKey = resolveBriclogIndustryKey(input);
  const reasons = [];

  if (!brand) reasons.push("missing_brand");
  if (!topic) reasons.push("missing_topic");
  if (!industry && industryKey === "default") reasons.push("missing_industry");

  const mismatch = detectBrandIndustryMismatch({
    brandName: brand,
    topic,
    mainKeyword: input.mainKeyword,
    industry,
  });
  if (mismatch.mismatch) reasons.push("brand_industry_mismatch");

  const profile = profileForKey(industryKey);

  const lock = {
    version: CONTEXT_LOCK_VERSION,
    brand,
    region,
    topic,
    industry: industry || profile.label,
    industryKey,
    profile,
    allowedVocabulary: profile.vocabulary,
    allowedQuestions: profile.questions,
    allowedStructures: profile.structures,
    topicTokens: topicTokens(topic),
    lockedAt: new Date().toISOString(),
  };

  return {
    ok: reasons.length === 0,
    lock,
    reasons,
    userMessage:
      reasons.length > 0
        ? mismatch.message ||
          "업종·브랜드·주제를 먼저 확정해 주세요. 확정 전에는 글을 작성하지 않습니다."
        : null,
  };
}

export function assertContextLockPreWrite(input = {}) {
  const existing = input.contextLock;
  if (existing?.brand && existing?.topic && existing?.industryKey) {
    return { ok: true, lock: existing, reasons: [] };
  }
  const result = lockGenerationContext(input);
  return {
    ok: result.ok,
    lock: result.lock,
    reasons: result.reasons,
    userMessage: result.userMessage,
    stage: "context_lock",
  };
}

export function formatContextLockBrief(lock) {
  if (!lock?.brand) return "";
  const p = lock.profile || profileForKey(lock.industryKey);
  const vocab = (lock.allowedVocabulary || p.vocabulary || []).slice(0, 12).join(" · ");
  const questions = (lock.allowedQuestions || p.questions || []).slice(0, 4).join("\n- ");
  return [
    "【CONTEXT LOCK — 업종·브랜드·주제 확정】",
    `업종: ${lock.industry || p.label} (${lock.industryKey})`,
    `브랜드: ${lock.brand}`,
    `주제: ${lock.topic}`,
    lock.region ? `지역: ${lock.region}` : null,
    `허용 어휘(이 업종): ${vocab}`,
    "허용 질문 방향:",
    questions ? `- ${questions}` : null,
    "다른 업종 단어(알레르기·매트리스·광고대행 등)가 섞이면 실패·재작성.",
    "본문 80% 이상은 브랜드·업종·주제와 직접 관련되어야 함.",
    "최종: 이 글만 읽고 10초 안에 이 브랜드가 무엇을 하는지 알 수 있어야 함.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function detectForeignIndustrySignals(text, lock) {
  const t = String(text || "");
  const key = lock?.industryKey || "default";
  const hits = [];

  for (const [group, patterns] of Object.entries(FOREIGN_SIGNAL_GROUPS)) {
    const allowed = GROUP_ALLOWED_IN[group] || [];
    if (allowed.includes(key)) continue;
    for (const re of patterns) {
      if (re.test(t)) {
        hits.push({ group, pattern: re.source });
      }
    }
  }

  const cross = detectIndustryCrossContamination(t, key);
  if (!cross.ok) {
    for (const v of cross.violations || []) {
      hits.push({
        group: "cross_industry",
        foreignIndustry: v.foreignIndustry,
        pattern: v.pattern,
      });
    }
  }

  return {
    ok: hits.length === 0,
    lockedKey: key,
    hits,
  };
}

function paragraphRelevant(para, lock) {
  const t = String(para || "").trim();
  if (t.replace(/\s/g, "").length < 20) return null;

  const foreign = detectForeignIndustrySignals(t, lock);
  if (!foreign.ok) return false;

  const brand = lock.brand;
  const topicHits = (lock.topicTokens || []).filter((tok) => t.includes(tok));
  if (brand && t.includes(brand)) return true;
  if (topicHits.length > 0) return true;

  const profile = lock.profile || profileForKey(lock.industryKey);
  for (const word of profile.vocabulary || []) {
    if (word.length >= 2 && t.includes(word)) return true;
  }

  if (lock.industry && t.includes(lock.industry)) return true;
  if (lock.region && t.includes(lock.region)) return true;

  return false;
}

/**
 * 본문 80% 이상 브랜드·업종·주제 관련
 */
function collectScoringParagraphs(pack, full) {
  if (pack?.sections?.length) {
    return (pack.sections || [])
      .map((s) => `${String(s.heading || "").trim()}\n${String(s.body || "").trim()}`.trim())
      .filter((p) => p.replace(/\s/g, "").length >= 24);
  }
  return String(full || "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.replace(/\s/g, "").length >= 24);
}

export function scoreContentRelevance(pack, input = {}, lock = null) {
  const resolved = lock || input.contextLock || lockGenerationContext(input).lock;
  const full = getBlogFullText(pack);
  const paragraphs = collectScoringParagraphs(pack, full);

  if (paragraphs.length < 2) {
    return {
      ok: false,
      rate: 0,
      relevant: 0,
      total: paragraphs.length,
      minRate: MIN_CONTENT_RELEVANCE_RATE,
      reasons: ["insufficient_paragraphs"],
    };
  }

  let relevant = 0;
  let scored = 0;
  for (const para of paragraphs) {
    const rel = paragraphRelevant(para, resolved);
    if (rel === null) continue;
    scored += 1;
    if (rel) relevant += 1;
  }

  const total = scored || paragraphs.length;
  const rate = total ? relevant / total : 0;
  const ok = rate >= MIN_CONTENT_RELEVANCE_RATE;

  return {
    ok,
    rate,
    relevant,
    total,
    minRate: MIN_CONTENT_RELEVANCE_RATE,
    reasons: ok ? [] : ["low_content_relevance"],
    lock: resolved,
  };
}

const BRAND_ROLE_RE =
  /(?:하는|운영하는|제공하는|전문|대행|매장|브랜드|업체|서비스|상담|안내)/;

/**
 * FINAL CHECK — 10초 안에 브랜드가 무엇을 하는지 이해되는가
 */
export function assessBrandClarity10Seconds(pack, input = {}, lock = null) {
  const resolved = lock || input.contextLock || lockGenerationContext(input).lock;
  const title = String(pack?.title || pack?.sections?.[0]?.heading || "").trim();
  const intro = (pack?.sections || [])
    .slice(0, 2)
    .map((s) => `${s.heading || ""}\n${s.body || ""}`)
    .join("\n")
    .slice(0, 900);
  const blob = `${title}\n${intro}`;
  const reasons = [];

  if (!resolved.brand || !blob.includes(resolved.brand)) {
    reasons.push("brand_not_in_opening");
  }

  const profile = resolved.profile || profileForKey(resolved.industryKey);
  const industryHits = (profile.vocabulary || []).filter((w) => blob.includes(w));
  const hasRole = BRAND_ROLE_RE.test(blob);
  if (industryHits.length < 1 && !hasRole) {
    reasons.push("business_role_unclear");
  }

  const foreign = detectForeignIndustrySignals(blob, resolved);
  if (!foreign.ok) {
    reasons.push("foreign_industry_in_opening");
  }

  const ok = reasons.length === 0;
  return {
    ok,
    reasons,
    industryHits: industryHits.length,
    question: "이 브랜드가 뭘 하는 회사인지, 이 글만 읽어도 10초 안에 알 수 있는가?",
    answer: ok ? "YES" : "NO",
    publishReady: ok,
  };
}

/**
 * 생성 후 통합 검수 — relevance + clarity + foreign terms
 */
export function assertContextLockPostWrite(pack, input = {}) {
  const lock = input.contextLock || lockGenerationContext(input).lock;
  const full = getBlogFullText(pack);
  const foreign = detectForeignIndustrySignals(full, lock);
  const relevance = scoreContentRelevance(pack, input, lock);
  const clarity = assessBrandClarity10Seconds(pack, input, lock);

  const reasons = [];
  if (!foreign.ok) reasons.push("foreign_industry_term");
  if (!relevance.ok) reasons.push(...(relevance.reasons || []));
  if (!clarity.ok) reasons.push(...clarity.reasons);

  return {
    ok: reasons.length === 0,
    stage: "context_lock_verify",
    version: CONTEXT_LOCK_VERSION,
    reasons: [...new Set(reasons)],
    foreign,
    relevance,
    clarity,
    lock,
    userMessage:
      reasons.length === 0
        ? null
        : "업종·브랜드·주제와 맞지 않는 표현이 있어 재작성합니다.",
    rewriteRequired: reasons.length > 0,
  };
}
