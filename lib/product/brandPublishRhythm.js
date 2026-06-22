/**
 * 브랜드 채널별 발행 리듬 — 스케줄·팁 SSOT
 */

export const CHANNEL_CADENCE_DAYS = {
  blog: 7,
  place: 14,
  instagram: 4,
};

const CHANNEL_LABEL = {
  blog: "이야기",
  place: "플레이스",
  instagram: "인스타",
  insta: "인스타",
};

/**
 * @param {string | null | undefined} createdAt
 * @param {number} [nowMs]
 */
function daysSince(createdAt, nowMs = Date.now()) {
  if (!createdAt) return null;
  const t = new Date(createdAt).getTime();
  if (!t) return null;
  return Math.floor((nowMs - t) / 86_400_000);
}

/**
 * @param {{ channel?: string; created_at?: string | null }[]} historyItems
 * @param {number} [nowMs]
 */
export function analyzePublishRhythm(historyItems = [], nowMs = Date.now()) {
  /** @type {Record<string, string | null>} */
  const lastByChannel = {};

  for (const item of historyItems) {
    const ch = String(item.channel || "blog").toLowerCase();
    const key = ch === "insta" ? "instagram" : ch;
    const at = item.created_at;
    if (!at) continue;
    if (!lastByChannel[key] || new Date(at) > new Date(lastByChannel[key])) {
      lastByChannel[key] = at;
    }
  }

  return Object.entries(CHANNEL_CADENCE_DAYS).map(([channel, cadenceDays]) => {
    const lastAt = lastByChannel[channel] || null;
    const daysSinceLast = daysSince(lastAt, nowMs);
    let status = "never";
    if (daysSinceLast != null) {
      if (daysSinceLast <= cadenceDays) status = "ok";
      else if (daysSinceLast <= cadenceDays * 2) status = "due";
      else status = "overdue";
    }
    return {
      channel,
      label: CHANNEL_LABEL[channel] || channel,
      cadenceDays,
      lastAt,
      daysSinceLast,
      status,
    };
  });
}

/**
 * @param {ReturnType<typeof analyzePublishRhythm>} rhythm
 * @param {string} [brandName]
 */
export function buildRhythmScheduleTips(rhythm = [], brandName = "브랜드") {
  /** @type {{ id: string; kind: 'rhythm'; tone: 'info' | 'warn' | 'accent'; title: string; body: string }[]} */
  const tips = [];
  const overdue = rhythm.filter((r) => r.status === "overdue" || r.status === "due");

  for (const row of overdue.slice(0, 2)) {
    const tone = row.status === "overdue" ? "warn" : "info";
    tips.push({
      id: `rhythm-${row.channel}`,
      kind: "rhythm",
      tone,
      title: `${row.label} 업데이트 ${row.status === "overdue" ? "지연" : "권장"}`,
      body:
        row.daysSinceLast == null
          ? `${brandName} ${row.label} 기록이 없습니다. 이번 주 ${row.cadenceDays}일 주기 목표에 맞춰 한 편 올려 보세요.`
          : `마지막 ${row.label}이 ${row.daysSinceLast}일 전입니다. 권장 주기는 ${row.cadenceDays}일마다입니다.`,
    });
  }

  const allOk = rhythm.length > 0 && rhythm.every((r) => r.status === "ok");
  if (allOk) {
    tips.push({
      id: "rhythm-all-ok",
      kind: "rhythm",
      tone: "accent",
      title: "채널 리듬이 안정적이에요",
      body: "이야기·플레이스·인스타가 균형 있게 쌓이고 있습니다. 같은 주제로 채널만 바꿔 이어가면 됩니다.",
    });
  }

  return tips.slice(0, 2);
}
