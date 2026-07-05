/**
 * 템플릿 보일러플레이트 — 반복 접미사·설명 수리 스팸 SSOT
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";

export const TEMPLATE_BOILERPLATE_VERSION = "template-boilerplate-v1";

/** 문장당 허용 최대 반복 */
export const TEMPLATE_PHRASE_LIMITS = [
  { re: /기준이\s*달라집니다/g, max: 1, label: "기준이 달라집니다" },
  { re: /기준이\s*달라져요/g, max: 1, label: "기준이 달라져요" },
  { re: /안내\s*기준으로\s*정리했어요/g, max: 2, label: "안내 기준으로 정리했어요" },
  { re: /에서\s*실제로\s*비교해\s*보면/g, max: 1, label: "에서 실제로 비교해 보면" },
  { re: /비교해\s*보면\s*[^.]{0,40}기준이\s*달라/g, max: 1, label: "비교해 보면…기준이 달라" },
  { re: /비교·예약\s*판단이\s*수월/g, max: 1, label: "비교·예약 판단이 수월" },
  { re: /기준이\s*조금씩\s*보였/g, max: 1, label: "기준이 조금씩 보였" },
  { re: /기준이\s*잡혀요/g, max: 2, label: "기준이 잡혀요" },
  { re: /쿠션·좌판\s*높이/g, max: 0, label: "가구 쿠션·좌판" },
  { re: /검색만\s*하다\s*보면/g, max: 0, label: "검색만 하다 보면" },
  { re: /기준이\s*많아\s*막히/g, max: 0, label: "기준이 많아 막히" },
  { re: /로컬\s*매장\s*운영·예약\s*맥락/g, max: 0, label: "로컬 매장 운영·예약 맥락" },
  { re: /운영·예약\s*조건은\s*공식\s*안내\s*기준/g, max: 0, label: "운영·예약 공식 안내" },
  { re: /방문·구매\s*전\s*확인할\s*것/g, max: 1, label: "방문·구매 전 확인할 것" },
];

const EXPLAIN_TAIL_RES = [
  /\s*—\s*[^.]{8,}기준이\s*달라집니다\.?\s*$/i,
  /\s*—\s*[^.]{8,}기준이\s*달라져요\.?\s*$/i,
  /\s*—\s*[^.]{8,}에서\s*실제로\s*비교해\s*보면[^.]*\.?\s*$/i,
  /\s*—\s*[^.]{8,}안내\s*기준으로\s*정리했어요\.?\s*$/i,
];

export function countTemplatePhrase(full = "", pattern) {
  const re = pattern.re || pattern;
  const hay = String(full || "");
  const flags = re.flags?.includes("g") ? re.flags : `${re.flags || ""}g`;
  const globalRe = re.global ? re : new RegExp(re.source, flags);
  return (hay.match(globalRe) || []).length;
}

export function assessTemplateBoilerplateSpam(pack, opts = {}) {
  const full = typeof pack === "string" ? pack : getBlogFullText(pack);
  const issues = [];
  for (const rule of TEMPLATE_PHRASE_LIMITS) {
    const max = opts[`max_${rule.label}`] ?? rule.max;
    const count = countTemplatePhrase(full, rule);
    if (count > max) {
      issues.push({ type: "template_spam", phrase: rule.label, count, max });
    }
  }
  return {
    ok: issues.length === 0,
    issues,
    version: TEMPLATE_BOILERPLATE_VERSION,
  };
}

export function stripExplainBoilerplateTail(sentence = "") {
  let t = String(sentence || "").trim();
  if (!t) return "";
  for (const re of EXPLAIN_TAIL_RES) {
    t = t.replace(re, "").trim();
  }
  return t.replace(/\s*—\s*$/, "").trim();
}

export function softenFormalKoreanEnding(line = "") {
  return String(line || "")
    .replace(/\s+이다\.(\s|$)/g, "예요.$1")
    .replace(/\s+한다\.(\s|$)/g, "해요.$1")
    .replace(/\s+된다\.(\s|$)/g, "돼요.$1")
    .replace(/\s+있다\.(\s|$)/g, "있어요.$1")
    .replace(/\s+없다\.(\s|$)/g, "없어요.$1");
}

function splitBodySentences(text = "") {
  return String(text || "")
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8);
}

function dedupeTemplateSentencesInText(text = "", globalSeen = null) {
  const seen = globalSeen || new Set();
  const sentences = splitBodySentences(text);
  if (!sentences.length) return String(text || "").trim();

  const kept = [];
  for (const raw of sentences) {
    let s = stripExplainBoilerplateTail(softenFormalKoreanEnding(raw));
    if (!s || s.replace(/\s/g, "").length < 12) continue;

    const norm = s
      .replace(/\s+/g, " ")
      .replace(/카레클린트|에이스침대|그랩앤고플라워/gi, "BRAND")
      .slice(0, 72);
    const isBoilerplate =
      /기준이\s*달라집니다|안내\s*기준으로\s*정리했어요|에서\s*실제로\s*비교해\s*보면/.test(s);
    if (isBoilerplate && seen.has(norm)) continue;
    if (isBoilerplate) seen.add(norm);

    kept.push(s);
  }
  return kept.join(" ");
}

