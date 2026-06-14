/**
 * 인스타그램 캡션 전문가 패널 — 10인 구조·톤·결과값 SSOT
 */
import { scoreInstagramVoice } from "@/lib/channel/instagramVoiceProfile";
import { cleanOutputText } from "@/utils/sanitizeInput";
import { formatHashtag, regionCompact } from "@/lib/prompts/engine/textUtils";

export const INSTAGRAM_EXPERT_PANEL_VERSION = "v1";

/** @type {Array<{ id: string, name: string, role: string, focus: string }>} */
export const INSTAGRAM_EXPERT_PANEL = [
  {
    id: "hook_strategist",
    name: "훅 전략가",
    role: "IG Growth",
    focus: "첫 줄 8~28자 — 스크롤 멈춤",
  },
  {
    id: "rhythm_editor",
    name: "줄바꿈 리듬 편집자",
    role: "캡션 가독",
    focus: "1~2문장마다 줄바꿈, 3줄+",
  },
  {
    id: "local_tags",
    name: "로컬 해시태그 전문가",
    role: "지역 노출",
    focus: "#브랜드 #지역업종 4~8개",
  },
  {
    id: "visual_story",
    name: "비주얼 스토리텔러",
    role: "장면·무드",
    focus: "공지체·스펙 나열 금지, 장면 한 컷",
  },
  {
    id: "save_hook",
    name: "저장 유도 카피",
    role: "Save CTA",
    focus: "공감·여운 — 「확인해 주세요」 남발 금지",
  },
  {
    id: "emoji_balance",
    name: "이모지 밸런서",
    role: "톤 조절",
    focus: "이모지 2~5개, 줄당 1개 이하",
  },
  {
    id: "notice_blocker",
    name: "공지체 차단",
    role: "채널 분리",
    focus: "안내드립니다·영업시간: 등 플레이스체 금지",
  },
  {
    id: "blog_isolation",
    name: "블로그 분리 검수",
    role: "파생 품질",
    focus: "블로그·SEO·체크리스트 문장 차단",
  },
  {
    id: "brand_voice",
    name: "브랜드 톤 일관",
    role: "브랜드 보이스",
    focus: "브랜드명·지역 자연스럽게 1회+",
  },
  {
    id: "engagement_close",
    name: "참여 마무리",
    role: "댓글·DM 유도",
    focus: "부드러운 한 줄 마무리 (강요 금지)",
  },
];

const NOTICE_LEAK = /안내(?:드립|해)\s*니다|영업\s*시간\s*:|휴무\s*일|운영\s*시간\s*:/gi;
const BLOG_LEAK =
  /블로그|SEO|키워드|체크리스트|알아보시다|정리하자면|소개해드릴|솔직\s*후기|다녀(?:왔|온)\s*후기/gi;

function countNoSpace(text = "") {
  return String(text || "").replace(/\s/g, "").length;
}

