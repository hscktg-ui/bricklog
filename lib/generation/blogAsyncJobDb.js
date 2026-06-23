/**
 * blog_generation_jobs — Supabase 영속 (serverless poll SSOT)
 */
import { BRICLOG_TIMING_DEFAULTS } from "@/lib/config/briclogDefaults";

export function isMissingBlogJobTable(err) {
  const msg = String(err?.message || err?.code || "");
  return (
    err?.code === "PGRST205" ||
    err?.code === "42P01" ||
    /blog_generation_jobs/i.test(msg)
  );
}

function rowToJob(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    rawInput: row.raw_input || {},
    planId: row.plan_id || "free",
    status: row.status || "pending",
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    result: row.result || null,
    error: row.error_message || null,
    running: Boolean(row.running),
    persisted: true,
  };
}

export async function insertBlogJob(supabase, { userId, rawInput, planId }) {
  const { data, error } = await supabase
    .from("blog_generation_jobs")
    .insert({
      user_id: userId,
      plan_id: planId || "free",
      raw_input: rawInput || {},
      status: "pending",
      running: false,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToJob(data);
}

export async function fetchBlogJob(supabase, jobId, userId) {
  const { data, error } = await supabase
    .from("blog_generation_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return rowToJob(data);
}

export async function claimBlogJobRun(supabase, jobId, userId) {
  const { data, error } = await supabase
    .from("blog_generation_jobs")
    .update({
      status: "running",
      running: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .eq("running", false)
    .select()
    .maybeSingle();
  if (error) throw error;
  return rowToJob(data);
}

export async function completeBlogJobRow(supabase, jobId, userId, resultBody) {
  const failed =
    resultBody?.ok === false && !resultBody?.blogContent?.sections?.length;
  const { data, error } = await supabase
    .from("blog_generation_jobs")
    .update({
      status: failed ? "failed" : "done",
      result: resultBody,
      error_message: failed ? resultBody?.userMessage || null : null,
      running: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return rowToJob(data);
}

export async function failBlogJobRow(supabase, jobId, userId, message) {
  const { data, error } = await supabase
    .from("blog_generation_jobs")
    .update({
      status: "failed",
      error_message: message || "server_error",
      running: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return rowToJob(data);
}

export async function pruneExpiredBlogJobs(supabase, userId) {
  const cutoff = new Date(
    Date.now() - BRICLOG_TIMING_DEFAULTS.asyncJobTtlMs
  ).toISOString();
  await supabase
    .from("blog_generation_jobs")
    .delete()
    .eq("user_id", userId)
    .lt("updated_at", cutoff);
}
