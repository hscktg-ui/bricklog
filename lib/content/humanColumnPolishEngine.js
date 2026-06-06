/**
 * 사람이 쓴 칼럼처럼 — 광고·AI 톤 제거 + 주제 맞춤 기승전결 소제목·앵커
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import {
  deriveTopicWritingContext,
  isInformationalTopicInput,
  topicRaw,
  topicWritingFacet,
} from "@/lib/content/topicFacetEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { AD_SMELL_RES } from "@/lib/product/humanBeliefEngine";
import { loadColumnMagazineProfile } from "@/lib/content/columnMagazineArchetype";

const GENERIC_HEADING_RES = [
  /비교할 때\s*막히는/,
  /방문·결정\s*전에/,
  /선택지로\s*볼\s*때/,
  /왜\s*지금\s*검색/,
  /^정리\s*—/,
  /이용\s*절차/,
  /FAQ|체크리스트/i,
  /종합\s*정리/,
  /핵심\s*포인트/,
  /알아두면\s*좋은/,
];

const AD_AI_LINE_STRIP = [
  [/제품은\s*이렇습니다\.?/g, ""],
  [/다음과\s*같습니다\.?/g, ""],
  [/소개해\s*드립니다\.?/g, ""],
  [/알려\s*드리(?:요|습니다)\.?/g, ""],
  [/많은\s*분들께\s*추천(?:드립니다|합니다)\.?/g, ""],
  [/지금\s*바로\s*문의(?:해\s*주세요|하세요)?\.?/g, ""],
  [/놓치지\s*마세요\.?/g, ""],
  [/도움이\s*되(?:었|시)길\s*바랍니다\.?/g, ""],
  [/감사합니다\.?/g, ""],
  [/안녕하세요[,，]?\s*/g, ""],
  [/종합(?:적)?으로\s*(?:말씀|정리)하면/g, "정리하면"],
  [/한\s*마디로/g, ""],
  [/결론적으로/g, "정리하면"],
  [/마무리하자면/g, "마지막으로"],
];

function markerHit(text, markers) {
  const list = Array.isArray(markers)
    ? markers.map((m) => (m instanceof RegExp ? m : new RegExp(m)))
    : [];
  return list.some((re) => re.test(String(text || "")));
}

export function mapSectionArcRoles(sectionCount) {
  if (sectionCount <= 4) return ["gi", "seung", "jeon", "gyeol"].slice(0, sectionCount);
  const base = ["gi", "seung", "seung", "jeon", "jeon", "gyeol"];
  const out = [];
  while (out.length < sectionCount) {
    out.push(base[out.length % base.length]);
  }
  return out.slice(0, sectionCount);
}

/** 주제·브랜드에 맞는 기승전결형 소제목 */
export function buildTopicArcSectionHeadings(input = {}, count = 6) {
  const p = deriveTopicWritingContext(input);
  const subject = String(p.topicFacet || topicWritingFacet(input) || topicRaw(input) || "이용").trim();
  const shortSubject =
    subject.length > 28 ? `${p.topicFacet || topicWritingFacet(input)}` : subject;
  const place = [p.region, p.brand].filter(Boolean).join(" ") || p.brand || "매장";

  if (isInformationalTopicInput(input)) {
    return [
      `${shortSubject}, 알아보게 된 이유`,
      `${p.brand} ${shortSubject} 한눈에 보기`,
      `${shortSubject} 고를 때 체크 포인트`,
      `성분·보관·선물 목적별로 보면`,
      `${p.brand}에서 자주 받는 질문`,
      `${shortSubject} 정리`,
      `마무리 — ${shortSubject} 선택 기준`,
    ].slice(0, Math.max(1, count));
  }

  const templates = [
    `${shortSubject}, 찾게 된 계기`,
    `${place} 직접 다녀온 이야기`,
    `${shortSubject} 비교할 때 걸린 점`,
    `내 기준으로 본 ${shortSubject}`,
    `${shortSubject} — 아쉬웠던 부분`,
    `솔직 정리, ${p.brand} ${shortSubject}`,
    `${place}에서 다시 볼 포인트`,
    `마무리 — ${shortSubject} 후기`,
  ];
  return templates.slice(0, Math.max(1, count));
}

function isGenericHeading(heading) {
  const h = String(heading || "").trim();
  if (!h) return true;
  return GENERIC_HEADING_RES.some((re) => re.test(h));
}

function stripAdAiTone(text) {
  let next = String(text || "");
  for (const [re, rep] of AD_AI_LINE_STRIP) {
    next = next.replace(re, rep);
  }
  const sentences = splitKoreanSentences(next).filter((s) => {
    const t = s.trim();
    if (t.replace(/\s/g, "").length < 10) return false;
    if (/^(?:결론적으로|한마디로|마무리하자면|종합적으로)/.test(t)) return false;
    if (AD_SMELL_RES.some((re) => re.test(t) && t.length < 72)) return false;
    if (/^(?:확인|참고)하세요\.?$/.test(t)) return false;
    return true;
  });
  return sentences.join("\n\n").trim();
}

