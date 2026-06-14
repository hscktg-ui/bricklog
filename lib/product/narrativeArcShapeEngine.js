/**
 * 칼럼 서사 정렬 — 섹션 역할(기승전결) 재배치, 중복·미션 패드 제거, 주제 스레딩
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import {
  deriveTopicWritingContext,
  topicRaw,
  topicWritingFacet,
} from "@/lib/content/topicFacetEngine";
import { isFieldReviewSpeaker } from "@/lib/persona/speakerVoiceLock";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { dedupeMissionProsePack } from "@/lib/llm/missionProseFallback";
import { shouldForceMissionProseOnlyPath } from "@/lib/product/missionProseRouteFlags";
import {
  buildTopicArcSectionHeadings,
  mapSectionArcRoles,
} from "@/lib/content/humanColumnPolishEngine";
import {
  loadColumnMagazineProfile,
  scoreMagazineColumnArc,
} from "@/lib/content/columnMagazineArchetype";
import { normalizeRegexList } from "@/lib/utils/safeRegex";

const ROLE_ORDER = { gi: 0, seung: 1, jeon: 2, gyeol: 3 };

const MISSION_PAD_RES = [
  /매장에서\s+.{3,48}\s+관련\s+안내를\s+직접\s+들었어요/,
  /에\s+직접\s+가서\s+.{3,48}\s+관련\s+안내를\s+들었어요/,
  /플라워샵에\s+들어가니\s+.{3,48}\s+안내를\s+먼저\s+들었어요/,
  /처음엔\s+.{3,40}만\s+보다가/,
  /상담·안내를\s+들으며\s+.{3,40}에\s+맞는지/,
  /가\s*볼\s*일이\s*생겼어요/,
  /검색만\s+하다\s+보면\s+.{3,40}기준이\s+많아/,
  /에서\s+안내하는\s+.{3,40}\s+관련\s+조건을\s+정리/,
];

const DUPLICATE_ANCHOR_RES = [
  /^요즘\s+.+알아보던\s+중/,
  /^그래서\s+.+직접\s+다녀와서/,
  /^비교해\s+보니\s+.+기준이/,
  /^검색만\s+하다\s+보면/,
  /^정리하면\s+.+집에서\s+메모/,
];

function paragraphKey(text) {
  return String(text || "")
    .replace(/\s/g, "")
    .slice(0, 56);
}

function isMissionPadParagraph(para = "") {
  const t = String(para || "").trim();
  if (!t) return false;
  return MISSION_PAD_RES.some((re) => re.test(t));
}

function markerScore(text, markers) {
  let score = 0;
  const head = String(text || "").slice(0, 360);
  for (const re of normalizeRegexList(markers)) {
    if (re.test(head)) score += 3;
    else if (re.test(text)) score += 1;
  }
  return score;
}

export function detectSectionArcRole(section = {}, profile = loadColumnMagazineProfile()) {
  const text = `${section.heading || ""}\n${section.body || ""}`;
  const markers = profile.arcMarkers || {};
  const scores = {
    gi: markerScore(text, markers.gi),
    seung: markerScore(text, markers.seung),
    jeon: markerScore(text, markers.jeon),
    gyeol: markerScore(text, markers.gyeol),
  };
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [role, pts] = ranked[0];
  return pts >= 1 ? role : "seung";
}

export function reorderSectionsByArc(sections = [], profile = loadColumnMagazineProfile()) {
  if (!sections?.length || sections.length < 3) return sections || [];
  const tagged = sections.map((sec, i) => ({
    sec,
    orig: i,
    role: detectSectionArcRole(sec, profile),
  }));
  tagged.sort((a, b) => {
    const ra = ROLE_ORDER[a.role] ?? 1;
    const rb = ROLE_ORDER[b.role] ?? 1;
    if (ra !== rb) return ra - rb;
    return a.orig - b.orig;
  });
  return tagged.map((t) => t.sec);
}

function pruneJumbledMissionPads(body = "") {
  const paras = String(body || "")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.replace(/\s/g, "").length >= 10);
  const substantive = paras.filter((p) => !isMissionPadParagraph(p));
  if (substantive.length >= 1) return substantive.join("\n\n").trim();
  return paras.slice(0, 2).join("\n\n").trim();
}

function stripDuplicateAnchorParagraphs(pack) {
  const seen = new Set();
  const sections = (pack.sections || []).map((sec) => {
    const paras = String(sec.body || "")
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    const kept = [];
    for (const para of paras) {
      const firstLine = para.split("\n")[0] || para;
      const isAnchor = DUPLICATE_ANCHOR_RES.some((re) => re.test(firstLine));
      if (isAnchor) {
        const key = paragraphKey(para);
        if (seen.has(key)) continue;
        seen.add(key);
      }
      kept.push(para);
    }
    return { ...sec, body: kept.join("\n\n").trim() };
  });
  return { ...pack, sections };
}

function topicMentioned(text = "", subject = "", brand = "") {
  const blob = String(text || "").slice(0, 200);
  if (brand && brand.length >= 2 && blob.includes(brand)) return true;
  if (subject && subject.length >= 2) {
    const stem = subject.replace(/\s+/g, "").slice(0, Math.min(8, subject.length));
    if (stem.length >= 2 && blob.replace(/\s/g, "").includes(stem)) return true;
  }
  return false;
}

function buildRoleOpener(role, p, input) {
  const subject = topicRaw(input) || p.topicFacet || topicWritingFacet(input);
  const hooks = {
    gi: `솔직히 ${subject} 알아보던 중 ${p.regionBit}${p.brand}가 눈에 들어왔어요.`,
    seung: `${p.regionBit}${p.brand}에 직접 들어가 ${subject}를 눈으로 확인했어요.`,
    jeon: `${subject}를 비교해 보니 고를 때 기준이 조금씩 보였어요.`,
    gyeol: `정리하면 ${subject}는 직접 가 본 뒤 본인 기준으로 맞춰 보면 될 것 같아요.`,
  };
  return hooks[role] || hooks.seung;
}

function threadTopicInSection(body = "", role = "seung", p = {}, input = {}) {
  const trimmed = String(body || "").trim();
  if (!trimmed) return buildRoleOpener(role, p, input);
  const subject = topicRaw(input) || p.topicFacet || topicWritingFacet(input);
  const paras = trimmed.split(/\n\n+/);
  const first = paras[0] || "";
  if (topicMentioned(first, subject, p.brand) && first.replace(/\s/g, "").length >= 36) {
    return trimmed;
  }
  if (first.replace(/\s/g, "").length < 48 || isMissionPadParagraph(first)) {
    const hook = buildRoleOpener(role, p, input);
    const rest = isMissionPadParagraph(first) ? paras.slice(1) : paras;
    return [hook, ...rest].filter(Boolean).join("\n\n").trim();
  }
  return trimmed;
}

/**
 * @param {object} pack
 * @param {object} [input]
 */