/** 초과 보일러플레이트 문장·꼬리 제거 */
export function stripTemplateBoilerplateFromPack(pack, input = {}) {
  if (!pack?.sections?.length) return pack;

  const phraseCounts = new Map();
  const globalSeen = new Set();

  const budgetFor = (label) => {
    const rule = TEMPLATE_PHRASE_LIMITS.find((r) => r.label === label);
    return rule?.max ?? 1;
  };

  const sections = (pack.sections || []).map((sec) => {
    const paras = String(sec.body || "")
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    const cleaned = paras
      .map((para) => dedupeTemplateSentencesInText(para, globalSeen))
      .map((para) => {
        const sents = splitBodySentences(para);
        const kept = [];
        for (const raw of sents) {
          let s = stripExplainBoilerplateTail(softenFormalKoreanEnding(raw));
          if (!s) continue;
          let drop = false;
          for (const rule of TEMPLATE_PHRASE_LIMITS) {
            if (!rule.re.test(s)) continue;
            const prev = phraseCounts.get(rule.label) || 0;
            const max = budgetFor(rule.label);
            const next = prev + (s.match(rule.re) || []).length;
            if (next > max) {
              s = s.replace(rule.re, "").trim();
              if (s.replace(/\s/g, "").length < 16) {
                drop = true;
                break;
              }
            }
            phraseCounts.set(rule.label, next);
          }
          if (!drop && s.replace(/\s/g, "").length >= 12) kept.push(s);
        }
        return kept.join(" ");
      })
      .filter((p) => p && p.replace(/\s/g, "").length >= 8);
    return { ...sec, body: cleaned.join("\n\n") };
  });

  let conclusion = pack.conclusion;
  if (conclusion) {
    conclusion = dedupeTemplateSentencesInText(conclusion, globalSeen);
  }

  return {
    ...pack,
    sections,
    conclusion,
    _meta: {
      ...(pack._meta || {}),
      templateBoilerplateSanitized: true,
      templateBoilerplateVersion: TEMPLATE_BOILERPLATE_VERSION,
    },
  };
}

export function buildExplainAxisLine(input = {}, slot = 0) {
  const topic = String(input.topic || input.mainKeyword || "이 주제").trim();
  const brand = String(input.brandName || "").trim();
  const key = resolveBriclogIndustryKey(input);

  const byIndustry = {
    furniture: brand
      ? [
          `${brand} 현장에서 ${topic}를 고를 때 체험 순서를 잡아 두면 비교가 수월해요.`,
          `${brand} 안내로 전시·일정·대상 모델을 먼저 맞춰 보세요.`,
          `직접 앉아 보면 ${topic} 쿠션·좌판 높이 차이가 체감돼요.`,
          `${brand} 쇼룸에서는 ${topic} 구성을 사진보다 먼저 확인하는 편이 낫습니다.`,
        ]
      : [],
    craft: brand
      ? [
          `${brand}에서 ${topic} 프로그램은 사전 예약·준비물부터 확인하는 편이 좋아요.`,
          `현장에서 체험 동선을 먼저 보면 ${topic} 선택이 수월해요.`,
          `${brand} 안내 기준으로 회차·인원 제한을 당일 확인해 보세요.`,
        ]
      : [],
    pension: brand
      ? [
          `${brand}에서 ${topic} 이용 시간·요금은 시즌마다 달라질 수 있어요.`,
          `방문 전 주차·영업 시간만 확인해 두면 ${topic} 상담이 편해요.`,
        ]
      : [],
  };

  const generic = brand
    ? [
        `${brand}에서 ${topic}를 고를 때 왜 운영 시간·예약 조건부터 확인하는지 먼저 짚어 두면 비교가 수월해요.`,
        `현장에서 직접 보면 ${topic} 구성이 사진과 다른 이유를 체감할 수 있어요.`,
        `${brand} 기준으로 ${topic} 일정·비용은 당일 안내를 따르는 편이 안전해요.`,
        `방문 전 ${topic} 관련 궁금한 점을 메모해 가면 상담이 빨라져요.`,
      ]
    : [
        `${topic}는 운영 일정과 이용 조건을 먼저 확인하는 게 좋아요.`,
        `직접 가 보면 ${topic} 체감 차이가 큽니다.`,
        `${topic} 비교는 동선·시설·예약 순으로 보면 덜 헷갈려요.`,
      ];

  const lines =
  byIndustry[key]?.length ? byIndustry[key] : generic.length ? generic : byIndustry.furniture;
  return lines[slot % lines.length];
}

/** place · instagram 필드 — 보일러플레이트·마크다운 누수 제거 */
export function stripChannelTemplateBoilerplate(text = "", input = {}) {
  let t = String(text || "").trim();
  if (!t) return t;

  for (const rule of TEMPLATE_PHRASE_LIMITS) {
    if (rule.max === 0) {
      t = t.replace(rule.re, " ");
    }
  }

  const zeroBan = TEMPLATE_PHRASE_LIMITS.filter((r) => r.max === 0).map((r) => r.re);
  let lineParts = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  lineParts = lineParts.filter((line) => !zeroBan.some((re) => re.test(line)));
  t = lineParts
    .join("\n")
    .replace(/\s*—\s*[^.\n]{0,48}기준으로\s*보면\s*비교·예약\s*판단이\s*수월[^.\n]*/gi, "")
    .replace(/\s*>\s*·/g, " ·")
    .replace(/^[·>\s]+/gm, "· ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const deduped = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const seen = new Set();
  const unique = [];
  for (const line of deduped) {
    const key = line.replace(/\s/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(line);
  }
  return unique.join("\n");
}
