/**
 * 1,000명 페르소나 — 100명 기본 × 10 변형(화자·길이·지역·주제)
 */
import { HUNDRED_USER_PERSONAS } from "@/lib/qa/hundredUserPersonas";
import { TRAINING_PERSONAS, REGIONS } from "@/lib/quality/training/constants";

export const THOUSAND_PERSONA_COUNT = 1000;
export const THOUSAND_VARIANT_COUNT = 10;

const TOPIC_TWISTS = [
  "",
  "시즌 프로모션",
  "신규 오픈 안내",
  "예약·상담",
  "대표 메뉴·서비스",
  "방문 전 체크",
  "여름 시즌",
  "가을 시즌",
  "이벤트 안내",
  "고객 후기",
];

const ACCOUNT_ROLES = ["brand_manager", "field_staff", "owner"];

function varyBrand(baseBrand = {}, variant = 0, industryId = "cafe") {
  const region = REGIONS[(variant + industryId.length) % REGIONS.length];
  const twist = TOPIC_TWISTS[variant % TOPIC_TWISTS.length];
  const topicBase = baseBrand.topic || "매장 소개";
  const topic = twist ? `${twist} · ${topicBase}` : topicBase;
  return {
    brandName: baseBrand.brandName || "테스트매장",
    region,
    topic,
    mainKeyword: baseBrand.mainKeyword || topic.split("·")[0]?.trim() || topic,
  };
}

function buildThousandPersona(index) {
  const base = HUNDRED_USER_PERSONAS[index % 100];
  const variant = Math.floor(index / 100);
  const speaker = TRAINING_PERSONAS[variant % TRAINING_PERSONAS.length];
  const tiers = ["short", "medium", "long"];
  const tier = tiers[variant % tiers.length];

  return {
    id: `t${String(index + 1).padStart(4, "0")}`,
    baseId: base.id,
    variantIndex: variant,
    label: `${base.label} · ${speaker.label} · ${tier}`,
    industry: base.industry,
    industryLabel: base.industryLabel,
    journeyType: base.journeyType,
    journeyLabel: base.journeyLabel,
    needsAuth: base.needsAuth,
    device: base.device,
    viewport: base.viewport,
    primaryMenu: base.primaryMenu,
    focus: base.focus,
    sensitiveIndustry: base.sensitiveIndustry,
    v4Speaker: speaker.v4Speaker,
    contentPersona: speaker.contentPersona,
    speakerLabel: speaker.label,
    blogLengthTier: tier,
    accountRole: ACCOUNT_ROLES[variant % ACCOUNT_ROLES.length],
    brand: varyBrand(base.brand, variant, base.industry),
  };
}

export const THOUSAND_USER_PERSONAS = Array.from(
  { length: THOUSAND_PERSONA_COUNT },
  (_, i) => buildThousandPersona(i)
);

export function getThousandUserPersona(id) {
  return THOUSAND_USER_PERSONAS.find((p) => p.id === id);
}

export function getThousandPersonasBySpeaker(v4Speaker) {
  return THOUSAND_USER_PERSONAS.filter((p) => p.v4Speaker === v4Speaker);
}

/** 배치 한도(<1000)일 때 short·medium·long 균등 샘플 — 앞 200명만 쓰면 long 누락 방지 */
export function selectStratifiedPersonaBatch(limit = THOUSAND_PERSONA_COUNT) {
  const cap = Math.min(THOUSAND_PERSONA_COUNT, Math.max(1, limit));
  if (cap >= THOUSAND_PERSONA_COUNT) {
    return THOUSAND_USER_PERSONAS.slice(0, cap);
  }

  const tiers = ["short", "medium", "long"];
  const perTier = Math.floor(cap / tiers.length);
  const remainder = cap % tiers.length;
  const picked = [];
  const usedIds = new Set();

  for (let ti = 0; ti < tiers.length; ti += 1) {
    const tier = tiers[ti];
    const want = perTier + (ti < remainder ? 1 : 0);
    const pool = THOUSAND_USER_PERSONAS.filter(
      (p) => p.blogLengthTier === tier && !usedIds.has(p.id)
    );
    const step = Math.max(1, Math.floor(pool.length / Math.max(want, 1)));

    for (let i = 0; want > 0 && i * step < pool.length && picked.length < cap; i += 1) {
      const persona = pool[i * step];
      if (usedIds.has(persona.id)) continue;
      picked.push(persona);
      usedIds.add(persona.id);
    }

    for (const persona of pool) {
      if (picked.filter((p) => p.blogLengthTier === tier).length >= want) break;
      if (usedIds.has(persona.id)) continue;
      picked.push(persona);
      usedIds.add(persona.id);
    }
  }

  return picked.slice(0, cap);
}
