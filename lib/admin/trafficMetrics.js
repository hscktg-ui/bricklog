import { daysAgoIso } from "@/lib/admin/kstTime";
import {
  classifyVisitSource,
  VISIT_SOURCE_CHANNELS,
  VISIT_SOURCE_LABELS,
} from "@/lib/analytics/visitSource";

const FETCH_LIMIT = 8000;

function emptyChannelMap() {
  return Object.fromEntries(VISIT_SOURCE_CHANNELS.map((id) => [id, 0]));
}

function bump(map, key) {
  if (!map[key]) map[key] = 0;
  map[key] += 1;
}

function resolveChannel(row) {
  if (row.source_channel && VISIT_SOURCE_CHANNELS.includes(row.source_channel)) {
    return row.source_channel;
  }
  return classifyVisitSource({
    referrer: row.referrer,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
  });
}

export function aggregateRows(rows = []) {
  const channels = emptyChannelMap();
  const paths = {};
  const referrers = {};
  const utmCampaigns = {};
  const sessions = new Set();

  for (const row of rows) {
    const channel = resolveChannel(row);
    bump(channels, channel);
    bump(paths, row.path || "/");
    sessions.add(row.session_id);

    const ref = (row.referrer || "").trim();
    if (ref) bump(referrers, ref.slice(0, 120));

    const campaign = (row.utm_campaign || "").trim();
    if (campaign) {
      const key = `${row.utm_source || "?"} / ${row.utm_medium || "?"} / ${campaign}`;
      bump(utmCampaigns, key);
    }
  }

  const total = rows.length;
  const organic =
    (channels.google_organic || 0) +
    (channels.naver_organic || 0) +
    (channels.daum_organic || 0);

  const topEntries = (map, limit = 8) =>
    Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([label, count]) => ({ label, count }));

  return {
    total,
    uniqueSessions: sessions.size,
    organic,
    organicRate: total > 0 ? Math.round((organic / total) * 1000) / 10 : 0,
    channels: VISIT_SOURCE_CHANNELS.map((id) => ({
      id,
      label: VISIT_SOURCE_LABELS[id] || id,
      count: channels[id] || 0,
      share: total > 0 ? Math.round(((channels[id] || 0) / total) * 1000) / 10 : 0,
    })).filter((c) => c.count > 0),
    topPaths: topEntries(paths),
    topReferrers: topEntries(referrers),
    topCampaigns: topEntries(utmCampaigns, 6),
  };
}

export async function fetchVisitRowsSince(db, sinceIso) {
  const selectFull =
    "session_id, path, referrer, utm_source, utm_medium, utm_campaign, source_channel, created_at";
  const selectFallback = "session_id, path, referrer, created_at";
  let select = selectFull;
  const all = [];
  let from = 0;
  const page = 1000;

  while (all.length < FETCH_LIMIT) {
    const { data, error } = await db
      .from("site_visits")
      .select(select)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .range(from, from + page - 1);

    if (error) {
      if (/site_visits|relation|does not exist/i.test(error.message)) {
        return { rows: [], tableReady: false, truncated: false, error: null };
      }
      if (/utm_|source_channel|column/i.test(error.message) && select === selectFull) {
        select = selectFallback;
        from = 0;
        all.length = 0;
        continue;
      }
      return { rows: [], tableReady: false, truncated: false, error: error.message };
    }

    const batch = data || [];
    all.push(...batch);
    if (batch.length < page) {
      return {
        rows: all,
        tableReady: true,
        truncated: false,
        schemaV20: select === selectFull,
        error: null,
      };
    }
    from += page;
    if (from >= FETCH_LIMIT) {
      return {
        rows: all.slice(0, FETCH_LIMIT),
        tableReady: true,
        truncated: true,
        schemaV20: select === selectFull,
        error: null,
      };
    }
  }

  return {
    rows: all,
    tableReady: true,
    truncated: all.length >= FETCH_LIMIT,
    schemaV20: select === selectFull,
    error: null,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} db
 */
export async function fetchAdminTrafficMetrics(db) {
  const since7d = daysAgoIso(7);
  const since21d = daysAgoIso(21);
  const since30d = daysAgoIso(30);

  const [weekPack, d21Pack, monthPack] = await Promise.all([
    fetchVisitRowsSince(db, since7d),
    fetchVisitRowsSince(db, since21d),
    fetchVisitRowsSince(db, since30d),
  ]);

  const tableReady = weekPack.tableReady || d21Pack.tableReady || monthPack.tableReady;
  const schemaV20 = weekPack.schemaV20 !== false && d21Pack.schemaV20 !== false && monthPack.schemaV20 !== false;

  return {
    asOf: new Date().toISOString(),
    tableReady,
    schemaV20,
    truncated: weekPack.truncated || d21Pack.truncated || monthPack.truncated,
    fetchLimit: FETCH_LIMIT,
    last7d: aggregateRows(weekPack.rows),
    last21d: aggregateRows(d21Pack.rows),
    last30d: aggregateRows(monthPack.rows),
    hints: [
      !tableReady
        ? "site_visits 테이블이 없습니다. supabase/schema-v17-admin-ops.sql을 적용하세요."
        : null,
      tableReady && !schemaV20
        ? "referrer만 집계 중입니다. UTM·검색 채널은 schema-v20-traffic-attribution.sql 적용 후 정확해집니다."
        : null,
      "회원별 최초 유입은 schema-v21-user-acquisition.sql 적용 후 Admin › 사용자 탭에 표시됩니다.",
      "Search Console·네이버 서치어드바이저 클릭 수는 각 콘솔에서 확인하세요.",
    ].filter(Boolean),
    error: weekPack.error || d21Pack.error || monthPack.error,
  };
}
