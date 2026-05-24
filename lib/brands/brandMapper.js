/** Supabase row ↔ 클라이언트 brandMemory 형태 */
import { habitsFromMetadata, habitsToMetadata } from "@/lib/brands/brandHabits";

export function rowToBrand(row) {
  const meta = row.metadata || {};
  const habits = habitsFromMetadata(meta);
  return {
    id: row.id,
    brandName: row.brand_name || "",
    brandType: meta.brandType || row.brand_type || "other",
    industry: row.industry || "",
    region: row.region || "",
    tone: row.tone || "emotional",
    kpiGoal: row.kpi_goal || "save",
    brandDescription: row.brand_description || "",
    mainKeyword: row.main_keyword || "",
    subKeyword: row.sub_keyword || "",
    includePhrases: row.include_phrases || "",
    forbiddenWords: row.forbidden_words || "",
    emojiDensity: row.emoji_density || "low",
    emojiLevel: row.emoji_density || "low",
    preferredSentenceStyle:
      habits.preferredSentenceStyle || meta.preferredSentenceStyle || "medium",
    updatedAt: row.updated_at,
    contentArchive: meta.contentArchive || {},
    recentContent: meta.recentContent || {},
    hooks: meta.hooks || [],
    patterns: meta.patterns || [],
    ...habits,
  };
}

export function brandToRow(brand, userId) {
  const {
    contentArchive,
    recentContent,
    hooks,
    patterns,
    ...rest
  } = brand;
  const metadata = {
    contentArchive: contentArchive || {},
    recentContent: recentContent || {},
    hooks: hooks || [],
    patterns: patterns || [],
    brandType: rest.brandType || "other",
    ...habitsToMetadata(rest),
  };
  if (rest.preferredSentenceStyle) {
    metadata.preferredSentenceStyle = rest.preferredSentenceStyle;
  }
  return {
    user_id: userId,
    brand_name: rest.brandName || "",
    industry: rest.industry || "",
    region: rest.region || "",
    tone: rest.tone || "emotional",
    kpi_goal: rest.kpiGoal || "save",
    brand_description: rest.brandDescription || "",
    main_keyword: rest.mainKeyword || "",
    sub_keyword: rest.subKeyword || "",
    include_phrases: rest.includePhrases || "",
    forbidden_words: rest.forbiddenWords || rest.bannedWords || "",
    emoji_density: rest.emojiDensity || rest.emojiLevel || "low",
    metadata,
  };
}

export function patchToRow(patch) {
  const row = {};
  if (patch.brandName !== undefined) row.brand_name = patch.brandName;
  if (patch.industry !== undefined) row.industry = patch.industry;
  if (patch.brandType !== undefined) {
    row.metadata = {
      ...(patch.metadata || {}),
      brandType: patch.brandType,
    };
  }
  if (patch.region !== undefined) row.region = patch.region;
  if (patch.tone !== undefined) row.tone = patch.tone;
  if (patch.kpiGoal !== undefined) row.kpi_goal = patch.kpiGoal;
  if (patch.brandDescription !== undefined)
    row.brand_description = patch.brandDescription;
  if (patch.mainKeyword !== undefined) row.main_keyword = patch.mainKeyword;
  if (patch.subKeyword !== undefined) row.sub_keyword = patch.subKeyword;
  if (patch.includePhrases !== undefined)
    row.include_phrases = patch.includePhrases;
  if (patch.forbiddenWords !== undefined)
    row.forbidden_words = patch.forbiddenWords;
  if (patch.emojiDensity !== undefined)
    row.emoji_density = patch.emojiDensity;
  if (patch.preferredSentenceStyle !== undefined) {
    row.metadata = {
      ...(row.metadata || patch.metadata || {}),
      preferredSentenceStyle: patch.preferredSentenceStyle,
      ...habitsToMetadata(patch),
    };
  }
  if (patch.metadata !== undefined) {
    row.metadata = { ...(row.metadata || {}), ...patch.metadata };
  } else if (habitsToMetadata(patch) && Object.keys(habitsToMetadata(patch)).length) {
    row.metadata = {
      ...(row.metadata || {}),
      ...habitsToMetadata(patch),
    };
  }
  return row;
}
