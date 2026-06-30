/**
 * 생성 직전 1비트 — 3칸 약속 유지, 구체 팩트만 한 번 더 (Vision 2030)
 */
import { resolveIndustryCategoryKey } from "@/lib/product/industryCategoryKey";
import { evaluateEditorGradeResearchGate } from "@/lib/product/editorGradeResearchGate";

export const GENERATION_CONTEXT_BEAT_VERSION = "generation-context-beat-v1";

const BEATS = {
  pension: {
    headline: "이번 글에 꼭 들어갈 숙소 포인트",
    hint: "할인·뷰·체험 중 2가지만 골라 주세요.",
    placeholder: "예: 오션뷰·바비큐·7박 할인·무료 주차",
    chips: ["오션뷰", "바비큐", "무료 주차", "장박 할인", "조식 포함"],
  },
  restaurant: {
    headline: "이번 글에 꼭 들어갈 식당 포인트",
    hint: "메뉴·가격·좌석 중 2가지만 골라 주세요.",
    placeholder: "예: 점심 특선 9800원·단체석 12인·계절 반찬",
    chips: ["대표 메뉴", "점심 특선", "가격·혜택", "단체석", "예약·웨이팅"],
  },
  construction: {
    headline: "이번 상담 글에 넣을 공간 포인트",
    hint: "공간·상담·시공 중 2가지만 골라 주세요.",
    placeholder: "예: 거실 리모델·3D 설계·맞춤 상담",
    chips: ["거실·주방", "3D 설계", "맞춤 상담", "조명·수납", "동선·상담"],
  },
  education: {
    headline: "이번 모집 글에 넣을 학원 포인트",
    hint: "과목·반·일정 중 2가지만 골라 주세요.",
    placeholder: "예: 여름 특강·소수정예·내신 대비",
    chips: ["여름 특강", "소수정예", "내신 대비", "레벨 테스트", "상담·등록"],
  },
  craft: {
    headline: "이번 체험 글에 넣을 공방 포인트",
    hint: "체험·소요·준비물 중 2가지만 골라 주세요.",
    placeholder: "예: 원데이 클래스·도자기 소성·주차",
    chips: ["원데이 클래스", "도자기·공예", "체험 시간", "주차·예약", "완성품 포장"],
  },
  salon: {
    headline: "이번 글에 넣을 살롱 포인트",
    hint: "시술·케어·이벤트 중 2가지만 골라 주세요.",
    placeholder: "예: 시즌 컬러·두피 케어·펌 이벤트",
    chips: ["시즌 컬러", "펌·염색", "두피 케어", "디자이너 상담", "이벤트"],
  },
  cafe: {
    headline: "이번 글에 넣을 매장 포인트",
    hint: "메뉴·분위기·좌석 중 2가지만 골라 주세요.",
    placeholder: "예: 시즌 브런치·창가 좌석·원두",
    chips: ["시즌 메뉴", "브런치·디저트", "좌석·분위기", "원두·로스팅", "주차·픽업"],
  },
  flower: {
    headline: "이번 글에 넣을 꽃집 포인트",
    hint: "예약·픽업·시즌 꽃 중 2가지만 골라 주세요.",
    placeholder: "예: 어버이날 예약·당일 제작·픽업",
    chips: ["예약·픽업", "시즌 꽃", "맞춤 제작", "배달", "포장·카드"],
  },
  furniture: {
    headline: "이번 글에 넣을 침대·매트리스 포인트",
    hint: "모델·체험·혜택 중 2가지만 골라 주세요.",
    placeholder: "예: 매트리스 체험존·모션베드 시연·무이자 할부",
    chips: ["매트리스 체험", "모션 침대", "프레임·라인업", "배송·설치", "할인·혜택"],
  },
  default: {
    headline: "이번 글에 넣을 매장·서비스 한 줄",
    hint: "가격·혜택·특징 중 2가지만 골라 주세요.",
    placeholder: "예: 대표 메뉴·예약·주차·할인",
    chips: ["대표 메뉴·서비스", "가격·혜택", "예약·상담", "주차·좌석", "분위기·특징"],
  },
};

export function hasRichGenerationContext(input = {}) {
  return Boolean(
    String(input.storeFeatures || "").trim().length >= 8 ||
      String(input.includePhrases || "").trim().length >= 8 ||
      String(input.brandDescription || "").trim().length >= 24
  );
}

/** 생성 버튼 직전 — 한 줄 더 필요한지 */
export function needsGenerationContextBeat(input = {}) {
  if (hasRichGenerationContext(input)) return false;
  const gate = evaluateEditorGradeResearchGate(input);
  return !gate.ok;
}

export function resolveGenerationContextBeat(input = {}) {
  const key = resolveIndustryCategoryKey(input);
  const base = BEATS[key] || BEATS.default;
  const brand = String(input.brandName || "").trim();
  return {
    version: GENERATION_CONTEXT_BEAT_VERSION,
    industryKey: key,
    field: "storeFeatures",
    ...base,
    chips: base.chips.map((chip) =>
      brand && !chip.includes(brand) ? `${brand} — ${chip}` : chip
    ),
  };
}

/** 칩 토글·병합 SSOT — ` · ` 구분만 (칩 라벨 내부 · 와 충돌 방지) */
export function splitContextBeatParts(text = "") {
  return String(text || "")
    .split(/\s·\s/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 1);
}

export function toggleContextBeatChip(value = "", chip = "") {
  const parts = splitContextBeatParts(value);
  const idx = parts.findIndex((p) => p === chip);
  if (idx >= 0) {
    parts.splice(idx, 1);
    return parts.join(" · ");
  }
  return parts.length ? `${parts.join(" · ")} · ${chip}` : chip;
}

function splitClauses(text = "") {
  const dotted = splitContextBeatParts(text);
  if (dotted.length > 1 || (dotted.length === 1 && text.includes(" · "))) {
    return dotted.filter((s) => s.length >= 2);
  }
  return String(text || "")
    .split(/[,，/\n|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
}

export function mergeContextBeatText(existing = "", addition = "") {
  const parts = [...splitClauses(existing), ...splitClauses(addition)];
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const k = p.slice(0, 64).toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out.join(" · ");
}

export function applyContextBeatToInput(input = {}, beatText = "") {
  const merged = mergeContextBeatText(input.storeFeatures, beatText);
  const next = { ...input, storeFeatures: merged };
  if (merged.length >= 8 && !String(next.includePhrases || "").trim()) {
    next.includePhrases = merged;
  }
  return next;
}

export function generationContextBeatTopicKey(input = {}) {
  return `${String(input.brandName || "").trim()}|${String(input.topic || "").trim()}`;
}