function splitCaption(text = "") {
  const raw = String(text || "").trim();
  const tagMatch = raw.match(/((?:#\S+\s*)+)$/);
  const hashtags = tagMatch ? tagMatch[1].trim() : "";
  const body = tagMatch ? raw.slice(0, tagMatch.index).trim() : raw;
  const lines = body
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  return { lines, hashtags };
}

function buildHashtags(ctx = {}) {
  const brand = String(ctx.brandName || ctx.input?.brandName || "").replace(/\s/g, "");
  const rc = regionCompact(ctx.region || ctx.input?.region || "");
  const topic = String(ctx.main || ctx.input?.topic || ctx.input?.mainKeyword || "").split(/\s+/)[0];
  const industry = String(ctx.industry || ctx.input?.industry || "").replace(/\s/g, "");
  const raw = [brand, rc, topic, industry, "동네맛집", "오늘의기록"]
    .map((t) => formatHashtag(String(t || "")))
    .filter(Boolean);
  return [...new Set(raw)].slice(0, 8);
}

function toLineBreakBody(lines = [], hashtags = "") {
  const body = lines.filter(Boolean).join("\n\n").trim();
  if (!hashtags) return body;
  return `${body}\n\n${hashtags}`.trim();
}

function emojiCount(text = "") {
  return (
    String(text || "").match(
      /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/gu
    ) || []
  ).length;
}

/**
 * @param {object} pack
 * @param {object} ctx
 */
export function assessInstagramExpertPanel(pack = {}, ctx = {}) {
  const full =
    pack.lineBreakBody ||
    pack.body ||
    [pack.hook, pack.body, pack.ending].filter(Boolean).join("\n\n");
  const { lines, hashtags } = splitCaption(full);
  const brand = String(ctx.brandName || ctx.input?.brandName || "").trim();
  const voice = scoreInstagramVoice(full);
  const hook = lines[0] || pack.hook || "";
  const shortLines = lines.filter((l) => l.length >= 4 && l.length <= 52);
  const tags = (hashtags.match(/#\S+/g) || []).length;
  const emojis = emojiCount(full);

  const checks = {
    hook_strategist: countNoSpace(hook) >= 8 && countNoSpace(hook) <= 36,
    rhythm_editor: lines.length >= 3 && shortLines.length >= 2,
    local_tags: tags >= 4,
    visual_story: /(?:느껴|장면|오늘|비|주말|창가|향|무드|한\s*잔|한\s*컷)/.test(full) || voice.voiceHits >= 2,
    save_hook: lines.length >= 2 && !/확인하세요\s*$/m.test(full),
    emoji_balance: emojis >= 2 && emojis <= 5,
    notice_blocker: !NOTICE_LEAK.test(full),
    blog_isolation: !BLOG_LEAK.test(full),
    brand_voice: !brand || full.includes(brand),
    engagement_close: lines.length >= 3 && lines[lines.length - 1].length >= 8,
  };

  const experts = INSTAGRAM_EXPERT_PANEL.map((e) => ({
    ...e,
    pass: Boolean(checks[e.id]),
  }));
  const passCount = experts.filter((e) => e.pass).length;
  const score = Math.round((passCount / INSTAGRAM_EXPERT_PANEL.length) * 100);

  return {
    version: INSTAGRAM_EXPERT_PANEL_VERSION,
    score,
    pass: passCount >= 8 && voice.ok,
    passCount,
    voice,
    experts,
  };
}

/**
 * @param {object} pack
 * @param {object} ctx
 */
export function applyInstagramExpertPanel(pack = {}, ctx = {}) {
  if (!pack) return pack;
  const brand = String(ctx.brandName || ctx.input?.brandName || "").trim();
  const region = String(ctx.region || ctx.input?.region || "").trim();
  const topic = String(ctx.main || ctx.input?.topic || ctx.input?.mainKeyword || "").trim();
  const insights = ctx.insights || {};

  const seed =
    pack.lineBreakBody ||
    pack.body ||
    [pack.hook, pack.body, pack.ending].filter(Boolean).join("\n\n");
  let { lines, hashtags } = splitCaption(seed);

  if (lines.length < 3) {
    const pool = [
      insights.sceneLines?.[0],
      insights.emotionalBeats?.[0],
      insights.sectionHooks?.[0],
      insights.practicalTips?.[0],
      brand && topic ? `${brand} — ${topic}` : "",
      region ? `${region}에서 만난 오늘의 한 컷 ✨` : "오늘의 한 컷 ✨",
      "스토리에서 자세히 볼 수 있어요.",
    ]
      .map((l) => cleanOutputText(String(l || "").replace(BLOG_LEAK, "").replace(NOTICE_LEAK, "")))
      .filter((l) => l.length >= 6);

    lines = [...lines, ...pool].filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);
  }

  if (!lines[0] || countNoSpace(lines[0]) < 8) {
    lines[0] =
      cleanOutputText(
        insights.sceneLines?.[0] ||
          insights.emotionalBeats?.[0] ||
          `${brand || region || "오늘"} — ${topic || "이 순간"}`
      ).slice(0, 40) || lines[0];
  }

  if (emojiCount(lines.join("\n")) < 2) {
    lines[0] = `${lines[0] || ""} ✨`.trim();
    if (lines[1]) lines[1] = `${lines[1]}`.replace(/^\s*/, "");
    if (lines.length >= 3 && emojiCount(lines.join("\n")) < 2) {
      lines[lines.length - 1] = `${lines[lines.length - 1]} 🙌`.trim();
    }
  }

  if (!hashtags || (hashtags.match(/#\S+/g) || []).length < 4) {
    hashtags = buildHashtags({ ...ctx, brandName: brand, region, main: topic }).join(" ");
  }

  lines = lines
    .map((l) => cleanOutputText(l.replace(BLOG_LEAK, "").replace(NOTICE_LEAK, "")))
    .filter(Boolean)
    .slice(0, 6);

  const lineBreakBody = toLineBreakBody(lines, hashtags);
  const hook = lines[0] || "";
  const body = lines.slice(1, -1).join("\n\n") || lines[1] || "";
  const ending = lines.length > 1 ? lines[lines.length - 1] : "";

  const next = {
    ...pack,
    hook,
    body,
    ending,
    lineBreakBody,
    legacyBody: lineBreakBody,
    _meta: {
      ...(pack._meta || {}),
      instagramExpertPanel: assessInstagramExpertPanel(
        { lineBreakBody, hook, body, ending },
        ctx
      ),
    },
  };

  return next;
}

export function buildInstagramExpertPromptBlock() {
  return [
    "【인스타그램 · 전문가 10인 패널】",
    ...INSTAGRAM_EXPERT_PANEL.map(
      (e, i) => `${i + 1}. ${e.name}(${e.role}) — ${e.focus}`
    ),
  ].join("\n");
}
