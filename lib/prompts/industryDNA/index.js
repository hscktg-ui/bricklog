/** 업종별 Prompt DNA — 문체·금지·강조 */

export const INDUSTRY_DNA = {
  flower: {
    voice: "감정선·계절감·생활 속 꽃",
    rhythm: "short-warm",
    emphasize: ["기념일", "생화 상태", "리본·메시지"],
    avoid: ["과장 할인", "최고의 꽃"],
  },
  hospital: {
    voice: "신뢰·차분·규제 준수",
    rhythm: "trust-calm",
    emphasize: ["접수·예약", "방문 전 확인"],
    avoid: ["완치", "효과 보장", "부작용 없음", "치료 보장"],
  },
  furniture: {
    voice: "공간감·체험·프리미엄",
    rhythm: "long-premium",
    emphasize: ["매장 체험", "수면·공간"],
    avoid: ["저렴한", "무조건 할인"],
  },
  cafe: {
    voice: "라이프스타일·분위기·시즌 메뉴",
    rhythm: "lifestyle",
    emphasize: ["좌석", "시즌 음료", "퇴근 후"],
    avoid: ["검색창", "키워드 나열"],
  },
  carwash: {
    voice: "before/after·운영감·실용",
    rhythm: "practical",
    emphasize: ["시간 절약", "관리 주기"],
    avoid: ["완벽 복원 보장"],
  },
  default: {
    voice: "로컬·신뢰·실사용",
    rhythm: "medium",
    emphasize: ["방문 계기", "운영 방식"],
    avoid: ["과장 광고"],
  },
};

export function getIndustryDNA(industryKey) {
  return INDUSTRY_DNA[industryKey] || INDUSTRY_DNA.default;
}

export function getIndustryDNABrief(industryKey) {
  const d = getIndustryDNA(industryKey);
  return `[DNA] ${d.voice} · 리듬 ${d.rhythm} · 강조 ${d.emphasize.join("/")} · 금지 ${d.avoid.join("/")}`;
}