export function applyNarrativeArcShape(pack, input = {}, options = {}) {
  if (!isBriclogMissionEnforced() || !pack?.sections?.length) return pack;
  if (
    !options.force &&
    (pack._meta?.forcedMissionProseRoute ||
      shouldForceMissionProseOnlyPath(input))
  ) {
    return pack;
  }
  if (pack._meta?.narrativeArcShape && !options.force) return pack;
  if (
    pack._meta?.industryHumanColumnEditorial &&
    !isFieldReviewSpeaker(input)
  ) {
    return pack;
  }

  const profile = loadColumnMagazineProfile();
  const p = deriveTopicWritingContext(input);

  let next = dedupeMissionProsePack(pack);
  let sections = reorderSectionsByArc(next.sections, profile);
  const roles = mapSectionArcRoles(sections.length);
  const arcHeadings = buildTopicArcSectionHeadings(input, sections.length);

  sections = sections.map((sec, i) => {
    let body = pruneJumbledMissionPads(sec.body);
    body = threadTopicInSection(body, roles[i], p, input);
    return {
      ...sec,
      heading: arcHeadings[i] || sec.heading,
      body,
    };
  });

  next = { ...next, sections };
  next = stripDuplicateAnchorParagraphs(next);
  next = dedupeMissionProsePack(next);

  const arcBefore = scoreMagazineColumnArc(pack);
  const arcAfter = scoreMagazineColumnArc(next);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      narrativeArcShape: true,
      narrativeArcRoles: roles,
      narrativeArcScore: arcAfter,
      narrativeArcImproved: arcAfter.score > arcBefore.score,
    },
  };
}

export function buildNarrativeArcWriterBrief(input = {}) {
  if (!isBriclogMissionEnforced()) return "";
  const p = deriveTopicWritingContext(input);
  const subject = topicRaw(input) || p.topicFacet;
  return `【기승전결·주제 고정】
섹션 순서: 1)기(왜 ${subject}를 찾게 됐는지) → 2)승(${p.brand} 직접 방문·현장) → 3)전(비교·기준·아쉬운 점) → 4)결(본인 기준 정리). 섹션마다 역할이 달라야 하며 같은 안내 문장·미션 패드를 반복하지 않는다.
각 섹션 첫 문장에 「${subject}」 또는 「${p.brand}」가 보이게 쓴다. FAQ·체크리스트·「관련 안내를 들었어요」 템플릿 금지.`;
}

export function scoreNarrativeCoherence(pack, input = {}) {
  const arc = scoreMagazineColumnArc(pack);
  const p = deriveTopicWritingContext(input);
  const subject = topicRaw(input) || p.topicFacet || topicWritingFacet(input);
  const reasons = [...(arc.reasons || [])];
  let score = arc.score || 0;

  const sections = pack?.sections || [];
  const missingTopic = sections.filter(
    (s) => !topicMentioned(String(s.body || "").slice(0, 220), subject, p.brand)
  ).length;
  if (missingTopic >= 2) {
    reasons.push("topic_thread_weak");
    score -= 12;
  }

  const padCount = sections.reduce((n, s) => {
    const paras = String(s.body || "").split(/\n\n+/);
    return n + paras.filter((para) => isMissionPadParagraph(para)).length;
  }, 0);
  if (padCount >= 2) {
    reasons.push("mission_pad_jumble");
    score -= 14;
  }

  return {
    ok: score >= 72 && reasons.length <= 2,
    score: Math.max(0, Math.round(score)),
    reasons: [...new Set(reasons)],
    arc,
  };
}
