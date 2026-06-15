import { startOfTodayKstIso, minutesAgoIso } from "@/lib/admin/kstTime";
import {
  countAuthUsers,
  countUniqueSessionsSince,
  signupConversionPct,
} from "@/lib/admin/memberCountAudit";

const ONLINE_WINDOW_MIN = 5;

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} db
 */
export async function fetchAdminLiveMetrics(db) {
  const todayIso = startOfTodayKstIso();
  const onlineSince = minutesAgoIso(ONLINE_WINDOW_MIN);

  const [
    totalUsersRes,
    signupsTodayRes,
    onlineRes,
    activeTodayEventsRes,
    visitsTodayRes,
    uniqueTodayPack,
    errorsTodayRes,
    authUsersPack,
    signupIntentsTodayRes,
  ] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayIso),
    db
      .from("profiles")
      .select("id, email, display_name, nickname, last_seen_at, last_login_at")
      .gte("last_seen_at", onlineSince)
      .order("last_seen_at", { ascending: false })
      .limit(50),
    db
      .from("content_events")
      .select("user_id")
      .gte("created_at", todayIso)
      .not("user_id", "is", null),
    db
      .from("site_visits")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayIso),
    countUniqueSessionsSince(db, todayIso),
    db
      .from("error_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayIso),
    countAuthUsers(db),
    db
      .from("site_visits")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayIso)
      .like("path", "__intent/signup%"),
  ]);

  const activeUserIds = new Set(
    (activeTodayEventsRes.data || []).map((r) => r.user_id).filter(Boolean)
  );

  const visitsTableReady =
    !visitsTodayRes.error && !uniqueTodayPack.error;
  const signupsToday = signupsTodayRes.error ? null : signupsTodayRes.count ?? 0;
  const uniqueVisitorsToday = visitsTableReady ? uniqueTodayPack.count : null;
  const onlineUsers = (onlineRes.data || []).map((row) => ({
    id: row.id,
    email: row.email,
    name: row.nickname || row.display_name || row.email?.split("@")[0] || "—",
    lastSeenAt: row.last_seen_at,
    lastLoginAt: row.last_login_at,
  }));

  const profilesTotal = totalUsersRes.error ? null : totalUsersRes.count ?? 0;
  const authTotal = authUsersPack.error ? null : authUsersPack.total;
  const profilesVsAuthGap =
    profilesTotal != null && authTotal != null ? authTotal - profilesTotal : null;

  return {
    asOf: new Date().toISOString(),
    todayStartKst: todayIso,
    totalUsers: profilesTotal,
    signupsToday,
    onlineNow: onlineRes.error ? null : onlineUsers.length,
    onlineUsers,
    activeUsersToday: activeUserIds.size,
    visitsToday: visitsTableReady ? visitsTodayRes.count ?? 0 : null,
    uniqueVisitorsToday,
    uniqueVisitorsTruncated: uniqueTodayPack.truncated === true,
    visitsTableReady,
    signupConversionTodayPct: signupConversionPct(
      signupsToday,
      uniqueVisitorsToday
    ),
    signupIntentsToday: signupIntentsTodayRes.error
      ? null
      : signupIntentsTodayRes.count ?? 0,
    signupIntentConversionPct: signupConversionPct(
      signupsToday,
      signupIntentsTodayRes.error ? null : signupIntentsTodayRes.count ?? 0
    ),
    authUsersTotal: authTotal,
    profilesVsAuthGap,
    errorsToday: errorsTodayRes.error ? null : errorsTodayRes.count ?? 0,
    onlineWindowMinutes: ONLINE_WINDOW_MIN,
  };
}
