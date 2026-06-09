/**
 * Golden Dataset Store — 서버 전용 (fs + DB CRUD)
 */
import fs from "fs";
import path from "path";
import { GOLDEN_SEED_SAMPLES } from "@/lib/golden/goldenSeedSamples";
import { listSeedGoldenSamples } from "@/lib/golden/goldenDatasetStore";

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
    if (s.sample_kind === "failure") continue;
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

function normalizeSampleRow(body = {}) {
  const sampleKind = body.sample_kind ? String(body.sample_kind).trim() : "excellent";
  return {
    title: String(body.title || "").trim(),
    content: String(body.content || "").trim(),
    industry: String(body.industry || "etc").trim(),
    writing_style: body.writing_style ? String(body.writing_style).trim() : null,
    emotion_type: body.emotion_type ? String(body.emotion_type).trim() : null,
    search_intent: body.search_intent ? String(body.search_intent).trim() : null,
    brand_presence_score: Number(body.brand_presence_score || 0),
    sample_kind: sampleKind,
    fail_reason:
      sampleKind === "failure"
        ? String(body.fail_reason || body.search_intent || "custom_failure").trim()
        : null,
    is_active: body.is_active !== false,
  };
}

function normalizeSamplePatch(body = {}) {
  const patch = {};
  if (body.title !== undefined) patch.title = String(body.title || "").trim();
  if (body.content !== undefined) patch.content = String(body.content || "").trim();
  if (body.industry !== undefined) patch.industry = String(body.industry || "etc").trim();
  if (body.writing_style !== undefined) {
    patch.writing_style = body.writing_style ? String(body.writing_style).trim() : null;
  }
  if (body.emotion_type !== undefined) {
    patch.emotion_type = body.emotion_type ? String(body.emotion_type).trim() : null;
  }
  if (body.search_intent !== undefined) {
    patch.search_intent = body.search_intent ? String(body.search_intent).trim() : null;
  }
  if (body.brand_presence_score !== undefined) {
    patch.brand_presence_score = Number(body.brand_presence_score || 0);
  }
  if (body.sample_kind !== undefined) {
    patch.sample_kind = String(body.sample_kind || "excellent").trim();
  }
  if (body.is_active !== undefined) patch.is_active = body.is_active !== false;
  return patch;
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
  if (String(id || "").startsWith("seed-")) {
    return { ok: false, error: "seed_readonly" };
  }
  const patch = normalizeSamplePatch(body);
  if (!Object.keys(patch).length) {
    return { ok: false, error: "empty_patch" };
  }
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
  if (String(id || "").startsWith("seed-")) {
    return { ok: false, error: "seed_readonly" };
  }
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
export async function listGoldenSamplesAdmin(db, { industry, sample_kind } = {}) {
  try {
    const all = await loadAllGoldenSamples(db);
    let filtered = all;
    if (industry) filtered = filtered.filter((s) => s.industry === industry);
    if (sample_kind) {
      filtered = filtered.filter((s) => (s.sample_kind || "excellent") === sample_kind);
    }
    return {
      ok: true,
      samples: filtered,
      total: filtered.length,
      industries: [...new Set(all.map((s) => s.industry))],
    };
  } catch {
    return listSeedGoldenSamples({ industry });
  }
}
