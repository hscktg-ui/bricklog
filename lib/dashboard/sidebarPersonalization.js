import { labelForRole } from "@/lib/auth/profileOptions";
import { PRIMARY_CHANNEL_OPTIONS } from "@/lib/user/userPreferences";
import { formatBrandHabitsBrief } from "@/lib/brands/brandHabits";
import { BLOG_TONE_OPTIONS } from "@/lib/constants";

/**
 * @param {Record<string, unknown> | null} profile
 * @param {string} primaryChannel
 */
function primaryChannelLabel(primaryChannel) {
  return (
    PRIMARY_CHANNEL_OPTIONS.find((c) => c.id === primaryChannel)?.label ||
    "블로그"
  );
}

/**
 * @param {Record<string, unknown> | null} profile
 * @param {{ brandName?: string; region?: string; tone?: string; industry?: string } | null} activeBrand
 * @param {{ primaryChannel?: string }} userPrefs
 */
export function buildSidebarPersonalization(profile, activeBrand, userPrefs = {}) {
  const primaryChannel = userPrefs.primaryChannel || "blog";
  const primaryLabel = primaryChannelLabel(primaryChannel);
  const useCase = String(profile?.primaryUseCase || "");
  const role = String(profile?.roleType || "");
  const band = String(profile?.brandCountBand || "");

  const brandName = activeBrand?.brandName?.trim() || "";
  const region = activeBrand?.region?.trim() || "";
  const toneLabel =
    BLOG_TONE_OPTIONS.find((t) => t.value === activeBrand?.tone)?.label ||
    null;
  const habitsBrief = activeBrand ? formatBrandHabitsBrief(activeBrand) : "";

  let insightLine = "브랜드를 고르고 오늘의 주제만 적으면 글이 이어집니다.";
  if (!brandName) {
    insightLine = "먼저 브랜드를 선택하거나 추가해 주세요.";
  } else if (useCase === "agency_work" || role === "agency") {
    insightLine = `${brandName} — 클라이언트 톤을 창고에서 나눠 두세요.`;
  } else if (band === "4_10" || band === "10_plus" || useCase === "multi_brand") {
    insightLine = `지금 ${brandName}${region ? ` · ${region}` : ""} — 창고에서 브랜드를 바꿔 가며 씁니다.`;
  } else if (primaryChannel === "place" || useCase === "place") {
    insightLine = `주 사용이 플레이스 — ${brandName} 소식 톤을 맞춥니다.`;
  } else if (primaryChannel === "insta" || useCase === "instagram") {
    insightLine = `주 사용이 인스타 — ${brandName} 짧은 말투를 우선합니다.`;
  } else if (brandName && region) {
    insightLine = `${brandName} · ${region} — 오늘 글에 바로 반영됩니다.`;
  } else if (brandName) {
    insightLine = `${brandName} 설정이 글쓰기 폼에 연결됩니다.`;
  }

  const warehouseSummary = brandName
    ? `${brandName}${region ? ` · ${region}` : ""}${toneLabel ? ` · ${toneLabel}` : ""}`
    : "브랜드를 선택하세요";

  const brandHabitsSummary =
    habitsBrief?.slice(0, 72) ||
    (brandName ? "브랜드별 톤·금지어를 쌓으면 글에 반영됩니다." : "브랜드 선택 후 습관이 쌓입니다.");

  const accountHabitsSummary = profile?.nickname
    ? `${profile.nickname}님 계정 기본 말투`
    : "계정 공통 말투·이모지";

  const primarySummary = `메뉴 첫 화면 · ${primaryLabel}`;

  const multiBrand =
    band === "4_10" ||
    band === "10_plus" ||
    band === "agency_multi" ||
    useCase === "multi_brand" ||
    role === "agency";
  const channelFirst =
    primaryChannel === "place" ||
    primaryChannel === "insta" ||
    useCase === "place" ||
    useCase === "instagram";

  /** @type {("warehouse"|"brandHabits"|"accountHabits"|"primary")[]} */
  let sectionOrder = ["warehouse", "accountHabits", "brandHabits", "primary"];
  if (multiBrand) {
    sectionOrder = ["warehouse", "brandHabits", "accountHabits", "primary"];
  } else if (channelFirst) {
    sectionOrder = ["primary", "warehouse", "brandHabits", "accountHabits"];
  }

  const roleLabel = labelForRole(role);
  const profileHint = [
    roleLabel && `역할 ${roleLabel}`,
    profile?.mainIndustry && `업종 ${profile.mainIndustry}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    insightLine,
    profileHint,
    primaryLabel,
    sectionOrder,
    summaries: {
      warehouse: warehouseSummary,
      brandHabits: brandHabitsSummary,
      accountHabits: accountHabitsSummary,
      primary: primarySummary,
    },
    defaultOpen: {
      warehouse: false,
      brandHabits: false,
      accountHabits: false,
      primary: false,
    },
  };
}
