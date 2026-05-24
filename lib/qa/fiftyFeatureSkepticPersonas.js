/**
 * 50명 — 기능 과잉·불필요 UI 피드백용 페르소나
 * 기존 u001–u100, p1–p8, vu_*, channel SLA와 ID·축 중복 없음
 *
 * 축: skeptic 유형(10) × 사업 맥락(5) = fs001–fs050
 */

const SKEPTIC_TYPES = [
  { id: "blog_only", label: "이야기만", focus: ["blog"], avoid: ["image", "growth", "channel_pack"] },
  { id: "place_only", label: "플레이스만", focus: ["place"], avoid: ["blog_tabs", "insta", "image"] },
  { id: "insta_only", label: "인스타만", focus: ["insta"], avoid: ["blog_advanced", "research"] },
  { id: "no_advanced", label: "고급 안 씀", focus: ["blog"], avoid: ["advanced_form", "research"] },
  { id: "meta_averse", label: "메타 UI 혐오", focus: ["copy_only"], avoid: ["quality_panels", "scores"] },
  { id: "billing_sensitive", label: "요금 UI 민감", focus: ["limits"], avoid: ["plan_noise", "warnings"] },
  { id: "one_channel_week", label: "주 1채널", focus: ["single_menu"], avoid: ["menu_clutter"] },
  { id: "delegated_staff", label: "직원 위임", focus: ["review"], avoid: ["brand_learning", "habits"] },
  { id: "ai_one_shot", label: "AI 1회 이탈", focus: ["first_write"], avoid: ["demo_repeat", "toasts"] },
  { id: "manual_paste", label: "수동·붙여넣기", focus: ["review"], avoid: ["channels", "rewrite_ui"] },
];

const CONTEXTS = [
  { id: "solo_50s", label: "1인 50대 사장", scale: "solo" },
  { id: "gen_z_mgr", label: "Z세대 매니저", scale: "small_team" },
  { id: "franchise", label: "가맹 매장", scale: "franchise" },
  { id: "side_hustle", label: "퇴근 후 부업", scale: "solo" },
  { id: "agency_junior", label: "대행 주니어", scale: "agency" },
];

function buildPersona(row, col, index) {
  const skeptic = SKEPTIC_TYPES[row];
  const ctx = CONTEXTS[col];
  const id = `fs${String(index + 1).padStart(3, "0")}`;
  return {
    id,
    label: `${ctx.label} · ${skeptic.label}`,
    skepticType: skeptic.id,
    skepticLabel: skeptic.label,
    context: ctx.id,
    contextLabel: ctx.label,
    scale: ctx.scale,
    focus: skeptic.focus,
    avoidFeatures: skeptic.avoid,
    primaryMenu:
      skeptic.id === "place_only"
        ? "place"
        : skeptic.id === "insta_only"
          ? "insta"
          : skeptic.id === "manual_paste"
            ? "review"
            : "blog",
    prefersSimpleMode: true,
  };
}

/** @type {ReturnType<typeof buildPersona>[]} */
export const FIFTY_FEATURE_SKEPTIC_PERSONAS = (() => {
  const list = [];
  let n = 0;
  for (let row = 0; row < SKEPTIC_TYPES.length; row += 1) {
    for (let col = 0; col < CONTEXTS.length; col += 1) {
      list.push(buildPersona(row, col, n));
      n += 1;
    }
  }
  return list;
})();

export function getFiftyFeatureSkepticPersona(id) {
  return FIFTY_FEATURE_SKEPTIC_PERSONAS.find((p) => p.id === id);
}

export function getSkepticsByType(skepticType) {
  return FIFTY_FEATURE_SKEPTIC_PERSONAS.filter((p) => p.skepticType === skepticType);
}
