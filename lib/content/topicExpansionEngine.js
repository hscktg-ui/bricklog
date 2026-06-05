/**
 * V17 AI #4 — Topic Expansion: 주제를 정보 단위로 분해 (글 작성 없음)
 */
import { resolveIndustryDensityKey } from "@/lib/content/industryDensityEngine";
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";
import {
  buildSectionPlan,
  renderPlannedSectionBody,
  scoreSectionPlanCoverage,
} from "@/lib/content/sectionPlannerEngine";

function extractSectionsFromFullForCoverage(full) {
  const parts = String(full || "").split(/\n{2,}/).filter((p) => p.trim().length > 30);
  return parts.map((body, i) => ({ heading: `s-${i}`, body }));
}

const FURNITURE_UNITS = [
  "제품군·라인업",
  "모션·각도 기능",
  "무중력·헤드 조절",
  "체압 분산·지지감",
  "매트리스·프레임 조합",
  "매장 체험·누워보기",
  "체험존·상담",
  "프로모션·특별할인",
  "할인·증정 조건",
  "설치·조립",
  "배송·일정",
  "A/S·교환",
  "방문·예약·동선",
];

const FLOWER_UNITS = [
  "상품 구성",
  "가격대",
  "시즌 상품",
  "예약·주문",
  "포장",
  "배송·픽업",
];

const HOSPITAL_UNITS = [
  "진료·검사",
  "예약",
  "진료 흐름",
  "방문 전 준비",
  "주의 안내",
];

const SAAS_UNITS = [
  "문제 정의",
  "기존 방식 한계",
  "핵심 기능",
  "활용 방법",
  "도입 효과",
];

const DEFAULT_UNITS = [
  "방문·예약",
  "혜택·행사",
  "이용 방법",
  "비교 포인트",
  "문의·상담",
];

const UNIT_BY_INDUSTRY = {
  furniture: FURNITURE_UNITS,
  flower: FLOWER_UNITS,
  hospital: HOSPITAL_UNITS,
  saas: SAAS_UNITS,
  default: DEFAULT_UNITS,
};

/**
 * @param {object} ctx
 * @param {object} input
 */
export function expandTopicUnits(ctx = {}, input = {}) {
  const plan = buildSectionPlan(ctx, input);
  const fromPlan = plan.sections.map((s) => s.infoUnit);
  if (fromPlan.length >= 5) return fromPlan;
  const key = resolveIndustryDensityKey(ctx, input);
  const topic = String(input.topic || input.mainKeyword || ctx.topic || "")
    .trim()
    .split(/[,，]/)[0]
    ?.trim();
  const brand = String(ctx.brandName || input.brandName || "").trim();
  const base = UNIT_BY_INDUSTRY[key] || DEFAULT_UNITS;
  const units = [...fromPlan, ...base];
  if (topic && !units.some((u) => u.includes(topic.slice(0, 4)))) {
    units.unshift(topic);
  }
  if (brand) units.push(`${brand} 매장 안내`);
  return [...new Set(units)].slice(0, 14);
}

function unitToParagraph(unit, ctx = {}, input = {}, slot = 0) {
  const brand = String(ctx.brandName || input.brandName || "브랜드").trim();
  const region = String(ctx.region || input.region || "").trim();
  const topic = String(input.topic || input.mainKeyword || "이용").trim();
  const topicObj = koreanObjectParticle(topic);
  const templates = {
    "제품군·라인업": `${brand} ${topic} 관련 라인업은 모델·구성·가격대별로 나뉩니다. ${region ? `${region} ` : ""}매장에서 직접 비교해 보세요.`,
    "모션·각도 기능": `모션 기능은 헤드·다리 각도 조절, 무중력 자세 등 라인업마다 다릅니다. 체험 시 10분 이상 누워보는 것이 좋습니다.`,
    "프로모션·특별할인": `${topic} 행사가 있다면 대상 모델·할인율·기간·카드·증정을 매장 안내 기준으로 확인하세요.`,
    "설치·조립": `설치 당일 동선·기존 침대 처리·소요 시간을 사전에 안내받으면 준비가 수월합니다.`,
    "배송·일정": `배송·설치 일정은 지역·재고에 따라 달라질 수 있어 ${region ? `${region} ` : ""}주문 전 확인이 필요합니다.`,
    "A/S·교환": `교환·A/S 범위와 행사 적용 조건을 구매 전에 함께 점검하세요.`,
    "방문·예약·동선": `${region ? `${region} 생활권 ` : ""}방문 동선·주차·영업 시간·예약 가능 여부를 미리 보면 당일 체험이 편합니다.`,
    "매장 체험·누워보기": `${brand}에서 ${topicObj} 검토할 때 지지감·파트너 전달감·수면 자세 맞춤을 함께 확인하세요.`,
  };
  if (templates[unit]) return templates[unit];
  const fallbacks = [
    `${brand} ${unit} — ${region ? `${region} ` : ""}매장·공식 안내 기준으로 확인하세요.`,
    `${topic}와 연결된 ${unit} 정보는 상담 시 구체적으로 안내받을 수 있습니다.`,
  ];
  return fallbacks[slot % fallbacks.length];
}

/**
 * 정보량 보강용 문단 (길이 확장 시 문장 반복 대신 사용)
 */
export function buildTopicExpansionPad(ctx = {}, input = {}, slot = 0) {
  const plan = buildSectionPlan(ctx, input);
  const slotDef = plan.sections[slot % plan.sections.length];
  if (slotDef) return renderPlannedSectionBody(slotDef, plan, input);
  const units = expandTopicUnits(ctx, input);
  const unit = units[slot % units.length];
  return unitToParagraph(unit, ctx, input, slot);
}

/**
 * @param {string} full
 * @param {object} ctx
 */
export function scoreTopicUnitCoverage(full, ctx = {}) {
  const input = ctx.input || ctx;
  const plan = buildSectionPlan(ctx, input);
  const packLike = {
    sections: extractSectionsFromFullForCoverage(full),
    conclusion: "",
  };
  const planScore = scoreSectionPlanCoverage(plan, packLike, "blog");
  if (planScore.total >= 5) {
    return {
      ok: planScore.ok,
      ratio: planScore.ratio,
      hits: planScore.covered.length,
      total: planScore.total,
      units: plan.sections.map((s) => s.infoUnit),
      missing: planScore.missing.map((s) => s.infoUnit).slice(0, 6),
      mode: "section_plan",
    };
  }
  const units = expandTopicUnits(ctx, input);
  const text = String(full || "");
  const covered = units.filter((u) => {
    const core = u.replace(/[·\s]/g, "").slice(0, 4);
    return core.length >= 2 && text.includes(u.slice(0, Math.min(6, u.length)));
  });
  const ratio = units.length ? covered.length / units.length : 1;
  const minRatio = 0.45;
  return {
    ok: ratio >= minRatio,
    ratio,
    covered: covered.length,
    total: units.length,
    units,
    missing: units.filter((u) => !covered.includes(u)).slice(0, 6),
  };
}
