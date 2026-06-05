/**
 * 가구·침대 전시(오피모 등) — 현장 후기 SSOT
 * 제품 허구 스펙 · 매장 안내 나열 · 타 브랜드 · 해요/합니다 혼용 방지
 */
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine";
import {
  getIndustryFlavorForInput,
  isExhibitionTopic,
  isFurnitureIndustry,
} from "@/lib/product/industryContextEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { REAL_FIELD_SMELL_RES } from "@/lib/product/checklistVoiceEngine";
import { rewriteSignatureHeading } from "@/lib/product/signatureWritingEngine";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";
import { buildStoryTargetSceneLines } from "@/lib/product/storyTargetEngine";

export const FURNITURE_EXHIBITION_ENGINE_VERSION = "v1";

/** Turbopack/SWC — regex literal 파싱 오류 회피 */
function re(source, flags = "") {
  return new RegExp(source, flags);
}

/** 오피모·프레임 전시 — 확인 없이 쓰면 안 되는 기능·스펙 (무드·연출 묘사는 허용) */
export const OPIMO_UNVERIFIED_SPEC_RES = [
  re("체압\\s*분산"),
  re("모션\\s*(?:기능|베드|침대|상승|작동)?"),
  re("옆모드|등모드"),
  re("헤드업|풋업"),
  re("프레임\\s*높이\\s*조절"),
  re("높이\\s*조절이\\s*가능"),
  re("맞춤형\\s*조절"),
  re("헤드\\s*(?:각도|조절)"),
  re("제로\\s*지"),
  re("저상형\\s*디자인과\\s*뛰어난\\s*기능성\\s*매트리스"),
  re("매트리스\\s*단단함|함몰감|측면\\s*지지"),
  re("스프링.{0,2}폼\\s*레이어|스프링\\s*타입|레이어\\s*구성"),
  re("10분\\s*넘게\\s*누워|허리\\s*지지감|지지감이\\s*달"),
  re("소음.{0,2}진동|진동\\s*전달|뒤척임\\s*때"),
  re("프레임\\s*높이|헤드보드"),
  re("모션\\s*각도|제로지\\s*모드|모션\\s*작동"),
  re("고정형\\s*모두|고정형\\s*모션"),
  re("소파.{0,2}테이블|테이블.{0,2}수납"),
  re("전문으로\\s*하는\\s*브랜드이다"),
  re("이\\s*매장(?:는|은)\\s*프리미엄"),
];

const META_BOILERPLATE_RES = [
  re("과장\\s*없이\\s*매장.{0,2}공식\\s*안내\\s*기준으로만\\s*정리"),
  re("놓치지\\s*마세요"),
  re("많은\\s*관심을\\s*받고\\s*있습니다"),
  re("보다\\s*원활한\\s*체험"),
  re("편리하게\\s*매장을\\s*이용"),
];

const COMPETITOR_RES = [
  re("다른\\s*브랜드(?:와|과)?\\s*(?:의\\s*)?비교"),
  re("타\\s*브랜드"),
  re("타사\\s*(?:제품|브랜드)"),
];

const SERVICE_SECTION_HEADING_RES = [
  re("^방문\\s*시\\s*확인"),
  re("^행사와\\s*할인"),
  re("^설치와\\s*배송"),
  re("^A/S와\\s*교환"),
  re("^방문\\s*예약\\s*방법"),
  re("^예약\\s*방법"),
  re("^배송\\s*서비스"),
  re("^교환\\s*정책"),
  re("특징과\\s*기능$"),
  re("혜택\\s*안내$"),
  re("서비스\\s*안내$"),
];

const UNNATURAL_TITLE_HEADING_RES = [
  re("전시\\s*소식이\\s*궁금"),
  re("소식에\\s*담긴\\s*이야기"),
  re("봐야\\s*할\\s*기준$"),
  re("알아보(?:면|세요)"),
  re("찾게\\s*되는가"),
  re("찾게\\s*되었는가"),
  re("왜\\s.+\\s*찾게"),
];

const ANTI_SEO_PLACEHOLDER_RES = [
  re("이\\s*지역\\s*이\\s*매장"),
  re("근처\\s*해당\\s*브랜드"),
  re("생활권\\s*이곳"),
  re("그래서\\s*근처\\s*해당"),
  re("이\\s*지역\\s*여기"),
  re("해당\\s*브랜드를\\s*이\\s*주제"),
];

