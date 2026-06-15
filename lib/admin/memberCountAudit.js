import { startOfTodayKstIso, daysAgoIso } from "@/lib/admin/kstTime";

const SESSION_PAGE_SIZE = 5000;
const SESSION_MAX_PAGES = 24;

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} db
 */
export async function countAuthUsers(db) {
  let page = 1;
  let total = 0;
  while (page <= 50) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { total: null, error: error.message };
    const batch = data?.users?.length ?? 0;
    total += batch;
    if (batch < 1000) return { total, pages: page };
    page += 1;
  }
  return { total, pages: page, capped: true };
}

/**
 * Paginated unique session_id count (avoids 5k row undercount).
 * @param {import("@supabase/supabase-js").SupabaseClient} db
 */
export async function countUniqueSessionsSince(db, sinceIso) {
  const sessions = new Set();
  let from = 0;
  let truncated = false;

  for (let page = 0; page < SESSION_MAX_PAGES; page += 1) {
    const { data, error } = await db
      .from("site_visits")
      .select("session_id")
      .gte("created_at", sinceIso)
      .range(from, from + SESSION_PAGE_SIZE - 1);

    if (error) {
      return { count: null, truncated: false, error: error.message };
    }

    for (const row of data || []) {
      if (row.session_id) sessions.add(row.session_id);
    }

    if ((data || []).length < SESSION_PAGE_SIZE) {
      return { count: sessions.size, truncated: false, error: null };
    }

    from += SESSION_PAGE_SIZE;
    if (page === SESSION_MAX_PAGES - 1) truncated = true;
  }

  return { count: sessions.size, truncated, error: null };
}

export function signupConversionPct(signups, uniqueVisitors) {
  if (signups == null || uniqueVisitors == null || uniqueVisitors <= 0) {
    return null;
  }
  return Math.round((signups / uniqueVisitors) * 1000) / 10;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} db
 */
export async function fetchMemberCountAudit(db) {
  const todayIso = startOfTodayKstIso();
  const since7d = daysAgoIso(7);

  const [
    profilesTotal,
    signupsToday,
    visitsToday,
    uniqueToday,
    unique7d,
    visits7d,
    authUsers,
    recentSignups,
  ] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayIso),
    db
      .from("site_visits")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayIso),
    countUniqueSessionsSince(db, todayIso),
    countUniqueSessionsSince(db, since7d),
    db
      .from("site_visits")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since7d),
    countAuthUsers(db),
    db
      .from("profiles")
      .select("id, email, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const profilesCount = profilesTotal.error ? null : profilesTotal.count ?? 0;
  const authCount = authUsers.total;
  const profilesGap =
    profilesCount != null && authCount != null ? authCount - profilesCount : null;

  return {
    asOf: new Date().toISOString(),
    todayStartKst: todayIso,
    profilesTotal: profilesCount,
    authUsersTotal: authCount,
    profilesVsAuthGap: profilesGap,
    signupsToday: signupsToday.error ? null : signupsToday.count ?? 0,
    visitsTodayPageviews: visitsToday.error ? null : visitsToday.count ?? 0,
    uniqueVisitorsToday: uniqueToday.count,
    uniqueVisitorsTodayTruncated: uniqueToday.truncated,
    visits7dPageviews: visits7d.error ? null : visits7d.count ?? 0,
    uniqueVisitors7d: unique7d.count,
    uniqueVisitors7dTruncated: unique7d.truncated,
    signupConversionTodayPct: signupConversionPct(
      signupsToday.error ? null : signupsToday.count ?? 0,
      uniqueToday.count
    ),
    recentSignups: recentSignups.data ?? [],
    errors: {
      profiles: profilesTotal.error?.message || null,
      auth: authUsers.error || null,
      visitsToday: visitsToday.error?.message || null,
      uniqueToday: uniqueToday.error || null,
    },
    notes: [
      "전체 회원·오늘 가입 = profiles 테이블 (가입 완료 기준)",
      "방문·순방문 = site_visits (익명·페이지뷰 포함, 가입과 1:1 아님)",
      "랜딩 누적 이용자(seed)와 관리자 회원 수는 별개입니다",
    ],
  };
}
