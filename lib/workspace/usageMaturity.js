/**
 * 지속 사용·페르소나 피드백 → 제품 성숙도 (Steve Jobs filter)
 * - 첫 승리(≤3회)만 온보딩 UI
 * - 5회+ 기록이 복귀 경로
 * - 10회+ 말줄임·숨김
 * - 30회+는 간단 모드·전문가 보기로 이미 커버
 */

export const QUICK_DEMO_MAX_BLOG_GENERATIONS = 3;
export const HISTORY_SHORTCUT_MIN_BLOG_GENERATIONS = 5;
export const MATURE_BLOG_GENERATIONS = 10;
export const CHANNEL_PACK_COMPACT_MIN = 10;

/** @param {import('@/context/BrandWorkspaceContext').Brand | null} [activeBrand] */
export function countBrandBlogGenerations(activeBrand) {
  return activeBrand?.contentArchive?.blog?.length ?? 0;
}

export function shouldShowQuickDemo({ generationCount = 0, demoMode = false } = {}) {
  if (demoMode) return true;
  return generationCount < QUICK_DEMO_MAX_BLOG_GENERATIONS;
}

export function shouldShowHistoryShortcut(generationCount = 0) {
  return generationCount >= HISTORY_SHORTCUT_MIN_BLOG_GENERATIONS;
}

export function isMatureBlogUser(generationCount = 0) {
  return generationCount >= MATURE_BLOG_GENERATIONS;
}

export function shouldUseCompactChannelPackCopy(generationCount = 0) {
  return generationCount >= CHANNEL_PACK_COMPACT_MIN;
}

/** @param {import('@/context/BrandWorkspaceContext').Brand | null} [activeBrand] */
export function getRecentBlogTitle(activeBrand) {
  const archive = activeBrand?.contentArchive?.blog;
  if (!archive?.length) return null;
  const latest = archive[0];
  return latest?.representativeTitle || latest?.title || null;
}
