/**
 * CHANNEL STORY ENGINE — 인스타·스마트플레이스 채널별 후처리 SSOT
 * place = 업체 공지 톤, instagram = 캡션·장면 톤
 */
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { getChannelFullText } from "@/lib/content/channelPack";
import { applyHaeyoConsistencyToChannelPack } from "@/lib/content/haeyoConsistencyGate";
import {
  buildStoryTargetChannelBrief,
  buildStoryTargetHashtagHints,
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
import {
  detectPlaceReviewLeak,
  enforceSmartPlaceOwnerNotice,
  stripPlaceReviewSentences,
} from "@/lib/channel/smartPlaceNoticeGuard";
import { scoreSmartPlaceVoice } from "@/lib/channel/smartPlaceVoiceProfile";

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
  let shortNotice = stripPlaceReviewSentences(stripChecklistSentences(pack.shortNotice));
  let detailBody = stripPlaceReviewSentences(stripChecklistSentences(pack.detailBody));

  const practical = [];
  for (const line of splitKoreanSentences(String(pack.detailBody || ""))) {
    if (/예약|영업|주차|운영|전화|위치|입고|휴무|이벤트/.test(line) && line.length < 100) {
      if (!detectPlaceReviewLeak(line)) practical.push(line.trim());
    }
  }
  if (practical.length) {
    const block = practical.slice(0, 3).map((l) => `> ${l}`).join("\n");
    if (!detailBody.includes(">")) {
      detailBody = `${detailBody}\n\n${block}`.trim();
    }
  }

  return enforceSmartPlaceOwnerNotice(
    {
      ...pack,
      shortNotice,
      detailBody,
    },
    input
  );
}

function polishInstagramStoryPack(pack, input = {}) {
  const p = deriveTopicWritingContext(input);
  const resolved = resolveStoryTarget(input);
  const scenes = buildStoryTargetSceneLines(input, 2, "instagram");
  const bodyField = pack.lineBreakBody ? "lineBreakBody" : "body";

  let hook = stripChecklistSentences(pack.hook);
  let body = stripChecklistSentences(pack[bodyField]);
  let ending = stripChecklistSentences(pack.ending);

  if (!hook || hook.replace(/\s/g, "").length < 12) {
    const topicBit = String(input.topic || input.main || "").trim();
    hook =
      resolved?.target?.emotionHook?.slice(0, 48) ||
      `${p.regionBit}${p.brand}${topicBit ? ` · ${topicBit}` : ""}`.slice(0, 48);
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
    ending:
      ending ||
      (input.instaCta || "").trim().slice(0, 72) ||
      `${p.brand ? `${p.brand} · ` : ""}프로필에서 더 봐요`,
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
  if (channel === "place" && /합니다\.|습니다\.|가능합니다/.test(full)) {
    if (!/(?:안내(?:드립|해)|운영|매장|저희)/.test(full)) issues.push("hamni_mix");
  } else if (channel !== "place" && /합니다\.|습니다\.|가능합니다/.test(full)) {
    issues.push("hamni_mix");
  }
  if (/다른\s*브랜드|표로\s*정리|확인하세요/.test(full)) issues.push("checklist_voice");
  if (channel === "place") {
    if (detectPlaceReviewLeak(full)) issues.push("place_review_tone");
    const voice = scoreSmartPlaceVoice(full);
    if (voice.blogLeakHits > 0) issues.push("place_review_leak");
    if (voice.ownerHits < 2) issues.push("missing_owner_voice");
  }
  if (channel === "instagram" && !/(?:해요|었어요|같아요|느껴|무드|분위기|장면)/.test(full)) {
    issues.push("missing_voice");
  }
  return { ok: issues.length === 0, issues, storyTarget: resolved?.target?.label };
}
