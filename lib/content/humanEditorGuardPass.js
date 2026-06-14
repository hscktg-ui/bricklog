/**
 * BRICLOG HUMAN EDITOR GUARD — 고객이 GPT에 붙여넣지 않아도 출력 직전 자동 검사·보정
 * 정보 나열·체크리스트 톤·어미·구조·주차/예약 반복·키워드 스팸 억제
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { titleContext } from "@/lib/content/humanTitleEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import {
  ANTI_SEO_SPAM_MAX_TOKEN_REPEAT,
  ANTI_SEO_SPAM_PRONOUNS,
  countTokenMentions,
  resolveAntiSeoTopicPronouns,
  softenTokenRepeats,
} from "@/lib/product/antiSeoSpamEngine";
import { resolveTopicCapSubstitute } from "@/lib/content/placeholderContaminationEngine";
import { detectIndustryCommonSenseViolations } from "@/lib/product/humanityCommonSenseEngine";
import {
  ensureHumanStoryOpeningBody,
  scoreHumanStoryOpening,
} from "@/lib/product/humanStoryEngine";
import { CHECKLIST_TEMPLATE_RES } from "@/lib/product/checklistVoiceEngine";
import {
  isEditorHumanizationDeclarativeAdvice,
  isEditorHumanizationForbiddenSentence,
} from "@/lib/product/editorHumanizationEngine";
import { stripForeignRegionSentences } from "@/lib/content/regionVoiceLock";
import { shouldStripDeliverySentence } from "@/lib/product/brandJournalistDirective";

export const HUMAN_EDITOR_GUARD_BRIEF = `정보가 많다고 좋은 글이 아니다. 정보를 해석한다.
같은 어미(했어요·봤어요·좋았어요) 3회 이상 금지. 「방문 전에」「비교할 때」「상담 전에」 동일 패턴 3회 이상 금지.
주차·예약·영업시간은 본문 1회만. 후기는 경험 중심, 체크리스트·안내 문서 톤 금지.
관찰·판단·비교·느낌 중 2개 이상. 지역·브랜드·주제 억지 반복 금지.
업종 불일치(꽃집에 침대 등) 1개라도 있으면 실패. 「직접 다녀온 사람이 정리했네」가 목표.`;

const ESSEO_YO_RE = /(?:했어요|봤어요|좋았어요|갔어요|됐어요|있어요|줬어요|뒀어요)\s*[.!?…]?\s*$/;

const STRUCTURE_PHRASES = [
  { id: "before_visit", re: /방문\s*전에/g, alts: ["가기 전에", "당일 전에", "미리"] },
  { id: "before_consult", re: /상담\s*전에/g, alts: ["이야기 나누기 전에", "문의하기 전에"] },
  { id: "when_compare", re: /비교할\s*때/g, alts: ["고를 때", "맞춰 볼 때"] },
  { id: "confirm_please", re: /확인하세요/g, alts: ["확인해 봤어요", "직접 물어봤어요"] },
  { id: "procedure_flow", re: /이용\s*절차·대기·상담/g, alts: ["매장 안내 흐름"] },
];

const VISIT_INFO_RES = [
  { id: "parking", re: /주차/ },
  { id: "hours", re: /영업\s*시간/ },
  { id: "reserve", re: /예약/ },
];

const THOUGHT_FLOW_RES = [
  /처음에는|그런데|보니|느껴|달랐|기준이|솔직히|생각보다|막히|헷갈/,
];

const ENDING_ROTATIONS = [
  (s) => s.replace(/했어요([.!?…]?)$/, "했다$1"),
  (s) => s.replace(/봤어요([.!?…]?)$/, "봤다$1"),
  (s) => s.replace(/좋았어요([.!?…]?)$/, "괜찮았다$1"),
  (s) => s.replace(/갔어요([.!?…]?)$/, "갔다$1"),
  (s) => s.replace(/됐어요([.!?…]?)$/, "됐다$1"),
  (s) => s.replace(/었어요([.!?…]?)$/, "었다$1"),
  (s) => s.replace(/있어요([.!?…]?)$/, "있었다$1"),
  (s) => s.replace(/줬어요([.!?…]?)$/, "줬다$1"),
  (s) => s.replace(/뒀어요([.!?…]?)$/, "뒀다$1"),
];

/** 미션 블로그 — 해요체 유지하며 어미만 살짝 바꿈 (치환 후 동일 패턴 재매칭 금지) */
const MISSION_HAEYO_ROTATIONS = [
  (s) =>
    /확인해\s+봤|직접\s+확인/.test(s)
      ? s
      : s.replace(/봤어요([.!?…]?)$/, "직접 확인해 보았어요$1"),
  (s) =>
    /다녀왔어요/.test(s) ? s : s.replace(/갔어요([.!?…]?)$/, "다녀왔어요$1"),
  (s) =>
    /해\s+봤어요/.test(s) ? s : s.replace(/했어요([.!?…]?)$/, "해 봤어요$1"),
  (s) =>
    /괜찮더라구요/.test(s) ? s : s.replace(/좋았어요([.!?…]?)$/, "괜찮더라구요$1"),
  (s) =>
    /됐더라구요/.test(s) ? s : s.replace(/됐어요([.!?…]?)$/, "됐더라구요$1"),
  (s) =>
    /있더라구요/.test(s) ? s : s.replace(/있어요([.!?…]?)$/, "있더라구요$1"),
  (s) =>
    /들어봤어요/.test(s) ? s : s.replace(/들었어요([.!?…]?)$/, "들어봤어요$1"),
  (s) =>
    /적어\s+뒀어요/.test(s) ? s : s.replace(/남겼어요([.!?…]?)$/, "적어 뒀어요$1"),
];

