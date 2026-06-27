/**
 * 조사 팩트 메타·표기 변형 필터 — editorGrade·sanitize 공용
 */
import { isPromptOnlyResearchFactText } from "@/lib/content/displayBodyGuards";

const META_ONLY_RES = [
  /주제\s*표기\s*변형/,
  /검색·조사용\s*단서/,
  /입력·표기\s*단서/,
  /동일\s*주제\s*후보\s*표기/,
  /브랜드·.+맥락에서.+을\s*설명/,
  /가족\s*단위\s*방문·상담을\s*고려/,
  /로컬\s*매장\s*운영·예약\s*맥락/,
  /이번\s*글의\s*핵심\s*주제/,
  /방문·시즌\s*맥락\s*$/,
];

export const CONCRETE_FACT_SIGNAL_RES =
  /[0-9]|수영|승마|메뉴|돈까|체험|시설|운영|예약|시간|요금|주차|프로그램|수확|딸기|카페|식당|쇼룸|전시|품종|리시안셔스|국수|해바라기|수국|거베라|무인|24시|개장|오픈|물놀이|목장|농장|하우스|견학|체험장/;

export function isMetaOnlyResearchFact(text = "", input = {}, source = "") {
  const t = String(text || "").trim();
  if (!t || t.length < 4) return true;
  if (isPromptOnlyResearchFactText(t, source)) return true;
  if (META_ONLY_RES.some((re) => re.test(t))) return true;

  const rawTopic = String(
    input.topicDisplayRaw || input.topicInterpretation?.topicRaw || input.topic || ""
  ).trim();
  if (rawTopic && t === rawTopic) return true;
  if (rawTopic && t.replace(/\s/g, "") === rawTopic.replace(/\s/g, "")) return true;

  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  if (brand && t === brand) return true;
  if (region && brand && t === `${region} ${brand}`) return true;
  if (/^레저\/체험$|^양평레저|^여주레저/.test(t)) return true;

  const src = String(source || "").toLowerCase();
  if (src === "entity_variant" || src === "input_field") return true;

  return false;
}

export function hasConcreteFactSignal(text = "") {
  const t = String(text || "").trim();
  if (t.replace(/\s/g, "").length < 10) return false;
  if (CONCRETE_FACT_SIGNAL_RES.test(t)) return true;
  if (/·/.test(t) && t.length >= 12) return true;
  return t.replace(/\s/g, "").length >= 16 && !/맥락|단서|표기|설명/.test(t);
}
