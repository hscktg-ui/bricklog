/**
 * 로그인 환영 — 디렉터 이름·지난 글 스니펫
 */

const CHANNEL_LABELS = {
  blog: "블로그",
  place: "플레이스",
  instagram: "인스타",
  insta: "인스타",
};

/**
 * @param {{ nickname?: string, displayName?: string, email?: string } | null} profile
 * @param {{ email?: string } | null} user
 */
export function resolveDirectorName(profile, user) {
  const fromNickname = profile?.nickname?.trim();
  if (fromNickname) return fromNickname;
  const fromProfile = profile?.displayName?.trim();
  if (fromProfile) return fromProfile;
  const email = user?.email || profile?.email || "";
  const prefix = email.split("@")[0]?.trim();
  return prefix || "회원";
}

/** @param {string} [channel] */
export function channelLabel(channel) {
  if (!channel) return "";
  return CHANNEL_LABELS[channel] || channel;
}

/**
 * @param {string} text
 * @param {number} [maxLen]
 */
export function snippetFromContent(text, maxLen = 72) {
  const plain = String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "";
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen).trim()}…`;
}

/**
 * @param {Record<string, unknown> | null | undefined} item
 */
export function mapLastContentItem(item) {
  if (!item) return null;
  const title = String(item.title || "").trim();
  const body = String(item.full_content ?? item.fullContent ?? "").trim();
  const snippet = snippetFromContent(body || title);
  if (!title && !snippet) return null;
  return {
    title: title || "지난 글",
    snippet,
    channel: channelLabel(String(item.channel || "")),
  };
}
