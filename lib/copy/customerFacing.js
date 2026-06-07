/**
 * 고객 UI용 문구 — 내부 품질 점수·Mission·AI 역할 설명은 노출하지 않음
 */

export const CUSTOMER_DRAFT_READY = "지금 올려도 됨";
export const CUSTOMER_DRAFT_REVIEW = "한 번 더 읽기";
export const CUSTOMER_SAMPLE_BADGE = "샘플 초안";

/** 작업실·폼 상단 — 제품 내부 Mission 문구 대신 사용 */
export const CUSTOMER_WORKSPACE_TAGLINE =
  "브랜드 · 지역 · 주제만 알려 주세요. 조사한 뒤 편집본이 여기 쌓입니다.";
export const CUSTOMER_WORKSPACE_TAGLINE_COMPACT =
  "브랜드 · 지역 · 주제만 채우면 됩니다.";
export const CUSTOMER_MOBILE_TAGLINE = "브랜드 · 지역 · 주제만 채우고 받기";

/** 본문·제목에 섞이면 안 되는 내부 운영 문구 (UI·출력 공통) */
export const CUSTOMER_FORBIDDEN_SURFACE_PHRASES = [
  "세 칸만 채우면 — 왜 찾는지부터, 이 브랜드답게 이어 씁니다",
  "세 칸만 채우면 — 왜 찾는지부터",
  "이 브랜드답게 이어 씁니다",
  "GPT: 글을 쓴다",
  "Gemini: 조사한다",
  "Naver: 지역성을 보완한다",
  "Memory: 브랜드를 유지한다",
  "【BRICLOG MISSION",
  "AI 역할 분리",
  "BRICLOG Memory",
  "Writer only",
  "Research only",
  "정보가 20개 단위",
  "고유 정보 단위",
  "gemini · naver",
  "조사를 추가합니다",
];

function scrubForbiddenText(text) {
  let out = String(text || "");
  for (const phrase of CUSTOMER_FORBIDDEN_SURFACE_PHRASES) {
    if (out.includes(phrase)) {
      out = out.split(phrase).join("").replace(/\s{2,}/g, " ").trim();
    }
  }
  return out;
}

/** 발행본에서 내부 Mission·AI 역할 문구 제거 */
export function scrubCustomerForbiddenSurfaceInPack(pack) {
  if (!pack?.sections?.length) return pack;
  return {
    ...pack,
    title: scrubForbiddenText(pack.title),
    representativeTitle: scrubForbiddenText(pack.representativeTitle),
    sections: (pack.sections || []).map((s) => ({
      ...s,
      heading: scrubForbiddenText(s.heading),
      body: scrubForbiddenText(s.body),
    })),
    conclusion: scrubForbiddenText(pack.conclusion),
    intro: pack.intro ? scrubForbiddenText(pack.intro) : pack.intro,
  };
}

export function hasCustomerForbiddenSurface(text) {
  const t = String(text || "");
  return CUSTOMER_FORBIDDEN_SURFACE_PHRASES.some((p) => t.includes(p));
}