const PRACTICAL_FACT_RES = [
  re("(?:예약|전화|주차|영업\\s*시간|운영\\s*시간|오전|오후|휴무|주소|위치)"),
];

const MOOD_SCENE_OK_RES = re("무드|연출|톤|조명|분위기|화사|아늑|저상형");
const MOOD_SPEC_LEAK_RES = re("기능|조절|분산|모션|제로\\s*지|옆모드|등모드");
const FIELD_SMELL_INLINE_RES = re("(?:쇼룸|전시대|누워|직접\\s*봤|메모|체험|느낌|들었어요|다녀|방문)");
const WHY_HEADING_INLINE_RES = re("찾게\\s*되는가|찾게\\s*되었는가|왜\\s.+\\s*찾게");
const EXHIBITION_TOPIC_INLINE_RES = re("전시|오피모|소식");
const OPIMO_TOPIC_INLINE_RES = re("오피모", "i");
const VISIT_SCENE_INLINE_RES = re("다녀|방문|쇼룸|전시대");

export function isFurnitureExhibitionContext(input = {}) {
  if (!isBriclogMissionEnforced()) return false;
  const blob = `${input.topic || ""} ${input.mainKeyword || ""} ${input.industry || ""}`;
  if (isFurnitureIndustry(input)) return true;
  if (isExhibitionTopic(input)) {
    return re("가구|침대|매트리스|오피모|에이스|침구|쇼룸|bed", "i").test(blob);
  }
  return re("오피모|에이스침대|모션베드|매트리스").test(blob);
}

export function isOpimoTopic(input = {}) {
  return re("오피모|opimo", "i").test(`${input.topic || ""} ${input.mainKeyword || ""}`);
}

function hasFieldSmell(text = "") {
  const t = String(text || "");
  if (REAL_FIELD_SMELL_RES.some((rx) => rx.test(t))) return true;
  return FIELD_SMELL_INLINE_RES.test(t);
}

function isUnverifiedOpimoSpecSentence(sentence, input = {}) {
  if (!isOpimoTopic(input)) return false;
  const s = String(sentence || "").trim();
  if (!s) return false;
  if (MOOD_SCENE_OK_RES.test(s) && !MOOD_SPEC_LEAK_RES.test(s)) {
    return false;
  }
  return OPIMO_UNVERIFIED_SPEC_RES.some((rx) => rx.test(s));
}

export function isOpimoUnverifiedSentence(sentence, input = {}) {
  return isUnverifiedOpimoSpecSentence(sentence, input);
}

function dedupeBlockquoteLines(text = "") {
  const paras = String(text || "").split(/\n\n+/);
  const seen = new Set();
  const out = [];
  for (const para of paras) {
    if (!/^>/.test(para.trim())) {
      out.push(para);
      continue;
    }
    const lines = para.split("\n").filter((l) => l.trim());
    const kept = [];
    for (const line of lines) {
      const key = line.replace(/\s/g, "").slice(0, 48);
      if (seen.has(key)) continue;
      seen.add(key);
      kept.push(line);
    }
    if (kept.length) out.push(kept.slice(0, 2).join("\n"));
  }
  return out.join("\n\n").trim();
}

function dedupeGlobalParagraphs(sections = []) {
  const seen = new Set();
  return sections.map((sec) => {
    const paras = [];
    for (const raw of String(sec.body || "").split(/\n\n+/)) {
      const p = raw.trim();
      if (!p || p.replace(/\s/g, "").length < 10) continue;
      const key = p.replace(/\s/g, "").slice(0, 52);
      if (seen.has(key)) continue;
      seen.add(key);
      paras.push(p);
    }
    return { ...sec, body: dedupeBlockquoteLines(paras.join("\n\n")) };
  });
}

function stripAntiSeoPlaceholderLeaks(text = "", input = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  let t = String(text || "");
  if (ANTI_SEO_PLACEHOLDER_RES.some((rx) => rx.test(t))) {
    t = t
      .replace(re("근처\\s*해당\\s*브랜드", "g"), brand || "매장")
      .replace(
        re("이\\s*지역\\s*이\\s*매장", "g"),
        region && brand ? `${region} ${brand} 매장` : brand || "매장"
      )
      .replace(re("생활권\\s*이곳", "g"), region || "이곳")
      .replace(re("해당\\s*브랜드", "g"), brand || "매장")
      .replace(re("이\\s*지역", "g"), region || "현장")
      .replace(re("이\\s*매장", "g"), brand ? `${brand} 매장` : "매장");
  }
  return t.replace(re("\\s{2,}", "g"), " ").trim();
}

