import { isFormValid } from "@/lib/formValidation";
import { normalizeUserId } from "@/lib/user/workspaceStorage";
import { QUICK_DEMO_POOL } from "@/lib/onboarding/quickDemoPool";

export const QUICK_DEMO_HISTORY_MIN = 3;

const IDX_KEY = (userId) =>
  `briclog-quick-demo-idx-${normalizeUserId(userId)}`;

function hashSeed(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h + str.charCodeAt(i) * (i + 1)) % 997;
  }
  return h;
}

function archiveChannelCount(archive = {}, channel) {
  return (archive[channel] || []).filter(
    (e) => e?.text?.trim() || e?.preview?.trim() || e?.title?.trim()
  ).length;
}

/** 브랜드·아카이브·로컬 피드백 등으로 콘텐츠 이력 신호 개수 */
export function countUserContentSignals({ activeBrand, userId }) {
  const archive = activeBrand?.contentArchive || {};
  let n =
    archiveChannelCount(archive, "blog") +
    archiveChannelCount(archive, "place") +
    archiveChannelCount(archive, "insta");

  const recent = activeBrand?.recentContent || {};
  if (recent.blog?.preview) n += 1;
  if (recent.place?.preview) n += 1;
  if (recent.insta?.preview) n += 1;

  if (typeof window !== "undefined" && userId) {
    try {
      const raw = localStorage.getItem(`briclog-feedback-${normalizeUserId(userId)}`);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) n += Math.min(list.length, 5);
      }
    } catch {
      /* ignore */
    }
  }

  return n;
}

function topicFromArchiveEntry(entry) {
  const title = entry?.title || entry?.representativeTitle || entry?.preview;
  if (title?.trim()) return String(title).trim().slice(0, 120);
  const text = String(entry?.text || "").trim();
  const line = text.split("\n").find((l) => l.trim());
  return line?.trim().slice(0, 120) || "";
}

function lastBlogArchiveEntry(activeBrand) {
  const list = activeBrand?.contentArchive?.blog || [];
  if (!list.length) return null;
  return list[list.length - 1];
}

/** 이력 기반 폼 패치 (동기, activeBrand만 사용) */
export function buildQuickDemoFromHistory(activeBrand) {
  if (!activeBrand) return null;

  const brandName =
    activeBrand.brandName?.trim() ||
    activeBrand.recentContent?.blog?.preview?.slice(0, 24) ||
    "";
  let region = activeBrand.region?.trim() || "";
  if (region.length < 2) region = "전국";

  const lastEntry = lastBlogArchiveEntry(activeBrand);
  let topic =
    topicFromArchiveEntry(lastEntry) ||
    activeBrand.recentContent?.blog?.preview?.trim() ||
    "";
  if (!topic && activeBrand.highPerformingPatterns?.[0]) {
    topic = String(activeBrand.highPerformingPatterns[0]).trim();
  }
  if (!topic && brandName) {
    topic = `${brandName} 소식`;
  }

  let mainKeyword = activeBrand.mainKeyword?.trim() || "";
  if (!mainKeyword && activeBrand.preferredKeywords?.trim()) {
    mainKeyword = activeBrand.preferredKeywords.split(",")[0].trim();
  }
  if (!mainKeyword && topic) {
    mainKeyword = topic.split(/[,，]/)[0].trim().slice(0, 40);
  }

  return { brandName, region, topic, mainKeyword };
}

export function isArchiveEmptyForQuickDemo(activeBrand) {
  const archive = activeBrand?.contentArchive || {};
  return (
    archiveChannelCount(archive, "blog") === 0 &&
    archiveChannelCount(archive, "place") === 0 &&
    archiveChannelCount(archive, "insta") === 0
  );
}

/** 풀에서 순환 선택 — 클릭마다 다른 인덱스 */
export function pickQuickDemoSeed({ userId, brandId } = {}) {
  const pool = QUICK_DEMO_POOL;
  const n = pool.length;
  if (!n) return {};

  let idx = 0;
  if (typeof window !== "undefined" && userId) {
    try {
      const raw = localStorage.getItem(IDX_KEY(userId));
      idx = Number.parseInt(raw ?? "0", 10);
      if (!Number.isFinite(idx) || idx < 0) idx = 0;
      idx = idx % n;
      localStorage.setItem(IDX_KEY(userId), String((idx + 1) % n));
    } catch {
      idx = hashSeed(String(brandId || userId)) % n;
    }
  } else {
    idx = hashSeed(String(brandId || "guest")) % n;
  }

  return { ...pool[idx] };
}

/**
 * 맛보기용 폼 패치 결정
 * @returns {{ patch: object, source: 'history'|'pool', needsMemoryFetch?: boolean }}
 */
export function resolveQuickDemoInput({ userId, brandId, activeBrand }) {
  const count = countUserContentSignals({ userId, activeBrand });

  if (count >= QUICK_DEMO_HISTORY_MIN) {
    const fromHistory = buildQuickDemoFromHistory(activeBrand);
    if (fromHistory && isFormValid(fromHistory)) {
      return { patch: fromHistory, source: "history" };
    }
    if (isArchiveEmptyForQuickDemo(activeBrand)) {
      return {
        patch: pickQuickDemoSeed({ userId, brandId }),
        source: "pool",
        needsMemoryFetch: true,
      };
    }
  }

  return {
    patch: pickQuickDemoSeed({ userId, brandId }),
    source: "pool",
  };
}

/** needsMemoryFetch일 때 서버 memory에서 주제 보강 */
export async function enrichQuickDemoFromMemory(patch, { brandId }) {
  if (!brandId || typeof window === "undefined") return patch;
  try {
    const { fetchWithAuth } = await import("@/lib/api/clientAuth");
    const q = new URLSearchParams({ brandId, channel: "blog" });
    const data = await fetchWithAuth(`/api/memory/content?${q}`);
    const items = data?.items || data?.content || [];
    const latest = items[0];
    const title = latest?.title?.trim();
    if (title) {
      const next = { ...patch, topic: title };
      if (!next.mainKeyword?.trim()) {
        next.mainKeyword = title.split(/[,，]/)[0].trim().slice(0, 40);
      }
      if (isFormValid(next)) return next;
    }
  } catch {
    /* memory optional */
  }
  return patch;
}
