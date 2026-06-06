import { startOfTodayKstIso, minutesAgoIso } from "@/lib/admin/kstTime";

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
    uniqueVisitorsRes,
    errorsTodayRes,
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
    db
      .from("site_visits")
      .select("session_id")
      .gte("created_at", todayIso)
      .limit(5000),
    db
      .from("error_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayIso),
  ]);

  const activeUserIds = new Set(
    (activeTodayEventsRes.data || []).map((r) => r.user_id).filter(Boolean)
  );
  const uniqueSessions = new Set(
    (uniqueVisitorsRes.data || []).map((r) => r.session_id).filter(Boolean)
  );

  const visitsTableReady = !visitsTodayRes.error && !uniqueVisitorsRes.error;
  const onlineUsers = (onlineRes.data || []).map((row) => ({
    id: row.id,
    email: row.email,
    name: row.nickname || row.display_name || row.email?.split("@")[0] || "—",
    lastSeenAt: row.last_seen_at,
    lastLoginAt: row.last_login_at,
  }));

  return {
    asOf: new Date().toISOString(),
    todayStartKst: todayIso,
    totalUsers: totalUsersRes.error ? null : totalUsersRes.count ?? 0,
    signupsToday: signupsTodayRes.error ? null : signupsTodayRes.count ?? 0,
    onlineNow: onlineRes.error ? null : onlineUsers.length,
    onlineUsers,
    activeUsersToday: activeUserIds.size,
    visitsToday: visitsTableReady ? visitsTodayRes.count ?? 0 : null,
    uniqueVisitorsToday: visitsTableReady ? uniqueSessions.size : null,
    visitsTableReady,
    errorsToday: errorsTodayRes.error ? null : errorsTodayRes.count ?? 0,
    onlineWindowMinutes: ONLINE_WINDOW_MIN,
  };
}
