/**
 * CHANNEL STORY ENGINE — 인스타·스마트플레이스 Story Target · 해요체 · 장면 SSOT
 */
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { getChannelFullText } from "@/lib/content/channelPack";
import { applyHaeyoConsistencyToChannelPack } from "@/lib/content/haeyoConsistencyGate";
import {
  buildStoryTargetChannelBrief,
  buildStoryTargetHashtagHints,
  buildStoryTargetProblemOpening,
  buildStoryTargetSceneLines,
  resolveStoryTarget,
} from "@/lib/product/storyTargetEngine";
import {
  applyFurnitureExhibitionPackPolish,
  isFurnitureExhibitionContext,
} from "@/lib/product/furnitureExhibitionEngine";
import { CHECKLIST_TEMPLATE_RES } from "@/lib/product/checklistVoiceEngine";
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";

export const CHANNEL_STORY_ENGINE_VERSION = "v1";

const PLACE_FAQ_HEADING_RES = [
  /방문\s*시\s*확인/,
  /A\/S/,
  /설치와\s*배송/,
  /예약\s*방법/,
  /혜택\s*안내/,
];

const PLACE_BOILERPLATE_RES = [
  /플레이스에서\s*확인/,
  /방문·예약은\s*플레이스/,
  /플레이스\s*공지/,
  /플레이스\s*·\s*전화/,
  /매장\s*소식\s*안내드립니다/,
  /관련\s*매장\s*소식\s*안내/,
];

function stripChecklistSentences(text = "") {
  const kept = [];
  for (const raw of splitKoreanSentences(text)) {
    const s = raw.trim();
    if (!s || s.length < 8) continue;
    if (CHECKLIST_TEMPLATE_RES.some((re) => re.test(s))) continue;
    if (PLACE_FAQ_HEADING_RES.some((re) => re.test(s))) continue;
    if (PLACE_BOILERPLATE_RES.some((re) => re.test(s))) continue;
    if (/다른\s*브랜드/.test(s)) continue;
    kept.push(s);
  }
  return kept.join("\n\n").trim();
}

function polishPlaceStoryPack(pack, input = {}) {
  const p = deriveTopicWritingContext(input);
  const scenes = buildStoryTargetSceneLines(input, 2);
  const opening = buildStoryTargetProblemOpening(input);

  let shortNotice = stripChecklistSentences(pack.shortNotice);
  let detailBody = stripChecklistSentences(pack.detailBody);

  if (!shortNotice || shortNotice.replace(/\s/g, "").length < 20) {
    shortNotice = scenes[0] || `${p.regionBit}${p.brand} — ${opening.slice(0, 80)}`;
  } else if (scenes[0] && !/쇼룸|매장|전시|방문|다녀/.test(shortNotice)) {
    shortNotice = `${scenes[0]}\n\n${shortNotice}`.trim();
  }
  shortNotice = shortNotice.replace(/\n+/g, " ").slice(0, 120);

  if (!detailBody || detailBody.replace(/\s/g, "").length < 60) {
    detailBody = [scenes[1] || scenes[0], opening]
      .filter(Boolean)
      .join("\n\n");
  }

  const practical = [];
  for (const line of splitKoreanSentences(String(pack.detailBody || ""))) {
    if (/예약|영업|주차|운영|전화|위치/.test(line) && line.length < 100) {
      practical.push(line.trim());
    }
  }
  if (practical.length) {
    const block = practical.slice(0, 3).map((l) => `> ${l}`).join("\n");
    if (!detailBody.includes(">")) {
      detailBody = `${detailBody}\n\n${block}`.trim();
    }
  }

  return {
    ...pack,
    title: pack.title || `${p.regionBit}${p.brand} 소식`,
    shortNotice: shortNotice.slice(0, 120),
    detailBody: detailBody.slice(0, 420),
  };
}

