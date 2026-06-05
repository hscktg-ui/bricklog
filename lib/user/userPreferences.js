import { normalizeUserId } from "./workspaceStorage";

const prefsKey = (userId) => `briclog-prefs-${normalizeUserId(userId)}`;

import {
  CHANNEL_PRODUCTS,
  DEFAULT_SIDEBAR_MENU_ORDER,
} from "@/lib/channels/channelProducts";
import { isFastOnboarding } from "@/lib/config/productFlags";

export const PRIMARY_CHANNEL_OPTIONS = ["blog", "place", "insta", "image"].map(
  (id) => {
    const p = CHANNEL_PRODUCTS[id];
    return { id: p.id, label: p.menuLabel, desc: p.desc, icon: p.icon };
  }
);

export const DEFAULT_USER_PREFERENCES = {
  primaryChannel: "blog",
  onboardingComplete: false,
  defaultSpeechStyle: "",
  defaultEmojiDensity: "",
  writingNote: "",
  /** 간단 모드 — 메뉴·결과 UI 축소 (기본 켜짐) */
  simpleWorkspaceMode: true,
  /** @type {string[] | null} 좌측 메뉴 id 순서 (null = 기본) */
  sidebarMenuOrder: null,
  updatedAt: null,
};

export function getSidebarMenuOrder(userId) {
  const prefs = loadUserPreferences(userId);
  const order = prefs.sidebarMenuOrder;
  if (Array.isArray(order) && order.length > 0) return order;
  return [...DEFAULT_SIDEBAR_MENU_ORDER];
}

export function saveSidebarMenuOrder(userId, menuOrder) {
  return saveUserPreferences(userId, { sidebarMenuOrder: menuOrder });
}

function preferenceDefaults() {
  return {
    ...DEFAULT_USER_PREFERENCES,
    onboardingComplete: isFastOnboarding(),
  };
}

export function loadUserPreferences(userId) {
  const defaults = preferenceDefaults();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(prefsKey(userId));
    if (raw) {
      const merged = { ...defaults, ...JSON.parse(raw) };
      if (isFastOnboarding() && merged.onboardingComplete === false) {
        return { ...merged, onboardingComplete: true };
      }
      return merged;
    }
  } catch {
    /* ignore */
  }
  return defaults;
}

export function saveUserPreferences(userId, patch) {
  const next = {
    ...loadUserPreferences(userId),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(prefsKey(userId), JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}

export function completeChannelOnboarding(userId, primaryChannel) {
  return saveUserPreferences(userId, {
    primaryChannel,
    onboardingComplete: true,
  });
}

/** 채널 선택(첫 화면) 다시 보기 */
export function resetChannelOnboarding(userId) {
  return saveUserPreferences(userId, { onboardingComplete: false });
}

/** 저장소 초기화 직후 — 채널 환영 없이 블로그 화면으로 바로 이어지게 */
export function seedPreferencesAfterWorkspaceReset(userId) {
  return saveUserPreferences(userId, {
    primaryChannel: "blog",
    onboardingComplete: true,
  });
}

export function getChannelMeta(channelId) {
  return (
    PRIMARY_CHANNEL_OPTIONS.find((c) => c.id === channelId) ||
    PRIMARY_CHANNEL_OPTIONS[0]
  );
}
