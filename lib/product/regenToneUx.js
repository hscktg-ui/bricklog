/**
 * 다시 받기 · 톤 요청 — 고객 화면 SSOT (2030 작업실)
 */

export const REGEN_TONE_UX_VERSION = "v1";

export const REGEN_PANEL_COPY = {
  blog: {
    eyebrow: "품질 · 톤",
    title: "마음에 안 들면 다시 받기",
    titleMobile: "다시 받기",
    body: "조사와 브랜드 기억은 유지하고, 문장 구성과 표현만 새로 짭니다.",
    bodyMobile: "조사·브랜드 기억 유지 · 표현만 새로",
    toneLabel: "이번엔 이렇게",
    placeholder: "예: 더 담백하게 · 현장감 · 짧게",
  },
  place: {
    eyebrow: "플레이스",
    title: "공지 다시 받기",
    titleMobile: "공지 다시 받기",
    body: "운영 공지 톤을 유지한 채 문장만 바꿉니다.",
    bodyMobile: "사장님 공지 톤 유지 · 표현만 새로",
    toneLabel: "이번 공지 톤",
    placeholder: "예: 더 짧게 · 예약 강조 · 담백하게",
  },
  instagram: {
    eyebrow: "인스타",
    title: "캡션 다시 받기",
    titleMobile: "캡션 다시 받기",
    body: "피드 톤을 유지한 채 훅과 본문만 새로 짭니다.",
    bodyMobile: "캡션 톤 유지 · 표현만 새로",
    toneLabel: "이번 캡션 느낌",
    placeholder: "예: 저장 각 · 짧게 · 감성 줄이기",
  },
};

/** @type {Record<string, string[]>} */
export const REGEN_TONE_QUICK_PICKS = {
  blog: ["더 담백하게", "짧게", "현장감 있게", "사장님 톤"],
  place: ["사장님 공지", "짧고 명확하게", "예약·문의 강조"],
  instagram: ["저장 각", "짧은 캡션", "감성 줄이기"],
};

/**
 * @param {string} current
 * @param {string} pick
 */
export function mergeToneQuickPick(current = "", pick = "") {
  const t = String(pick || "").trim();
  if (!t) return current;
  const cur = String(current || "").trim();
  if (!cur) return t;
  if (cur.includes(t)) return cur;
  const merged = `${cur} · ${t}`;
  return merged.slice(0, 120);
}

export function regenCountLabel(count = 0) {
  const n = Number(count) || 0;
  if (n < 1) return "";
  return `이미 ${n}번 다시 받았어요`;
}