function countEsseoYo(sentences = []) {
  return sentences.filter((s) => ESSEO_YO_RE.test(s.trim())).length;
}

function countStructurePhrase(text = "") {
  const counts = {};
  for (const { id, re } of STRUCTURE_PHRASES) {
    const m = text.match(re);
    counts[id] = m ? m.length : 0;
  }
  return counts;
}

function countVisitInfoMentions(text = "") {
  const counts = {};
  for (const { id, re } of VISIT_INFO_RES) {
    const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
    const m = text.match(new RegExp(re.source, flags));
    counts[id] = m ? m.length : 0;
  }
  return counts;
}

/**
 * @param {string} fullText
 * @param {object} input
 */
export function scoreHumanEditorGuard(fullText = "", input = {}) {
  if (!isBriclogMissionEnforced()) {
    return { ok: true, score: 100, issues: [], checks: {} };
  }

  const text = String(fullText || "");
  const sentences = splitKoreanSentences(text).filter(
    (s) => s.replace(/\s/g, "").length >= 8
  );
  const { region, brand, topic } = titleContext({}, input);
  const issues = [];

  const esseoCount = countEsseoYo(sentences);
  if (esseoCount >= 6) {
    issues.push({ type: "suffix_esseo_yo_repeat", count: esseoCount });
  }

  const structure = countStructurePhrase(text);
  for (const [id, count] of Object.entries(structure)) {
    if (count >= 3) issues.push({ type: "structure_phrase_repeat", id, count });
  }

  const visit = countVisitInfoMentions(text);
  const visitSum = Object.values(visit).reduce((a, n) => a + n, 0);
  if (visitSum >= 5) {
    issues.push({ type: "visit_info_repeat", counts: visit });
  }

  if (brand && countTokenMentions(text, brand) > 10) {
    issues.push({ type: "brand_repeat", count: countTokenMentions(text, brand) });
  }
  if (region && countTokenMentions(text, region) > 9) {
    issues.push({ type: "region_repeat", count: countTokenMentions(text, region) });
  }
  if (topic && topic.length >= 4 && countTokenMentions(text, topic) > 5) {
    issues.push({ type: "topic_repeat", count: countTokenMentions(text, topic) });
  }

  const thoughtHits = THOUGHT_FLOW_RES.filter((re) => re.test(text)).length;
  if (thoughtHits < 2) {
    issues.push({ type: "human_thought_flow_low", hits: thoughtHits });
  }

  const industry = detectIndustryCommonSenseViolations(text, input);
  if (!industry.ok) {
    issues.push(...industry.issues.map((i) => ({ type: "industry_mismatch", ...i })));
  }

  const story = scoreHumanStoryOpening(text, input);
  if (!story.ok) {
    issues.push(...story.issues.map((i) => ({ type: "human_story_opening", ...i })));
  }

  let score = 88;
  score -= Math.min(30, (esseoCount - 2) * 6);
  score -= Object.values(structure).reduce((a, n) => a + (n >= 3 ? 12 : n >= 2 ? 5 : 0), 0);
  score -= visitSum >= 5 ? 14 : 0;
  score -= thoughtHits < 2 ? 12 : 0;
  if (!industry.ok) score -= 25;
  if (!story.ok) {
    score -= story.issues.some((i) => i.type === "product_first_opening") ? 18 : 8;
  }
  score = Math.max(0, Math.min(100, score));

  const hardFail =
    esseoCount >= 10 ||
    Object.values(structure).some((n) => n >= 5) ||
    visitSum >= 8 ||
    !industry.ok;

  return {
    ok: score >= 70 && !hardFail && issues.length <= 2,
    score,
    issues,
    hardFail,
    checks: { esseoCount, structure, visit, thoughtHits, industry, humanStory: story },
  };
}

