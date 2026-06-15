/**
 * 회원 first-touch 유입 — site_visits · profiles SSOT
 */
import { createServerSupabase, getBearerToken } from "@/lib/supabase/server";
import {
  classifyVisitSource,
  pickUtmFromQuery,
  VISIT_SOURCE_LABELS,
} from "@/lib/analytics/visitSource";

export const FIRST_TOUCH_STORAGE_KEY = "briclog_first_touch";
export const ACQUISITION_SENT_KEY = "briclog_acquisition_sent";

/**
 * @param {import("next/server").NextRequest} request
 * @returns {Promise<{ userId: string, supabase: import("@supabase/supabase-js").SupabaseClient } | null>}
 */
export async function resolveOptionalUserFromRequest(request) {
  const token = getBearerToken(request);
  if (!token) return null;
  const supabase = createServerSupabase(token);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return { userId: data.user.id, supabase };
}

/**
 * @param {object} input
 */
export function normalizeAcquisitionPayload(input = {}) {
  const referrer = String(input.referrer || "").trim().slice(0, 500);
  const utm = pickUtmFromQuery(input);
  const path = String(input.path || "/").slice(0, 300);
  const sourceChannel =
    input.sourceChannel && VISIT_SOURCE_LABELS[input.sourceChannel]
      ? input.sourceChannel
      : classifyVisitSource({
          referrer,
          utmSource: utm.utmSource,
          utmMedium: utm.utmMedium,
        });

  return {
    acquisition_source_channel: sourceChannel,
    acquisition_path: path,
    acquisition_referrer: referrer || null,
    acquisition_utm_source: utm.utmSource || null,
    acquisition_utm_medium: utm.utmMedium || null,
    acquisition_utm_campaign: utm.utmCampaign || null,
    acquisition_recorded_at: new Date().toISOString(),
  };
}

/**
 * @param {object} profile
 */
export function formatUserAcquisitionBrief(profile = {}) {
  if (!profile.acquisition_source_channel && !profile.acquisition_path) {
    return null;
  }
  const channel =
    VISIT_SOURCE_LABELS[profile.acquisition_source_channel] ||
    profile.acquisition_source_channel ||
    "기타";
  const path = profile.acquisition_path || "/";
  const utmParts = [
    profile.acquisition_utm_source,
    profile.acquisition_utm_medium,
    profile.acquisition_utm_campaign,
  ].filter(Boolean);
  const utm = utmParts.length ? utmParts.join(" / ") : null;
  const ref = (profile.acquisition_referrer || "").trim();
  const refShort =
    ref.length > 48 ? `${ref.slice(0, 45)}…` : ref || null;

  return {
    channel,
    channelId: profile.acquisition_source_channel,
    path,
    referrer: refShort,
    utm,
    recordedAt: profile.acquisition_recorded_at || null,
    label: utm
      ? `${channel} · ${path} · ${utm}`
      : refShort
        ? `${channel} · ${path} · ${refShort}`
        : `${channel} · ${path}`,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} db
 * @param {string} userId
 * @param {object} payload — normalizeAcquisitionPayload result
 * @param {string} [sessionId]
 */
export async function stampUserAcquisitionIfEmpty(db, userId, payload, sessionId = "") {
  if (!db || !userId || !payload?.acquisition_path) {
    return { ok: false, reason: "invalid_input" };
  }

  const { data: existing, error: readErr } = await db
    .from("profiles")
    .select(
      "id, acquisition_source_channel, acquisition_path, acquisition_recorded_at"
    )
    .eq("id", userId)
    .maybeSingle();

  if (readErr) {
    if (/acquisition_|column/i.test(readErr.message)) {
      return { ok: false, reason: "schema_missing" };
    }
    return { ok: false, reason: readErr.message };
  }

  const already =
    existing?.acquisition_path || existing?.acquisition_source_channel;
  if (already) {
    if (sessionId) {
      await linkSessionVisitsToUser(db, sessionId, userId);
    }
    return { ok: true, skipped: true, reason: "already_set" };
  }

  const { error: updateErr } = await db
    .from("profiles")
    .update(payload)
    .eq("id", userId);

  if (updateErr) {
    if (/acquisition_|column/i.test(updateErr.message)) {
      return { ok: false, reason: "schema_missing" };
    }
    return { ok: false, reason: updateErr.message };
  }

  if (sessionId) {
    await linkSessionVisitsToUser(db, sessionId, userId);
  }

  return { ok: true, stamped: true };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} db
 * @param {string} sessionId
 * @param {string} userId
 */
export async function linkSessionVisitsToUser(db, sessionId, userId) {
  if (!sessionId || !userId) return;
  const sid = String(sessionId).slice(0, 64);
  await db
    .from("site_visits")
    .update({ user_id: userId })
    .eq("session_id", sid)
    .is("user_id", null);
}

/**
 * 세션의 가장 이른 방문으로 first-touch 보강 (클라이언트 payload 없을 때)
 */
export async function stampAcquisitionFromEarliestSessionVisit(
  db,
  userId,
  sessionId
) {
  if (!sessionId) return { ok: false, reason: "no_session" };
  const sid = String(sessionId).slice(0, 64);
  const { data: rows, error } = await db
    .from("site_visits")
    .select(
      "path, referrer, utm_source, utm_medium, utm_campaign, source_channel, created_at"
    )
    .eq("session_id", sid)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error || !rows?.length) {
    return { ok: false, reason: error?.message || "no_visits" };
  }

  const row = rows[0];
  const payload = normalizeAcquisitionPayload({
    path: row.path,
    referrer: row.referrer,
    utm_source: row.utm_source,
    utm_medium: row.utm_medium,
    utm_campaign: row.utm_campaign,
    sourceChannel: row.source_channel,
  });

  return stampUserAcquisitionIfEmpty(db, userId, payload, sid);
}
