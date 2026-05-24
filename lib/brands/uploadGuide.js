import { resolveKpiFromInput } from "@/lib/kpi/contentGoals";

const UPLOAD_SLOTS = {
  blog: { best: ["화 10:00", "목 14:00"], ok: ["월 09:00", "토 11:00"] },
  place: { best: ["목 11:00", "금 10:00"], ok: ["화 09:00"] },
  instagram: { best: ["일 19:00", "수 20:00"], ok: ["금 18:00", "토 17:00"] },
};

export function buildUploadGuide({ kpiGoal, industry, channels = {} }) {
  const kpi = resolveKpiFromInput({ kpiGoal });
  const hasBlog = !!channels.blog;
  const hasPlace = !!channels.place;
  const hasInsta = !!channels.instagram;

  const tips = [];
  if (kpi.id === "search") {
    tips.push("블로그·플레이스 키워드는 문장 안에 자연스럽게");
  }
  if (kpi.id === "save") {
    tips.push("인스타는 저장 유도 Hook + 짧은 줄바꿈");
  }
  if (kpi.id === "reservation") {
    tips.push("플레이스 CTA·예약 문구를 첫 줄에");
  }
  tips.push("이미지 엔진은 준비 중 — 프롬프트만 참고");

  const imageDirection =
    industry === "flower"
      ? "화이트톤·생화 클로즈업·텍스트 여백 15%"
      : industry === "furniture"
        ? "프리미엄·은은한 조도·매장 신뢰감"
        : "자연광·로컬 매장·깔끔한 배경";

  return {
    kpiLabel: kpi.label,
    uploadTimes: {
      blog: hasBlog ? UPLOAD_SLOTS.blog : null,
      place: hasPlace ? UPLOAD_SLOTS.place : null,
      instagram: hasInsta ? UPLOAD_SLOTS.instagram : null,
    },
    imageDirection,
    opsTips: tips,
  };
}
