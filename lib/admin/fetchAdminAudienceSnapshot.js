import { daysAgoIso } from "@/lib/admin/kstTime";
import { countUniqueSessionsSince } from "@/lib/admin/memberCountAudit";
import {
  classifyMemberAudience,
  isExternalAudience,
  MEMBER_AUDIENCE_LABELS,
} from "@/lib/admin/memberAudience";
import { aggregateRows, fetchVisitRowsSince } from "@/lib/admin/trafficMetrics";
import { formatUserAcquisitionBrief } from "@/lib/analytics/userAcquisition";

const PROFILE_FIELDS =
  "id,email,nickname,display_name,role,created_at,last_login_at,last_seen_at,profile_completed_at,phone_verified_at,acquisition_source_channel,acquisition_path,acquisition_referrer,acquisition_utm_source,acquisition_utm_medium,acquisition_utm_campaign";

function isPageview(path = "") {
  const p = String(path || "");
  return !p.startsWith("__") && p !== "/admin";
}

function summarizeTrafficRows(rows = []) {
  const agg = aggregateRows(rows.filter((r) => isPageview(r.path)));
  const sessions = new Set();
  for (const row of rows) {
    if (row.session_id) sessions.add(row.session_id);
  }
  return {
    uniqueSessions: sessions.size,
    pageviews: agg.total,
    organic: agg.organic,
    organicRate: agg.organicRate,
    topChannels: agg.channels.slice(0, 5),
  };
}

async function fetchAllProfiles(db) {
  const all = [];
  let from = 0;
  const page = 1000;
  let select = PROFILE_FIELDS;

  while (true) {
    let res = await db
      .from("profiles")
      .select(select)
      .order("created_at", { ascending: false })
      .range(from, from + page - 1);
    if (res.error && /acquisition_|phone_verified|profile_completed|last_seen/i.test(res.error.message)) {
      select =
        "id,email,nickname,display_name,role,created_at,last_login_at";
      from = 0;
      all.length = 0;
      continue;
    }
    if (res.error) return { rows: [], error: res.error.message };
    const batch = res.data || [];
    all.push(...batch);
    if (batch.length < page) break;
    from += page;
  }
  return { rows: all, error: null };
}

async function countByUser(db, table, userIdField = "user_id") {
  const map = {};
  let from = 0;
  const page = 1000;
  while (true) {
    const { data, error } = await db
      .from(table)
      .select(userIdField)
      .range(from, from + page - 1);
    if (error) return { map: {}, error: error.message };
    for (const row of data || []) {
      const id = row[userIdField];
      if (!id) continue;
      map[id] = (map[id] || 0) + 1;
    }
    if ((data || []).length < page) break;
    from += page;
  }
  return { map, error: null };
}

function excerpt(text = "", max = 120) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} db
 */