function stripBadSentences(text, input = {}) {
  const kept = [];
  for (const raw of splitKoreanSentences(text)) {
    let s = raw.trim();
    if (!s || s.replace(/\s/g, "").length < 10) continue;
    s = stripAntiSeoPlaceholderLeaks(s, input);
    if (ANTI_SEO_PLACEHOLDER_RES.some((rx) => rx.test(s))) continue;
    if (META_BOILERPLATE_RES.some((rx) => rx.test(s))) continue;
    if (COMPETITOR_RES.some((rx) => rx.test(s))) continue;
    if (isUnverifiedOpimoSpecSentence(s, input)) continue;
    kept.push(s);
  }
  return kept.join("\n\n").trim();
}

function isServiceBoilerplateSection(heading = "", body = "") {
  const h = String(heading || "").trim();
  if (SERVICE_SECTION_HEADING_RES.some((rx) => rx.test(h))) return true;
  if (re("^방문\\s*예약|^설치와\\s*배송|^A/S").test(h)) return true;
  const b = String(body || "");
  if (!hasFieldSmell(b) && re("(?:예약|배송|설치|A/S|교환|할인\\s*혜택|고객\\s*만족)").test(b)) {
    return true;
  }
  return false;
}

function extractPracticalLines(sections = []) {
  const lines = [];
  for (const sec of sections) {
    for (const raw of splitKoreanSentences(sec?.body || "")) {
      const s = raw.trim();
      if (!s || s.length < 8) continue;
      if (PRACTICAL_FACT_RES.some((rx) => rx.test(s)) && s.length < 120) {
        lines.push(s.replace(re("합니다\\.?$"), "해요.").replace(re("됩니다\\.?$"), "돼요."));
      }
    }
  }
  return [...new Set(lines)].slice(0, 4);
}

function formatPracticalBlockquote(lines = []) {
  if (!lines.length) return "";
  return lines.map((l) => `> ${l}`).join("\n");
}