function polishInstagramStoryPack(pack, input = {}) {
  const p = deriveTopicWritingContext(input);
  const resolved = resolveStoryTarget(input);
  const scenes = buildStoryTargetSceneLines(input, 2);
  const bodyField = pack.lineBreakBody ? "lineBreakBody" : "body";

  let hook = stripChecklistSentences(pack.hook);
  let body = stripChecklistSentences(pack[bodyField]);
  let ending = stripChecklistSentences(pack.ending);

  if (!hook || hook.replace(/\s/g, "").length < 12) {
    hook =
      resolved?.target?.emotionHook?.slice(0, 48) ||
      `${p.regionBit}${p.brand} 다녀온 솔직 후기`;
  }

  if (!body || body.replace(/\s/g, "").length < 40) {
    body = scenes.join("\n\n") || body;
  } else if (scenes[0] && !/쇼룸|매장|전시|느껴|봤/.test(body.slice(0, 120))) {
    body = `${scenes[0]}\n\n${body}`.trim();
  }

  const tagHints = buildStoryTargetHashtagHints(input);
  let hashtags = Array.isArray(pack.hashtags) ? [...pack.hashtags] : [];
  for (const t of tagHints) {
    if (!hashtags.some((h) => h.replace(/^#/, "") === t.replace(/^#/, ""))) {
      hashtags.push(t);
    }
  }
  hashtags = hashtags.slice(0, 10);

  return {
    ...pack,
    hook: hook.slice(0, 56),
    [bodyField]: body,
    ending: ending || "저장해 두었다가 방문 전에 다시 보면 도움이 돼요.",
    hashtags,
  };
}

/**
 * @param {object} pack
 * @param {"place"|"instagram"} channel
 * @param {object} ctx
 */
export function applyChannelStoryGate(pack, channel, ctx = {}) {
  if (!isBriclogMissionEnforced() || !pack) return pack;
  const input = ctx.input || ctx;

  let next = applyHaeyoConsistencyToChannelPack(pack, channel);

  if (channel === "place") {
    next = polishPlaceStoryPack(next, input);
  } else if (channel === "instagram") {
    next = polishInstagramStoryPack(next, input);
  }

  if (isFurnitureExhibitionContext(input) && channel === "place") {
    const pseudo = {
      sections: [{ heading: "소식", body: `${next.shortNotice}\n\n${next.detailBody}` }],
    };
    const polished = applyFurnitureExhibitionPackPolish(pseudo, input);
    const body = polished.sections?.[0]?.body || "";
    const parts = body.split(/\n\n+/);
    next = {
      ...next,
      shortNotice: (parts[0] || next.shortNotice).slice(0, 120),
      detailBody: parts.slice(1).join("\n\n").slice(0, 420) || body.slice(0, 420),
    };
  }

  next = applyHaeyoConsistencyToChannelPack(next, channel);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      channelStoryEngine: CHANNEL_STORY_ENGINE_VERSION,
      channelStoryGate: true,
      storyTargetLabel: resolveStoryTarget(input)?.target?.label || null,
    },
  };
}

export function buildChannelStoryPromptBlock(channel, input = {}) {
  if (!isBriclogMissionEnforced()) return "";
  const brief = buildStoryTargetChannelBrief(input, channel);
  if (!brief) return "";
  return brief;
}

export function scoreChannelStoryPack(pack, channel, input = {}) {
  const full = getChannelFullText(pack, channel);
  const resolved = resolveStoryTarget(input);
  const issues = [];
  if (!resolved) issues.push("no_story_target");
  if (/합니다\.|습니다\.|가능합니다/.test(full)) issues.push("hamni_mix");
  if (/다른\s*브랜드|표로\s*정리|확인하세요/.test(full)) issues.push("checklist_voice");
  if (channel === "place" && !/쇼룸|매장|전시|방문|다녀|봤/.test(full)) {
    issues.push("missing_field_scene");
  }
  if (channel === "instagram" && !/(?:해요|었어요|봤|느껴|솔직)/.test(full)) {
    issues.push("missing_voice");
  }
  return { ok: issues.length === 0, issues, storyTarget: resolved?.target?.label };
}