export async function fetchAdminAudienceSnapshot(db) {
  const since7d = daysAgoIso(7);
  const since21d = daysAgoIso(21);
  const since30d = daysAgoIso(30);

  const [
    profilesPack,
    brandsRes,
    contentCounts,
    generationCounts,
    weekVisits,
    d21Visits,
    monthVisits,
    unique7d,
    unique21d,
    unique30d,
    recentContentRes,
    recentGenRes,
    recentUsageRes,
  ] = await Promise.all([
    fetchAllProfiles(db),
    db.from("brands").select("id,user_id,name,industry"),
    countByUser(db, "content_items"),
    countByUser(db, "generations"),
    fetchVisitRowsSince(db, since7d),
    fetchVisitRowsSince(db, since21d),
    fetchVisitRowsSince(db, since30d),
    countUniqueSessionsSince(db, since7d),
    countUniqueSessionsSince(db, since21d),
    countUniqueSessionsSince(db, since30d),
    db
      .from("content_items")
      .select(
        "id,user_id,channel,title,full_content,quality_score,created_at,prompt_input"
      )
      .order("created_at", { ascending: false })
      .limit(25),
    db
      .from("generations")
      .select(
        "id,user_id,main_keyword,business_type,region,blog,place,instagram,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(25),
    db
      .from("usage_logs")
      .select("id,user_id,action,created_at")
      .in("action", ["blog_generate", "image_generate", "channel_generate"])
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const brandsByUser = {};
  for (const b of brandsRes.data || []) {
    if (!b.user_id) continue;
    if (!brandsByUser[b.user_id]) brandsByUser[b.user_id] = [];
    brandsByUser[b.user_id].push({ name: b.name, industry: b.industry });
  }

  const emailById = Object.fromEntries(
    (profilesPack.rows || []).map((p) => [p.id, p.email])
  );

  const members = (profilesPack.rows || []).map((p) => {
    const audience = classifyMemberAudience(p.email);
    const brands = brandsByUser[p.id] || [];
    return {
      id: p.id,
      email: p.email,
      nickname: p.nickname || p.display_name || null,
      role: p.role,
      audience,
      audienceLabel: MEMBER_AUDIENCE_LABELS[audience],
      isExternal: isExternalAudience(audience),
      createdAt: p.created_at,
      lastLoginAt: p.last_login_at,
      lastSeenAt: p.last_seen_at,
      profileCompleted: Boolean(p.profile_completed_at),
      phoneVerified: Boolean(p.phone_verified_at),
      brandCount: brands.length,
      brands: brands.slice(0, 3),
      contentCount: contentCounts.map[p.id] || 0,
      generationCount: generationCounts.map[p.id] || 0,
      acquisition: formatUserAcquisitionBrief(p),
    };
  });

  const audienceSummary = {};
  for (const m of members) {
    audienceSummary[m.audience] = (audienceSummary[m.audience] || 0) + 1;
  }

  const externalMembers = members.filter((m) => m.isExternal);
  const internalMembers = members.filter((m) => !m.isExternal);

  const recentContent = (recentContentRes.data || []).map((row) => ({
    kind: "content_item",
    id: row.id,
    at: row.created_at,
    channel: row.channel,
    title: row.title || row.prompt_input?.topic || row.prompt_input?.mainKeyword || "",
    excerpt: excerpt(row.full_content, 140),
    qualityScore: row.quality_score,
    userEmail: emailById[row.user_id] || null,
    audience: classifyMemberAudience(emailById[row.user_id]),
  }));

  const recentGenerations = (recentGenRes.data || []).map((row) => ({
    kind: "generation",
    id: row.id,
    at: row.created_at,
    channel: "blog",
    title: row.main_keyword || row.business_type || "",
    excerpt: excerpt(row.blog || row.place || row.instagram, 140),
    region: row.region,
    userEmail: emailById[row.user_id] || null,
    audience: classifyMemberAudience(emailById[row.user_id]),
  }));

  const recentUsage = (recentUsageRes.data || []).map((row) => ({
    kind: "usage",
    id: row.id,
    at: row.created_at,
    channel: row.action,
    title: row.action,
    excerpt: "",
    userEmail: emailById[row.user_id] || null,
    audience: classifyMemberAudience(emailById[row.user_id]),
  }));

  const recentActivity = [...recentContent, ...recentGenerations, ...recentUsage]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 30);

  return {
    asOf: new Date().toISOString(),
    members: {
      total: members.length,
      external: externalMembers.length,
      internal: internalMembers.length,
      byAudience: audienceSummary,
      rows: members,
    },
    traffic: {
      tableReady: weekVisits.tableReady,
      truncated: weekVisits.truncated || d21Visits.truncated || monthVisits.truncated,
      last7d: {
        ...summarizeTrafficRows(weekVisits.rows),
        uniqueSessionsAudited: unique7d.count,
        uniqueTruncated: unique7d.truncated === true,
      },
      last21d: {
        ...summarizeTrafficRows(d21Visits.rows),
        uniqueSessionsAudited: unique21d.count,
        uniqueTruncated: unique21d.truncated === true,
      },
      last30d: {
        ...summarizeTrafficRows(monthVisits.rows),
        uniqueSessionsAudited: unique30d.count,
        uniqueTruncated: unique30d.truncated === true,
      },
      note: "순방문=고유 session_id · 페이지뷰=/admin·__intent 제외 · 내부·봇 혼입 가능",
    },
    recentActivity,
    tables: {
      contentItemsReady: !recentContentRes.error,
      generationsReady: !recentGenRes.error,
      usageLogsReady: !recentUsageRes.error,
    },
    hints: [
      "외부 유저 = BRICLOG_TEAM_EMAILS·운영자·@briclog.ai·테스트 제외",
      "팀 이메일 추가: Vercel env BRICLOG_TEAM_EMAILS=email1@...,email2@...",
      profilesPack.error ? `profiles: ${profilesPack.error}` : null,
    ].filter(Boolean),
  };
}