function rotateStructurePhrase(sentence, phraseIdx) {
  let out = sentence;
  for (const { re, alts } of STRUCTURE_PHRASES) {
    if (!re.test(out)) continue;
    const alt = alts[phraseIdx % alts.length];
    out = out.replace(re, alt);
    break;
  }
  return out;
}

function shouldDropVisitInfoSentence(sentence, seen) {
  const hits = VISIT_INFO_RES.filter(({ re }) => re.test(sentence));
  if (hits.length === 0) return false;
  const key = hits.map((h) => h.id).sort().join(",");
  if (seen.has(key) || seen.size >= 1) {
    return hits.length >= 1 && /확인|문의|전화|예약|주차|영업/.test(sentence);
  }
  seen.add(key);
  return false;
}

function polishSentence(sentence, globalState, sectionIdx, input = {}) {
  let s = String(sentence || "").trim();
  if (s.replace(/\s/g, "").length < 8) return s;

  if (shouldStripDeliverySentence(s, input)) return "";

  s = s.replace(/\.{0,2}도\s*매장에서\s*들었어요/g, "라는 설명을 들었어요");
  s = s.replace(/이\s*매장는/g, "이 매장은");
  if (isEditorHumanizationForbiddenSentence(s)) return "";
  if (sectionIdx > 0 && isEditorHumanizationDeclarativeAdvice(s)) return "";
  if (CHECKLIST_TEMPLATE_RES.some((re) => re.test(s)) && sectionIdx > 0) {
    return "";
  }
  if (sectionIdx > 0) {
    s = s.replace(/(?:표로\s*정리|항목별\s*견적|재방문\s*상담이\s*빨라)/g, "");
    if (/비교할\s*때\s*가격·조건/.test(s)) return "";
    if (/이용\s*절차·대기/.test(s)) return "";
    if (/확인되지\s*않은\s*효과/.test(s)) return "";
  }

  if (shouldDropVisitInfoSentence(s, globalState.visitSeen)) return "";

  if (ESSEO_YO_RE.test(s)) {
    if (globalState.esseoCount >= 1) {
      const rotations = isBriclogMissionEnforced()
        ? MISSION_HAEYO_ROTATIONS
        : ENDING_ROTATIONS;
      s = rotations[globalState.esseoRotate % rotations.length](s);
      globalState.esseoRotate += 1;
    }
    if (ESSEO_YO_RE.test(s)) globalState.esseoCount += 1;
  }

  if (globalState.structureIdx < 8) {
    s = rotateStructurePhrase(s, globalState.structureIdx);
    globalState.structureIdx += 1;
  }

  return s.trim();
}

function capTopicMentionsInText(text, input = {}, max = 3, state = null) {
  const topic = String(input.topic || input.mainKeyword || "").trim();
  if (!topic || topic.length < 6) return text;
  const esc = topic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(esc, "g");
  const alt = resolveTopicCapSubstitute(input);
  if (state) {
    return String(text || "").replace(re, (m) => {
      state.n += 1;
      return state.n <= max ? m : alt;
    });
  }
  let n = 0;
  return String(text || "").replace(re, (m) => {
    n += 1;
    return n <= max ? m : alt;
  });
}

export function capTopicMentionsOnPack(pack, input = {}, maxTotal = 4) {
  const topic = String(input.topic || input.mainKeyword || "").trim();
  if (!topic || topic.length < 6) return pack;
  const state = { n: 0 };
  const cap = (t) => capTopicMentionsInText(t, input, maxTotal, state);
  return {
    ...pack,
    title: cap(pack.title),
    representativeTitle: cap(pack.representativeTitle || pack.title),
    sections: (pack.sections || []).map((sec) => ({
      ...sec,
      heading: cap(sec.heading),
      body: cap(sec.body),
    })),
    conclusion: pack.conclusion ? cap(pack.conclusion) : pack.conclusion,
    intro: pack.intro ? cap(pack.intro) : pack.intro,
  };
}

function softenTopicHeading(heading, input = {}) {
  const topic = String(input.topic || input.mainKeyword || "").trim();
  if (!topic || topic.length < 6) return heading;
  let out = String(heading || "");
  let n = 0;
  out = out.replace(new RegExp(topic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), () => {
    n += 1;
    return n === 1 ? topic : resolveTopicCapSubstitute(input);
  });
  return out;
}

