import { parseStoredContent, serializeContent } from "./contentFormat";
import { flattenHashtagPack } from "@/lib/prompts/engine/hashtagEngine";
import { toGenerationRecord } from "@/lib/contentPipeline";
import { supabase } from "./supabaseClient";

/**
 * @param {string} userId
 * @param {Object} data
 */
/**
 * Content Pipeline 스냅샷 → Supabase insert payload
 */
export function pipelineToSupabaseRow(pipelineState) {
  const record = toGenerationRecord(pipelineState);
  return {
    business_type: record.industry,
    region: record.region,
    main_keyword: record.keywords?.main || "",
    sub_keywords: record.keywords?.sub || "",
    purpose: record.meta?.purpose || "",
    tone: record.meta?.tone || "",
    blog: serializeContent(record.blog),
    place: serializeContent(record.place),
    instagram: serializeContent(record.instagram),
    hashtags: null,
    image_prompt: serializeContent(record.imagePrompts),
  };
}

/** 전체 파이프라인 결과 저장 */
export async function savePipelineGeneration(userId, pipelineState) {
  return saveGeneration(userId, pipelineToSupabaseRow(pipelineState));
}

/** 단일 채널 생성 기록 — History 탭용 */
export async function saveChannelGeneration(userId, { channel, formValues, content, brandId }) {
  const serialized = serializeContent(content);
  const row = {
    business_type: formValues?.industry || formValues?.businessType || "",
    region: formValues?.region || "",
    main_keyword: formValues?.mainKeyword || formValues?.topic || "",
    sub_keywords: formValues?.subKeyword || "",
    purpose: formValues?.purpose || formValues?.purposeType || "",
    tone: formValues?.tone || formValues?.speechStyle || "",
    blog: channel === "blog" ? serialized : "",
    place: channel === "place" ? serialized : "",
    instagram: channel === "instagram" ? serialized : "",
    hashtags: null,
    image_prompt: "",
    brand_id: brandId || null,
  };
  return saveGeneration(userId, row);
}

export async function saveGeneration(userId, data) {
  const { data: row, error } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      business_type: data.business_type,
      region: data.region,
      main_keyword: data.main_keyword,
      sub_keywords: data.sub_keywords,
      purpose: data.purpose,
      tone: data.tone,
      blog: data.blog,
      place: data.place,
      instagram: data.instagram,
      hashtags: data.hashtags,
      image_prompt: data.image_prompt,
      brand_id: data.brand_id || null,
      full_copy_text: data.full_copy_text || "",
    })
    .select()
    .single();

  if (error) throw error;
  return row;
}

function isMissingGenerationsTable(err) {
  const msg = String(err?.message || err?.code || "");
  return (
    err?.code === "PGRST205" ||
    err?.code === "42P01" ||
    /generations/i.test(msg)
  );
}

export async function fetchGenerations(userId, { sinceIso } = {}) {
  let q = supabase
    .from("generations")
    .select(
      "id, business_type, region, main_keyword, purpose, tone, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (sinceIso) {
    q = q.gte("created_at", sinceIso);
  }

  const { data, error } = await q;
  if (error) {
    if (isMissingGenerationsTable(error)) return [];
    throw error;
  }
  return data ?? [];
}

export async function fetchGenerationById(userId, id) {
  const { data, error } = await supabase
    .from("generations")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data;
}

export function mapRecordToResults(record) {
  const blog = parseStoredContent(record.blog, null);
  const smartplace = parseStoredContent(record.place, null);
  const insta = parseStoredContent(record.instagram, null);
  const hashtag = parseStoredContent(record.hashtags, null);
  const imagePrompt = parseStoredContent(record.image_prompt, null);

  return {
    blog: normalizeBlog(blog),
    smartplace: normalizePlace(smartplace),
    insta: normalizeInsta(insta),
    hashtag: normalizeHashtag(hashtag),
    imagePrompt: normalizeImage(imagePrompt),
  };
}

function normalizeBlog(blog) {
  if (!blog) return null;
  if (typeof blog === "string") {
    return {
      titles: [],
      title: "저장된 블로그",
      sections: [{ heading: "본문", body: blog }],
      conclusion: "",
      hashtags: [],
    };
  }
  return blog;
}

function normalizePlace(place) {
  if (!place) return null;
  if (typeof place === "string") {
    return {
      title: "소식",
      shortBody: place.slice(0, 80),
      detailBody: place,
      body: place,
      cta: "",
      hashtags: [],
    };
  }
  if (!place.body && place.detailBody) {
    place.body = `${place.shortBody || ""}\n\n${place.detailBody}`.trim();
  }
  return place;
}

function normalizeInsta(insta) {
  if (!insta) return null;
  if (typeof insta === "string") {
    return {
      hook: "",
      body: insta,
      lineBreakBody: insta,
      ending: "",
      hashtags: [],
    };
  }
  if (!insta.lineBreakBody) {
    insta.lineBreakBody = insta.body || "";
  }
  return insta;
}

function normalizeHashtag(tag) {
  if (!tag) {
    return {
      localTags: [],
      brandTags: [],
      seoTags: [],
      trendTags: [],
      seasonalTags: [],
      all: [],
    };
  }
  if (Array.isArray(tag)) {
    return {
      localTags: tag,
      brandTags: [],
      seoTags: [],
      trendTags: [],
      seasonalTags: [],
      all: tag,
    };
  }
  if (typeof tag === "string") {
    const arr = tag.split(/\s+/).filter(Boolean);
    return normalizeHashtag(arr);
  }
  if (!tag.all) tag.all = flattenHashtagPack(tag);
  return tag;
}

function normalizeImage(img) {
  if (!img) return null;
  if (typeof img === "string") {
    return {
      thumbnailPrompt: img,
      placeImagePrompt: "",
      instagramCardPrompt: "",
      bannerPrompt: "",
      thumbnail: img,
      placeImage: "",
      instagramCard: "",
    };
  }
  if (!img.thumbnailPrompt && img.thumbnail) {
    img.thumbnailPrompt = img.thumbnail;
    img.placeImagePrompt = img.placeImage || "";
    img.instagramCardPrompt = img.instagramCard || "";
    img.bannerPrompt = img.bannerPrompt || "";
  }
  if (!img.thumbnail && img.thumbnailPrompt) {
    img.thumbnail = img.thumbnailPrompt;
    img.placeImage = img.placeImagePrompt;
    img.instagramCard = img.instagramCardPrompt;
  }
  return img;
}
