import { isMissingFeedbackTable } from "@/lib/feedback/db";
import {
  contentItemStyleSummary,
  mergeFingerprints,
} from "@/lib/memory/styleFingerprint";

const TAG_LABELS = {
  too_ad: "광고 톤 줄이기",
  too_ai: "AI 티 줄이기",
  gpt_tone: "GPT 말투 제거",
  repeat: "반복 문장 줄이기",
  low_emotion: "감성 보강",
  low_info: "정보 밀도 높이기",
  brand_weak: "브랜드 톤 강화",
  seo_weak: "SEO·키워드 보강",
  title_weak: "제목 패턴 개선",
  length_wrong: "길이 조절",
};

function countMap(items, keyFn) {
  const m = {};
  for (const x of items) {
    const k = keyFn(x);
    if (!k) continue;
    m[k] = (m[k] || 0) + 1;
  }
  return m;
}

function topKeys(map, n = 5) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

/**
 * 이벤트·피드백·성과·생성 로그를 브랜드 프로필로 집계
 */
export async function recomputeBrandLearningProfile(supabase, userId, brandId) {
  if (!brandId) return null;

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [eventsRes, feedbackRes, itemsRes, perfRes] = await Promise.all([
    supabase
      .from("content_events")
      .select("event_type, channel, meta, created_at")
      .eq("user_id", userId)
      .eq("brand_id", brandId)
      .gte("created_at", since.toISOString())
      .limit(500),
    supabase
      .from("content_feedback")
      .select("reaction, tags, channel, created_at")
      .eq("user_id", userId)
      .eq("brand_id", brandId)
      .gte("created_at", since.toISOString())
      .limit(200),
    supabase
      .from("content_items")
      .select(
        "id, channel, persona, emotion_tone, prompt_input, quality_score, title, full_content, created_at"
      )
      .eq("user_id", userId)
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("content_performance")
      .select(
        "views, saves, inquiries, comments, phone, reservations, reaction, patterns, content_item_id, content_items!inner(brand_id)"
      )
      .eq("user_id", userId)
      .eq("content_items.brand_id", brandId)
      .limit(100),
  ]);

  if (
    eventsRes.error &&
    feedbackRes.error &&
    itemsRes.error &&
    isMissingFeedbackTable(eventsRes.error)
  ) {
    return null;
  }

  const events = eventsRes.data || [];
  const feedback = feedbackRes.data || [];
  const items = itemsRes.data || [];

  const perfRows = perfRes.error ? [] : perfRes.data || [];

  const eventCounts = countMap(events, (e) => e.event_type);
  const channelCopies = countMap(
    events.filter((e) => e.event_type === "copy_channel"),
    (e) => e.channel
  );

  const tagCounts = {};
  const reactionCounts = { good: 0, neutral: 0, bad: 0 };
  for (const f of feedback) {
    reactionCounts[f.reaction] = (reactionCounts[f.reaction] || 0) + 1;
    for (const t of f.tags || []) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
  }

  const personas = countMap(items, (i) => i.persona);
  const emotions = countMap(items, (i) => i.emotion_tone);
  const channels = countMap(items, (i) => i.channel);

  const writingTones = {};
  const failReasons = {};
  let qualitySum = 0;
  let qualityN = 0;
  for (const it of items) {
    const log = it.prompt_input?.generation_log;
    if (log?.writing_tone) {
      writingTones[log.writing_tone] = (writingTones[log.writing_tone] || 0) + 1;
    }
    if (typeof it.quality_score === "number") {
      qualitySum += it.quality_score;
      qualityN += 1;
    }
    for (const r of log?.fail_reasons || []) {
      const key = String(r).slice(0, 80);
      failReasons[key] = (failReasons[key] || 0) + 1;
    }
  }

  const avoidPhrases = topKeys(tagCounts, 6).map((id) => TAG_LABELS[id] || id);
  const bannedPhrasesFromFeedback = topKeys(tagCounts, 8).map(
    (id) => TAG_LABELS[id] || id
  );

  const recentContentSummaries = items
    .filter((it) => it.full_content?.length > 30)
    .slice(0, 6)
    .map((it) =>
      contentItemStyleSummary(it.full_content, {
        title: it.title,
        channel: it.channel,
        persona: it.persona,
        created_at: it.created_at,
      })
    );

  const styleSamples = recentContentSummaries.map((s) => s.fingerprint);
  const styleFingerprint = mergeFingerprints(
    styleSamples.map((fp) => ({ fingerprint: fp }))
  );

  const profile = {
    preferredPersona: topKeys(personas, 2),
    preferredEmotion: topKeys(emotions, 2),
    preferredChannels: topKeys(channels, 3),
    preferredWritingTone: topKeys(writingTones, 2),
    channelCopyRates: channelCopies,
    eventCounts,
    feedbackRatios: reactionCounts,
    topNegativeTags: topKeys(tagCounts, 8),
    avoidPhrases,
    bannedPhrasesFromFeedback,
    styleFingerprint,
    recentContentSummaries,
    avgQualityScore: qualityN ? Math.round(qualitySum / qualityN) : null,
    topFailReasons: topKeys(failReasons, 5),
    rewriteRate:
      events.length > 0
        ? Math.round(
            ((eventCounts.rewrite || 0) / Math.max(items.length, 1)) * 100
          )
        : 0,
    copyRate:
      items.length > 0
        ? Math.round(
            ((eventCounts.copy_all || 0) + (eventCounts.copy_channel || 0)) /
              items.length *
              100
          )
        : 0,
    performanceSamples: perfRows.length,
    recomputedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("brand_learning_profiles")
    .upsert(
      {
        user_id: userId,
        brand_id: brandId,
        profile,
      },
      { onConflict: "brand_id" }
    )
    .select("profile, updated_at")
    .single();

  if (error) {
    if (isMissingFeedbackTable(error)) return null;
    throw error;
  }
  return data;
}

/**
 * @param {string} brandId
 * @param {import('@supabase/supabase-js').SupabaseClient} [supabase]
 * @param {string} [userId]
 */
export async function getBrandLearningBrief(brandId, supabase, userId) {
  if (!brandId || !supabase || !userId) return "";

  let profile = null;
  try {
    const { data } = await supabase
      .from("brand_learning_profiles")
      .select("profile, updated_at")
      .eq("brand_id", brandId)
      .eq("user_id", userId)
      .maybeSingle();

    const stale =
      !data?.updated_at ||
      Date.now() - new Date(data.updated_at).getTime() > 24 * 60 * 60 * 1000;

    if (!data?.profile || stale) {
      const fresh = await recomputeBrandLearningProfile(supabase, userId, brandId);
      profile = fresh?.profile;
    } else {
      profile = data.profile;
    }
  } catch (err) {
    if (!isMissingFeedbackTable(err)) throw err;
    return "";
  }

  if (!profile) return "";
  return formatBrandLearningBrief(profile);
}

export function formatBrandLearningBrief(profile) {
  const parts = [];
  if (profile.preferredPersona?.length) {
    parts.push(`선호 페르소나: ${profile.preferredPersona.join(", ")}`);
  }
  if (profile.preferredEmotion?.length) {
    parts.push(`선호 감정 톤: ${profile.preferredEmotion.join(", ")}`);
  }
  if (profile.preferredWritingTone?.length) {
    parts.push(`선호 문체: ${profile.preferredWritingTone.join(", ")}`);
  }
  if (profile.avoidPhrases?.length) {
    parts.push(`피드백 반영: ${profile.avoidPhrases.join(" · ")}`);
  }
  if (profile.topNegativeTags?.length) {
    parts.push(`자주 지적: ${profile.topNegativeTags.join(", ")}`);
  }
  if (profile.rewriteRate > 30) {
    parts.push("재작성 비율 높음 — 초안 품질 강화");
  }
  if (profile.styleFingerprint?.sentenceLengthBand) {
    parts.push(`문장: ${profile.styleFingerprint.sentenceLengthBand}`);
  }
  if (profile.styleFingerprint?.emojiDensity) {
    parts.push(`이모지: ${profile.styleFingerprint.emojiDensity}`);
  }
  if (profile.recentContentSummaries?.length) {
    parts.push(
      `최근 ${profile.recentContentSummaries.length}편 톤 유지(복사 금지)`
    );
  }
  return parts.join(" · ").slice(0, 1200);
}

/** UI·API용 프로필 스냅샷 */
export function brandLearningProfileForUI(profile) {
  if (!profile) return null;
  return {
    preferredPersona: profile.preferredPersona || [],
    preferredEmotion: profile.preferredEmotion || [],
    preferredWritingTone: profile.preferredWritingTone || [],
    avoidPhrases: profile.avoidPhrases || [],
    topNegativeTags: profile.topNegativeTags || [],
    styleFingerprint: profile.styleFingerprint || null,
    recentContentSummaries: (profile.recentContentSummaries || []).slice(0, 5),
    rewriteRate: profile.rewriteRate ?? 0,
    copyRate: profile.copyRate ?? 0,
    recomputedAt: profile.recomputedAt || null,
  };
}