function softenGuardEntities(text, input = {}) {
  let out = String(text || "");
  const { brand, region, topic } = titleContext({}, input);
  if (brand) {
    out = softenTokenRepeats(out, brand, ANTI_SEO_SPAM_PRONOUNS.brand, ANTI_SEO_SPAM_MAX_TOKEN_REPEAT);
  }
  if (region) {
    out = softenTokenRepeats(out, region, ANTI_SEO_SPAM_PRONOUNS.region, ANTI_SEO_SPAM_MAX_TOKEN_REPEAT);
  }
  if (topic && topic.length >= 4) {
    out = softenTokenRepeats(
      out,
      topic,
      resolveAntiSeoTopicPronouns(input),
      ANTI_SEO_SPAM_MAX_TOKEN_REPEAT
    );
  }
  return out;
}

function diversifyEsseoYoInText(text, counter = { n: 0 }) {
  const src = String(text || "");
  if (src.length > 12000) return src;
  return src.replace(
    /[가-힣]{1,28}(?:했|봤|갔|됐|졌|였|쳤|겼|렸|뒀|줬|있|올렸|느꼈|비교했|확인했|검토했|연락했|참고했|편했|들었|남겼|적어|알아보|올려뒀|느껴졌)어요/g,
    (m) => {
      counter.n += 1;
      if (counter.n <= 2) return m;
      if (isBriclogMissionEnforced()) {
        const rot =
          MISSION_HAEYO_ROTATIONS[counter.n % MISSION_HAEYO_ROTATIONS.length];
        const next = rot(m);
        return next === m ? m.replace(/어요([.!?…]?)$/, "더라구요$1") : next;
      }
      return m.replace(/어요([.!?…]?)$/, "었다$1");
    }
  );
}

function rewriteSectionBody(body, input, sectionIdx, globalState) {
  const paras = String(body || "")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const kept = [];
  for (const para of paras) {
    const sentences = splitKoreanSentences(para);
    const polished = sentences
      .map((s) => polishSentence(s, globalState, sectionIdx, input))
      .filter((s) => s.replace(/\s/g, "").length >= 8);
    if (polished.length) kept.push(polished.join(" "));
  }
  return softenGuardEntities(
    stripForeignRegionSentences(kept.join("\n\n"), input),
    input
  );
}

/**
 * @param {object} pack
 * @param {object} ctx
 * @param {object} input
 */
export function applyHumanEditorGuardPass(pack, ctx = {}, input = {}) {
  if (!pack?.sections?.length || !isBriclogMissionEnforced()) return pack;

  const evalInput = input || ctx.input || ctx;
  const globalState = {
    esseoCount: 0,
    esseoRotate: 0,
    structureIdx: 0,
    visitSeen: new Set(),
  };
  const sections = pack.sections.map((sec, idx) => {
    let body = rewriteSectionBody(sec.body, evalInput, idx, globalState);
    if (idx === 0) body = ensureHumanStoryOpeningBody(body, evalInput);
    return {
      ...sec,
      heading: softenTopicHeading(sec.heading, evalInput),
      body,
    };
  });

  let next = {
    ...pack,
    title: softenTopicHeading(pack.title, evalInput),
    representativeTitle: softenTopicHeading(
      pack.representativeTitle || pack.title,
      evalInput
    ),
    sections,
    conclusion: pack.conclusion
      ? softenGuardEntities(
          rewriteSectionBody(
            pack.conclusion,
            evalInput,
            sections.length,
            globalState
          ),
          evalInput
        )
      : pack.conclusion,
  };
  next = capTopicMentionsOnPack(next, evalInput, 4);

  const esseoCounter = { n: 0 };
  next = {
    ...next,
    sections: (next.sections || []).map((sec) => ({
      ...sec,
      body: diversifyEsseoYoInText(sec.body, esseoCounter),
    })),
    conclusion: next.conclusion
      ? diversifyEsseoYoInText(next.conclusion, esseoCounter)
      : next.conclusion,
    intro: next.intro ? diversifyEsseoYoInText(next.intro, esseoCounter) : next.intro,
  };

  const scored = scoreHumanEditorGuard(getBlogFullText(next), evalInput);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      humanEditorGuard: scored,
      humanEditorGuardPass: scored.ok,
    },
  };
}

export function buildHumanEditorGuardPromptBlock() {
  return ["【BRICLOG HUMAN EDITOR GUARD】", HUMAN_EDITOR_GUARD_BRIEF].join("\n");
}
