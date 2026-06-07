/**
 * 도움말 SSOT — 채널·화자·플랜 등 실제 제품 설정에서 문구를 가져옴
 */
import {
  CHANNEL_PRODUCTS,
  AUTO_PIPELINE_ORDER,
  MAIN_CHANNEL_IDS,
} from "@/lib/channels/channelProducts";
import { V4_SPEAKER_OPTIONS } from "@/lib/persona/v4Speakers";
import { RESEARCH_TYPE_OPTIONS } from "@/lib/research/types";
import { PLANS } from "@/lib/billing/plans";

const MENU_KEY = { blog: "blog", instagram: "insta", place: "place" };

function channelLabel(menuOrChannelId) {
  const key = MENU_KEY[menuOrChannelId] || menuOrChannelId;
  return CHANNEL_PRODUCTS[key]?.menuLabel || menuOrChannelId;
}

/** 이야기 쓰기 후 자동 연동 순서 (코드와 동일) */
export function formatAutoPipelineOrder() {
  return AUTO_PIPELINE_ORDER.map((id) => channelLabel(id)).join(" → ");
}

export function formatMainChannelTabs() {
  return MAIN_CHANNEL_IDS.map((id) => CHANNEL_PRODUCTS[id]?.shortLabel || id).join(
    " · "
  );
}

function speakerLabels(values = []) {
  const set = new Set(values);
  return V4_SPEAKER_OPTIONS.filter((o) => set.has(o.value)).map((o) => o.label);
}

export const VISIT_REVIEW_SPEAKER_LABELS = speakerLabels([
  "plain_review",
  "real_use",
]);
export const COLUMN_SPEAKER_LABELS = speakerLabels([
  "column",
  "magazine",
  "expert_info",
  "local_blogger",
]);

export const RESEARCH_TYPE_LABELS = RESEARCH_TYPE_OPTIONS.map((o) => o.label).join(
  ", "
);

export const PLAN_UI_LABEL = "플랜";

export function formatMonthlyLimits() {
  return `무료 ${PLANS.free.contentPerMonth}회 · 플러스 ${PLANS.brand.contentPerMonth}회 · 스튜디오 ${PLANS.studio.contentPerMonth}회`;
}

export function formatFreePlanChannelNote() {
  return `무료는 ${channelLabel("blog")}만 가능합니다. ${channelLabel("place")}·${channelLabel("insta")}·${channelLabel("image")}는 플러스 이상입니다.`;
}

export const FORM_ADVANCED_SECTION = "더 맞추기";
