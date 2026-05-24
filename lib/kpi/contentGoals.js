/** 콘텐츠 KPI — Prompt·채널 톤 분기 */
export const CONTENT_KPI_OPTIONS = [
  { value: "search", label: "검색노출형", purpose: "info", tone: "informative" },
  { value: "save", label: "저장유도형", purpose: "season", tone: "emotional" },
  { value: "reservation", label: "예약유도형", purpose: "visitDrive", tone: "trust" },
  { value: "branding", label: "브랜딩형", purpose: "brand", tone: "premium" },
  { value: "newOpen", label: "신규오픈형", purpose: "newOpen", tone: "lifestyle" },
  { value: "event", label: "이벤트형", purpose: "season", tone: "emotional" },
];

export const IMAGE_KPI_OPTIONS = [
  { value: "ctr", label: "클릭률형", imagePurpose: "thumbnail" },
  { value: "save", label: "저장형", imagePurpose: "insta" },
  { value: "place", label: "플레이스형", imagePurpose: "place" },
  { value: "event", label: "이벤트형", imagePurpose: "banner" },
  { value: "premium", label: "프리미엄형", imagePurpose: "thumbnail", tone: "premium" },
];

export function getKpiModifier(kpiGoal) {
  const kpi = CONTENT_KPI_OPTIONS.find((k) => k.value === kpiGoal) || CONTENT_KPI_OPTIONS[1];
  const hints = {
    search: "네이버 검색·체류 — 정보 밀도, 자연 키워드, 첫 3줄 후킹",
    save: "저장·공감 — 짧은 감성, 생활 장면, 과장 없음",
    reservation: "예약·방문 — CTA 명확, 운영 정보, 신뢰 톤",
    branding: "브랜드 스토리 — 분위기·운영 철학, 광고티 최소",
    newOpen: "오픈 — 첫 방문 계기, 위치·이용 방식 (입력값만)",
    event: "이벤트·시즌 — 기간·혜택 (입력값만), 공지 연결",
  };
  return {
    id: kpi.value,
    label: kpi.label,
    purpose: kpi.purpose,
    tone: kpi.tone,
    hint: hints[kpi.value] || hints.save,
  };
}

export function resolveKpiFromInput(input) {
  if (input.kpiGoal) return getKpiModifier(input.kpiGoal);
  if (input.purpose) {
    const match = CONTENT_KPI_OPTIONS.find((k) => k.purpose === input.purpose);
    if (match) return getKpiModifier(match.value);
  }
  return getKpiModifier("save");
}
