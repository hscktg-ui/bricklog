import { createServiceSupabase } from "@/lib/supabase/server";
import { loadRuleSet } from "@/lib/evolution-lab/rulesStore";

const RULE_KEYS = [
  "quality_rules.json",
  "prompt_rules.json",
  "persona_rules.json",
  "emotion_rules.json",
];

function mergeUniqueStrings(base = [], extra = []) {
  return [...new Set([...base, ...extra].filter(Boolean))];
}

function mergeRulePayload(current = {}, patch = {}) {
  const next = { ...current, ...patch };
  if (patch.forbiddenPhrases) {
    next.forbiddenPhrases = mergeUniqueStrings(
      current.forbiddenPhrases,
      patch.forbiddenPhrases
    );
  }
  if (patch.naverBlogHints) {
    next.naverBlogHints = mergeUniqueStrings(
      current.naverBlogHints,
      patch.naverBlogHints
    );
  }
  if (patch.evolutionNotes) {
    next.evolutionNotes = mergeUniqueStrings(
      current.evolutionNotes,
      patch.evolutionNotes
    );
  }
  next.version = Math.max(current.version || 1, patch.version || 1) + 1;
  next.updatedAt = new Date().toISOString();
  return next;
}

export function isMissingGlobalEngineRulesTable(err) {
  const msg = String(err?.message || err?.code || "");
  return (
    err?.code === "PGRST205" ||
    err?.code === "42P01" ||
    /global_engine_rules/i.test(msg)
  );
}

export async function loadGlobalEngineRulesFromDb(db = null) {
  const client = db || createServiceSupabase();
  if (!client) return {};
  const { data, error } = await client
    .from("global_engine_rules")
    .select("rule_key, rules, version, updated_at");
  if (error) {
    if (isMissingGlobalEngineRulesTable(error)) return {};
    throw error;
  }
  const out = {};
  for (const row of data || []) {
    out[row.rule_key] = row.rules || {};
  }
  return out;
}

/**
 * @param {Record<string, object>} partial keyed by rule file name
 */
export async function saveGlobalEngineRulesPatch(partial = {}, db = null) {
  const client = db || createServiceSupabase();
  if (!client) return { ok: false, reason: "no_service_role" };

  const saved = [];
  for (const ruleKey of RULE_KEYS) {
    if (!partial[ruleKey]) continue;
    const patch = partial[ruleKey];
    let current = {};
    try {
      const { data, error } = await client
        .from("global_engine_rules")
        .select("rules, version")
        .eq("rule_key", ruleKey)
        .maybeSingle();
      if (error && !isMissingGlobalEngineRulesTable(error)) throw error;
      current = data?.rules || loadRuleSet(ruleKey);
    } catch (err) {
      if (isMissingGlobalEngineRulesTable(err)) {
        return { ok: false, reason: "tables_missing" };
      }
      throw err;
    }

    const next = mergeRulePayload(current, patch);
    const { error: upsertErr } = await client.from("global_engine_rules").upsert(
      {
        rule_key: ruleKey,
        rules: next,
        version: next.version || 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "rule_key" }
    );
    if (upsertErr) {
      if (isMissingGlobalEngineRulesTable(upsertErr)) {
        return { ok: false, reason: "tables_missing" };
      }
      throw upsertErr;
    }
    saved.push(ruleKey);
  }

  return { ok: true, saved };
}
