import { isMissingFeedbackTable } from "@/lib/feedback/db";
import {
  computeStyleFingerprint,
  mergeFingerprints,
} from "@/lib/memory/styleFingerprint";

function isMissingUserWritingTable(err) {
  const msg = String(err?.message || err?.code || "");
  return (
    err?.code === "PGRST205" ||
    err?.code === "42P01" ||
    /user_writing_profiles/i.test(msg)
  );
}

function countMap(items, keyFn) {
  const m = {};
  for (const x of items) {
    const k = keyFn(x);
    if (!k) continue;
    m[k] = (m[k] || 0) + 1;
  }
  return m;
}

function topKeys(map, n = 3) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

/**
 * 계정 전체 생성·피드백에서 개인 습관 집계
 */
export async function recomputeUserWritingProfile(supabase, userId) {
  if (!userId) return null;

  const since = new Date();
  since.setDate(since.getDate() - 120);

  const [itemsRes, feedbackRes, eventsRes] = await Promise.all([
    supabase
      .from("content_items")
      .select("channel, persona, emotion_tone, full_content, title, created_at")
      .eq("user_id", userId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("content_feedback")
      .select("reaction, tags, channel")
      .eq("user_id", userId)
      .gte("created_at", since.toISOString())
      .limit(150),
    supabase
      .from("content_events")
      .select("event_type, channel")
      .eq("user_id", userId)
      .gte("created_at", since.toISOString())
      .limit(300),
  ]);

  if (
    itemsRes.error &&
    feedbackRes.error &&
    isMissingFeedbackTable(itemsRes.error) &&
    isMissingUserWritingTable(itemsRes.error)
  ) {
    return null;
  }

  const items = itemsRes.data || [];
  const feedback = feedbackRes.data || [];
  const events = eventsRes.data || [];

  const channels = countMap(items, (i) => i.channel);
  const personas = countMap(items, (i) => i.persona);
  const emotions = countMap(items, (i) => i.emotion_tone);

  const tagCounts = {};
  const reactions = { good: 0, neutral: 0, bad: 0 };
  for (const f of feedback) {
    reactions[f.reaction] = (reactions[f.reaction] || 0) + 1;
    for (const t of f.tags || []) tagCounts[t] = (tagCounts[t] || 0) + 1;
  }

  const fingerprints = items
    .filter((i) => i.full_content?.length > 40)
    .slice(0, 40)
    .map((i) =>
      computeStyleFingerprint(i.full_content, {
        channel: i.channel,
        toneTags: [i.persona, i.emotion_tone].filter(Boolean),
      })
    );

  const styleFingerprint = mergeFingerprints(
    fingerprints.map((fp) => ({ fingerprint: fp }))
  );

  const traits = {
    preferredChannels: topKeys(channels, 3),
    preferredPersonas: topKeys(personas, 2),
    preferredEmotions: topKeys(emotions, 2),
    topFeedbackTags: topKeys(tagCounts, 6),
    feedbackRatios: reactions,
    copyEvents: (events.filter((e) => e.event_type === "copy_channel").length),
    generationCount: items.length,
    recomputedAt: new Date().toISOString(),
  };

  const row = {
    user_id: userId,
    traits,
    style_fingerprint: styleFingerprint || {},
  };

  try {
    const { data, error } = await supabase
      .from("user_writing_profiles")
      .upsert(row, { onConflict: "user_id" })
      .select("traits, style_fingerprint, updated_at")
      .single();

    if (error) {
      if (isMissingUserWritingTable(error)) return { traits, style_fingerprint: styleFingerprint };
      throw error;
    }
    return data;
  } catch (err) {
    if (isMissingUserWritingTable(err)) return { traits, style_fingerprint: styleFingerprint };
    throw err;
  }
}

export async function getUserWritingProfile(supabase, userId, { recomputeIfStale = true } = {}) {
  if (!supabase || !userId) return null;

  try {
    const { data, error } = await supabase
      .from("user_writing_profiles")
      .select("traits, style_fingerprint, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && !isMissingUserWritingTable(error)) throw error;

    const stale =
      !data?.updated_at ||
      Date.now() - new Date(data.updated_at).getTime() > 48 * 60 * 60 * 1000;

    if ((!data || stale) && recomputeIfStale) {
      const fresh = await recomputeUserWritingProfile(supabase, userId);
      if (fresh) return fresh;
    }
    return data;
  } catch (err) {
    if (isMissingUserWritingTable(err)) return null;
    throw err;
  }
}

export async function patchUserWritingTraits(supabase, userId, traitsPatch = {}) {
  const existing = (await getUserWritingProfile(supabase, userId, {
    recomputeIfStale: false,
  })) || { traits: {}, style_fingerprint: {} };

  const incoming = traitsPatch.userOverrides || {};
  const filtered = Object.fromEntries(
    Object.entries(incoming).filter(([, v]) => v !== undefined)
  );
  const overrides = {
    ...(existing.traits?.userOverrides || {}),
    ...filtered,
  };
  const traits = {
    ...(existing.traits || {}),
    userOverrides: overrides,
    userPrefsUpdatedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user_writing_profiles")
    .upsert(
      {
        user_id: userId,
        traits,
        style_fingerprint: existing.style_fingerprint || {},
      },
      { onConflict: "user_id" }
    )
    .select("traits, style_fingerprint, updated_at")
    .single();

  if (error) {
    if (isMissingUserWritingTable(error)) return { traits };
    throw error;
  }
  return data;
}

export function formatUserWritingBrief(profile) {
  if (!profile) return "";
  const traits = profile.traits || profile;
  const fp = profile.style_fingerprint || profile.styleFingerprint || {};
  const parts = [];
  const overrides = traits.userOverrides || {};

  if (overrides.defaultSpeechStyle) {
    parts.push(`선호 말투: ${overrides.defaultSpeechStyle}`);
  }
  if (overrides.defaultEmojiDensity) {
    parts.push(`이모지: ${overrides.defaultEmojiDensity}`);
  }
  if (overrides.preferredContentLength) {
    parts.push(`선호 분량: ${overrides.preferredContentLength}`);
  }
  if (overrides.writingNote?.trim()) {
    parts.push(`메모: ${overrides.writingNote.trim().slice(0, 120)}`);
  }
  const disliked = overrides.dislikedPhrases || [];
  if (disliked.length) {
    parts.push(`피하는 표현: ${disliked.slice(0, 6).join(", ")}`);
  }
  const frequent = overrides.frequentPhrases || [];
  if (frequent.length) {
    parts.push(`자주 쓰는 표현: ${frequent.slice(0, 6).join(", ")}`);
  }
  if (traits.preferredChannels?.length) {
    parts.push(`주 사용 채널: ${traits.preferredChannels.join(", ")}`);
  }
  if (traits.preferredPersonas?.length) {
    parts.push(`선호 화자: ${traits.preferredPersonas.join(", ")}`);
  }
  if (fp.sentenceLengthBand) {
    parts.push(`문장 길이: ${fp.sentenceLengthBand}`);
  }
  if (fp.emojiDensity && fp.emojiDensity !== "none") {
    parts.push(`이모지 밀도: ${fp.emojiDensity}`);
  }
  if (traits.topFeedbackTags?.length) {
    parts.push(`계정 공통 피드백: ${traits.topFeedbackTags.slice(0, 4).join(", ")}`);
  }
  return parts.join(" · ").slice(0, 800);
}
