/**
 * COMMUNITY SIGNAL ENGINE — 복사·발행·저수정 상위 구조 (익명 집계)
 */

function eventScore(events = []) {
  let copy = 0;
  let save = 0;
  let rewrite = 0;
  let edit = 0;
  let deleteCount = 0;
  for (const e of events) {
    const type = String(e.event_type || "");
    if (/copy|download/.test(type)) copy += 1;
    if (type === "save") save += 1;
    if (type === "rewrite") rewrite += 1;
    if (type === "human_edit") edit += 1;
    if (type === "delete") deleteCount += 1;
  }
  const penalty = rewrite * 2 + edit + deleteCount * 3;
  return copy * 5 + save * 3 - penalty;
}

/**
 * @param {Array<{ id: string, channel?: string, title?: string, quality_score?: number }>} items
 * @param {Array<{ content_item_id?: string, event_type?: string }>} events
 */
export function rankCommunityContentSignals(items = [], events = []) {
  const byItem = new Map();
  for (const ev of events) {
    const id = ev.content_item_id;
    if (!id) continue;
    if (!byItem.has(id)) byItem.set(id, []);
    byItem.get(id).push(ev);
  }

  const ranked = (items || [])
    .map((item) => {
      const evs = byItem.get(item.id) || [];
      const score = eventScore(evs);
      const copies = evs.filter((e) => /copy|download/.test(e.event_type)).length;
      const rewrites = evs.filter((e) => e.event_type === "rewrite").length;
      return {
        contentItemId: item.id,
        channel: item.channel,
        title: item.title,
        score,
        copies,
        rewrites,
        qualityScore: item.quality_score,
        anonymous: true,
      };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const topCount = Math.max(1, Math.ceil(ranked.length * 0.05));
  const top = ranked.slice(0, topCount);

  return {
    total: ranked.length,
    topPercent: 5,
    top,
    structures: top.map((r) => ({
      channel: r.channel,
      copies: r.copies,
      rewrites: r.rewrites,
      note: "복사·저장 높고 재작성·수정 낮은 구조",
    })),
  };
}

export function formatCommunitySignalBrief(community = {}) {
  const top = community.top || community.structures || [];
  if (!top.length) return "";
  const lines = top.slice(0, 5).map((r) => {
    const ch = r.channel || "blog";
    const copies = r.copies ?? 0;
    const rewrites = r.rewrites ?? 0;
    return `${ch}: 복사 ${copies} · 재작성 ${rewrites}`;
  });
  return ["상위 성과 구조 (익명)", ...lines.map((l) => `- ${l}`)].join("\n");
}