function buildArcAnchor(role, p, input) {
  const subject = topicRaw(input) || p.topicFacet;
  if (isInformationalTopicInput(input)) {
    const infoAnchors = {
      gi: `검색만 하다 보면 ${p.topicFacet} 기준이 많아 어디서부터 볼지 막히는 날이 있습니다.`,
      seung: `${p.brand}에서 안내하는 ${subject} 관련 조건을 정리해 봤습니다.`,
      jeon: `${subject}를 고를 때 성분·보관·목적을 함께 보면 비교가 수월합니다.`,
      gyeol: `용도와 보관 환경을 먼저 정리해 두면 ${subject} 선택이 빨라집니다.`,
    };
    return infoAnchors[role] || infoAnchors.seung;
  }
  const anchors = {
    gi: `요즘 ${p.topicFacet} 알아보던 중 ${p.regionBit}${p.brand}를 한번 직접 가보려 했어요.`,
    seung: `그래서 ${p.regionBit}${p.brand}에 직접 다녀와서 ${subject}를 눈으로 확인했어요.`,
    jeon: `비교해 보니 ${p.topicFacet} 고를 때 기준이 조금씩 보였어요.`,
    gyeol: `정리하면 ${p.topicFacet}는 집에서 메모해 보며 맞춰 보면 될 것 같아요.`,
  };
  return anchors[role] || anchors.seung;
}

function ensureArcAnchorInBody(body, role, p, input) {
  const profile = loadColumnMagazineProfile();
  const markers = profile.arcMarkers[role] || [];
  const trimmed = String(body || "").trim();
  if (!trimmed) return buildArcAnchor(role, p, input);
  if (markerHit(trimmed.slice(0, 220), markers)) return trimmed;
  const anchor = buildArcAnchor(role, p, input);
  if (trimmed.includes(anchor.slice(0, 14))) return trimmed;
  return `${anchor}\n\n${trimmed}`;
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function applyHumanColumnPolish(pack, input = {}) {
  if (!isBriclogMissionEnforced() || !pack?.sections?.length) return pack;
  if (pack._meta?.humanColumnPolish) return pack;

  const p = deriveTopicWritingContext(input);
  const roles = mapSectionArcRoles(pack.sections.length);
  const arcHeadings = buildTopicArcSectionHeadings(input, pack.sections.length);

  const sections = (pack.sections || []).map((sec, i) => {
    let heading = String(sec.heading || "").trim();
    if (isGenericHeading(heading)) {
      heading = arcHeadings[i] || heading;
    }
    let body = stripAdAiTone(sec.body);
    body = ensureArcAnchorInBody(body, roles[i], p, input);
    return { ...sec, heading, body };
  });

  let conclusion = stripAdAiTone(pack.conclusion);
  const profile = loadColumnMagazineProfile();
  if (
    !conclusion ||
    conclusion.replace(/\s/g, "").length < 28 ||
    !markerHit(conclusion, profile.arcMarkers.gyeol)
  ) {
    const subject = topicRaw(input) || p.topicFacet;
    conclusion = stripAdAiTone(
      `${p.regionBit}${p.brand} ${subject} — 직접 가 본 뒤 본인 기준으로 정리해 봤어요. ${p.regionBit}방문 전 일정·주차만 확인해 두면 당일 동선도 편했어요.`
    );
  }

  const polished = { ...pack, sections, conclusion };
  return {
    ...polished,
    _meta: {
      ...(pack._meta || {}),
      humanColumnPolish: true,
      humanColumnArcRoles: roles,
    },
  };
}

export function buildHumanColumnPromptAddon(input = {}) {
  if (!isBriclogMissionEnforced()) return "";
  const p = deriveTopicWritingContext(input);
  const subject = topicRaw(input) || p.topicFacet;
  return `【사람 칼럼 · 주제 맞춤 기승전결】
- "${subject}" 주제에서 벗어난 일반 안내·홍보 문장 금지. 기(왜 찾게 됐는지) → 승(직접 방문·체험) → 전(비교·기준) → 결(본인 정리) 순서를 주제에 맞게 쓴다.
- 소제목은 「${subject}」·「${p.brand}」·방문 장면이 보이게 쓴다. FAQ·체크리스트·「비교할 때 막히는 지점」 같은 AI 소제목 금지.
- 「알려드립니다」「소개합니다」「많은 분들께」「지금 바로」「도움이 되길」 등 광고·브로슈어 문장 금지.`;
}