export function rewriteFurnitureExhibitionHeading(heading, input = {}) {
  const h = String(heading || "").trim();
  if (!h) return h;
  const p = deriveTopicWritingContext(input);
  const topic = input.topic || p.topicFacet || "전시";
  const topicObj = koreanObjectParticle(topic);

  if (UNNATURAL_TITLE_HEADING_RES.some((rx) => rx.test(h))) {
    if (EXHIBITION_TOPIC_INLINE_RES.test(topic)) {
      return `${p.regionBit}${p.brand} 오피모 전시, 쇼룸에서 직접 본 점`;
    }
    return `${p.regionBit}${p.brand} ${topicObj} 보러 다녀온 후기`;
  }

  if (SERVICE_SECTION_HEADING_RES.some((rx) => rx.test(h))) {
    if (re("할인|행사").test(h)) return "전시·행사 조건을 본인 기준으로";
    if (re("예약|방문").test(h)) return "당일 쇼룸 동선·상담 흐름";
    return "현장에서 확인한 디테일";
  }

  return rewriteSignatureHeading(h, input);
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function applyFurnitureExhibitionPackPolish(pack, input = {}) {
  if (!isFurnitureExhibitionContext(input) || !pack?.sections?.length) return pack;

  const p = deriveTopicWritingContext(input);
  const { flavor } = getIndustryFlavorForInput(input);
  const practicalPool = [];
  const narrative = [];

  for (const sec of pack.sections) {
    let heading = rewriteFurnitureExhibitionHeading(sec.heading, input);
    if (WHY_HEADING_INLINE_RES.test(heading)) {
      heading = rewriteFurnitureExhibitionHeading("왜 찾게 되는가", input);
    }
    let body = stripBadSentences(stripAntiSeoPlaceholderLeaks(sec.body, input), input);

    if (isServiceBoilerplateSection(heading, body)) {
      practicalPool.push(...extractPracticalLines([{ body }]));
      continue;
    }

    if (!hasFieldSmell(body) && body.replace(/\s/g, "").length < 80) {
      practicalPool.push(...extractPracticalLines([{ body }]));
      continue;
    }

    if (narrative.length === 0 && isOpimoTopic(input) && !VISIT_SCENE_INLINE_RES.test(body)) {
      const scenes = buildStoryTargetSceneLines(input, 2);
      body = [
        scenes[0] ||
          `${p.regionBit}${p.brand} ${flavor.spaceWord}에 들러 ${p.topicFacet || "오피모"} 전시 구성을 직접 봤어요.`,
        body,
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    narrative.push({ heading, body });
  }

  if (narrative.length < 2) {
    narrative.push({
      heading: `${p.regionBit}${p.brand} 쇼룸, 전시 구성을 본 순서`,
      body: `${p.regionBit}${p.brand} ${flavor.spaceWord}에서 전시대·체험 동선부터 확인했어요. 프레임·구성 차이는 사진보다 직접 보는 편이 빨라요.`,
    });
  }

  if (isExhibitionTopic(input) && narrative[0]) {
    const topicBit = OPIMO_TOPIC_INLINE_RES.test(`${input.topic || ""}`) ? "오피모 전시" : p.topicFacet || "전시";
    narrative[0].heading = `${p.regionBit}${p.brand} ${topicBit}, 쇼룸에서 직접 본 점`;
  }

  const seenHeadings = new Set();
  const fallbackHeadings = [
    "전시 연출·동선을 본 순서",
    "사진과 달랐던 체감 포인트",
    "상담·조건을 정리한 방법",
    "현장에서 확인한 디테일",
  ];
  let fallbackIdx = 0;
  for (const sec of narrative) {
    let key = String(sec.heading || "").replace(/\s/g, "").slice(0, 40);
    if (seenHeadings.has(key)) {
      sec.heading = fallbackHeadings[fallbackIdx % fallbackHeadings.length];
      fallbackIdx += 1;
      key = String(sec.heading || "").replace(/\s/g, "").slice(0, 40);
    }
    seenHeadings.add(key);
  }

  const practicalBlock = formatPracticalBlockquote(
    practicalPool.length
      ? practicalPool
      : [
          `${p.regionBit}방문 전 영업 시간·주차·예약 가능 여부는 전화·플레이스로 확인하는 편이 정확해요.`,
        ]
  );

  const lastIdx = narrative.length - 1;
  if (practicalBlock && narrative[lastIdx]) {
    narrative[lastIdx] = {
      ...narrative[lastIdx],
      body: `${narrative[lastIdx].body}\n\n${practicalBlock}`.trim(),
    };
  }

  return {
    ...pack,
    sections: dedupeGlobalParagraphs(
      narrative.filter((s) => s.body.replace(/\s/g, "").length >= 40)
    ),
    _meta: {
      ...(pack._meta || {}),
      furnitureExhibitionEngine: FURNITURE_EXHIBITION_ENGINE_VERSION,
    },
  };
}

export function buildFurnitureExhibitionWriterBrief(input = {}) {
  if (!isFurnitureExhibitionContext(input)) return "";
  const opimo = isOpimoTopic(input);
  return [
    "【가구·전시 · FURNITURE EXHIBITION ENGINE】",
    "제목·도입: 지역+브랜드+직접 다녀온 후기·전시 현장. 「~이 궁금하다면」「봐야 할 기준」형 부제 금지.",
    "본문 비중: 전시대·쇼룸에서 본 구성·동선·체험·느낌(1인칭) 70% 이상. 예약·A/S·설치·배송·할인을 섹션으로 나열하지 말 것.",
    "실무 정보(예약·운영시간·주차): 본문 말미 인용구(>) 4줄 이내로만.",
    opimo
      ? "오피모·프레임 전시: 체압분산·모션·프레임 높이 조절·맞춤 조절 등 조사·현장 확인 없는 스펙 단정 금지. 매트리스 기능을 프레임에 붙이지 말 것."
      : "침대·가구: 조사·체험 없는 기능·스펙 단정 금지.",
    "타 브랜드 비교 문장 금지. 해요체로 통일(합니다·습니다 혼용 금지).",
    "「과장 없이 매장·공식 안내 기준」 같은 메타 문장 금지.",
  ].join("\n");
}
