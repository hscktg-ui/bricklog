/**
 * Golden Dataset Store — 파일 시드 + DB CRUD
 */
import fs from "fs";
import path from "path";
import { GOLDEN_SEED_SAMPLES } from "@/lib/golden/goldenSeedSamples";
import { resolveGoldenIndustryKey } from "@/lib/golden/goldenIndustryKeys";

const CONFIG_DIR = path.join(process.cwd(), "config", "golden-dataset");
const FILE_PATH = path.join(CONFIG_DIR, "samples.json");

let memoryCache = null;
let memoryCacheAt = 0;
const CACHE_TTL_MS = 30_000;

function isMissingGoldenTable(err) {
  const msg = String(err?.message || err?.code || "");
  return err?.code === "PGRST205" || err?.code === "42P01" || /golden_content_samples/i.test(msg);
}

function readFileSamples() {
  try {
    if (fs.existsSync(FILE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
      return Array.isArray(raw?.samples) ? raw.samples : Array.isArray(raw) ? raw : [];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function writeFileSamples(samples) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(
    FILE_PATH,
    JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), samples }, null, 2),
    "utf8"
  );
  memoryCache = samples;
  memoryCacheAt = Date.now();
}

function mergeSamples(dbSamples = [], fileSamples = []) {
  const map = new Map();
  for (const s of [...GOLDEN_SEED_SAMPLES, ...fileSamples, ...dbSamples]) {
    if (!s?.content || !s?.industry) continue;
    map.set(s.id || `${s.industry}:${s.title}`, { ...s, is_active: s.is_active !== false });
  }
  return [...map.values()].filter((s) => s.is_active !== false);
}

async function loadFromDb(db) {
  if (!db) return [];
  const { data, error } = await db
    .from("golden_content_samples")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    if (isMissingGoldenTable(error)) return [];
    throw error;
  }
  return data || [];
}

/** @param {import('@supabase/supabase-js').SupabaseClient} [db] */
export async function loadAllGoldenSamples(db = null) {
  if (memoryCache && Date.now() - memoryCacheAt < CACHE_TTL_MS) {
    return memoryCache;
  }
  const fileSamples = readFileSamples();
  let dbSamples = [];
  try {
    dbSamples = await loadFromDb(db);
  } catch {
    dbSamples = [];
  }
  memoryCache = mergeSamples(dbSamples, fileSamples);
  memoryCacheAt = Date.now();
  return memoryCache;
}

export function invalidateGoldenSampleCache() {
  memoryCache = null;
  memoryCacheAt = 0;
}

/**
 * @param {object} input
 * @param {number} [limit]
 * @param {import('@supabase/supabase-js').SupabaseClient} [db]
 */
export async function fetchGoldenSamplesForInput(input = {}, limit = 5, db = null) {
  const key = resolveGoldenIndustryKey(input);
  const all = await loadAllGoldenSamples(db);
  const ranked = all
    .filter((s) => s.industry === key || (key === "etc" && s.industry === "etc"))
    .sort((a, b) => Number(b.brand_presence_score || 0) - Number(a.brand_presence_score || 0));
  if (ranked.length >= limit) return ranked.slice(0, limit);
  const fallback = all.filter((s) => s.industry === key);
  return fallback.slice(0, limit);
}

/** sync wrapper for delivery pipeline (uses cache/seeds) */
export function getGoldenSamplesForInput(input = {}, limit = 5) {
  const key = resolveGoldenIndustryKey(input);
  const fileSamples = readFileSamples();
  const all = mergeSamples([], fileSamples);
  return all
    .filter((s) => s.industry === key)
    .sort((a, b) => Number(b.brand_presence_score || 0) - Number(a.brand_presence_score || 0))
    .slice(0, limit);
}

function normalizeSampleRow(body = {}) {
  return {
    title: String(body.title || "").trim(),
    content: String(body.content || "").trim(),
    industry: String(body.industry || "etc").trim(),
    writing_style: body.writing_style ? String(body.writing_style).trim() : null,
    emotion_type: body.emotion_type ? String(body.emotion_type).trim() : null,
    search_intent: body.search_intent ? String(body.search_intent).trim() : null,
    brand_presence_score: Number(body.brand_presence_score || 0),
    is_active: body.is_active !== false,
  };
}

/** @param {import('@supabase/supabase-js').SupabaseClient} db */
export async function createGoldenSample(db, body = {}) {
  const row = normalizeSampleRow(body);
  if (!row.title || !row.content) {
    return { ok: false, error: "title_and_content_required" };
  }

  if (db) {
    try {
      const { data, error } = await db.from("golden_content_samples").insert(row).select("*").single();
      if (!error) {
        invalidateGoldenSampleCache();
        return { ok: true, sample: data, source: "db" };
      }
      if (!isMissingGoldenTable(error)) throw error;
    } catch (err) {
      if (!isMissingGoldenTable(err)) throw err;
    }
  }

  const fileSamples = readFileSamples();
  const sample = {
    ...row,
    id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
  };
  writeFileSamples([sample, ...fileSamples]);
  return { ok: true, sample, source: "file" };
}

/** @param {import('@supabase/supabase-js').SupabaseClient} db */
export async function updateGoldenSample(db, id, body = {}) {
  const patch = normalizeSampleRow({ ...body, title: body.title, content: body.content, industry: body.industry });
  if (db) {
    try {
      const { data, error } = await db
        .from("golden_content_samples")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (!error && data) {
        invalidateGoldenSampleCache();
        return { ok: true, sample: data, source: "db" };
      }
      if (error && !isMissingGoldenTable(error)) throw error;
    } catch (err) {
      if (!isMissingGoldenTable(err)) throw err;
    }
  }

  const fileSamples = readFileSamples();
  const idx = fileSamples.findIndex((s) => s.id === id);
  if (idx < 0) return { ok: false, error: "not_found" };
  fileSamples[idx] = { ...fileSamples[idx], ...patch, updated_at: new Date().toISOString() };
  writeFileSamples(fileSamples);
  return { ok: true, sample: fileSamples[idx], source: "file" };
}

/** @param {import('@supabase/supabase-js').SupabaseClient} db */
export async function deleteGoldenSample(db, id) {
  if (db) {
    try {
      const { error } = await db
        .from("golden_content_samples")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (!error) {
        invalidateGoldenSampleCache();
        return { ok: true, source: "db" };
      }
      if (!isMissingGoldenTable(error)) throw error;
    } catch (err) {
      if (!isMissingGoldenTable(err)) throw err;
    }
  }

  const fileSamples = readFileSamples().filter((s) => s.id !== id);
  writeFileSamples(fileSamples);
  return { ok: true, source: "file" };
}

/** @param {import('@supabase/supabase-js').SupabaseClient} db */
export async function listGoldenSamplesAdmin(db, { industry } = {}) {
  const all = await loadAllGoldenSamples(db);
  const filtered = industry ? all.filter((s) => s.industry === industry) : all;
  return {
    ok: true,
    samples: filtered,
    total: filtered.length,
    industries: [...new Set(all.map((s) => s.industry))],
  };
}
