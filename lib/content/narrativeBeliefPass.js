/**
 * NARRATIVE BELIEF PASS — FAQ/checklist → 현장 서사 (로컬 1-pass, LLM 없음)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine";
import { getIndustryFlavor } from "@/lib/prompts/engine/industryFlavor";
import { resolveResearchCategoryKey } from "@/lib/research/searchExpansionEngine";
import {
  scoreChecklistVoice,
  CONFIRM_ONLY_RES,
  REAL_FIELD_SMELL_RES,
} from "@/lib/product/checklistVoiceEngine";
import {
  HUMAN_BELIEF_MIN_SCORE,
  isHumanBeliefEnforced,
  scoreHumanBelief,
} from "@/lib/product/humanBeliefEngine";

const META_SENTENCE_RES = [
  /지역명은\s*자연스럽게/,
  /고유\s*입력\s*기반/,
  /동네\s*방문\s*맥락/,
  /^입력된\s*범위\s*안에서/,
  /방문·체험·비교를\s*전제로/,
  /글을\s*읽는\s*경우/,
  /공식·매장\s*안내\s*기준/,
  /안내\s*기준으로\s*확인/,
  /브랜드\s*시선에서\s*정리/,
  /흐름이\s*분명해/,
  /사전\s*확인이\s*필요/,
];

function inputCtx(ctx = {}) {
  const input = ctx.input || ctx;
  const p = deriveTopicWritingContext(input);
  const categoryKey = resolveResearchCategoryKey(input);
  return {
    brand: p.brand || "브랜드",
    region: p.region || "",
    topic: p.topic || "이용",
    topicRaw: p.topicRaw || p.avoidVerbatim || "",
    topicObj: p.topicObj || koreanObjectParticle(p.topic || "이용"),
    industry: input.industry || input.industryLabel || "",
    categoryKey,
    flavor: getIndustryFlavor(categoryKey),
    facts: (input.researchFacts || [])
      .map((f) => String(f?.fact || f?.text || f || "").trim())
      .filter(Boolean)
      .slice(0, 4),
  };
}

function fixParticleErrors(text) {
  let next = String(text || "");
  return next.replace(/([가-힣]{2,18})을(\s*고)/g, (match, noun, tail) => {
    const correct = koreanObjectParticle(noun);
    if (correct.endsWith("를") && match.includes(`${noun}을`)) return `${correct}${tail}`;
    return match;
  });
}

function isMetaSentence(s) {
  return META_SENTENCE_RES.some((re) => re.test(String(s || "").trim()));
}

function isConfirmOnly(s) {
  const t = String(s || "").trim();
  return CONFIRM_ONLY_RES.some((re) => re.test(t));
}

function hasFieldSmell(s) {
  return REAL_FIELD_SMELL_RES.some((re) => re.test(String(s || "")));
}

function reframeConfirmSentence(s, p) {
  const t = String(s || "").trim();
  if (!t || isMetaSentence(t)) return null;
  if (hasFieldSmell(t) && !/확인하세요\.?$/.test(t)) return t;

  if (/행사|할인|프로모|증정/.test(t)) {
    const fact = p.facts.find((f) => /행사|할인|월/.test(f));
    return fact
      ? `${p.region ? `${p.region} ` : ""}${p.brand} 매장에서 ${fact} 조건을 당일 안내로 짚어 봤습니다.`
      : `${p.region ? `${p.region} ` : ""}${p.brand} 매장에서 행사·할인 조건을 상담 때 같이 정리했습니다.`;
  }
  if (/견적|가격|결제|카드/.test(t)) {
    return `견적은 본체·설치·옵션으로 나눠 받아 메모해 두었습니다.`;
  }
  if (/설치|배송|통로|엘리베이터|회수|철거/.test(t)) {
    return `설치 일정과 통로·층간 이동 조건은 주문 전에 매장과 맞춰 봤습니다.`;
  }
  if (/체험|예약|누워|각도|지지|소음|리모컨/.test(t)) {
    if (p.categoryKey === "flower") {
      return `${p.region ? `${p.region} ` : ""}${p.brand}에서 ${p.topic} 상태·포장·리본을 직접 확인했습니다.`;
    }
    if (p.categoryKey === "hospital") {
      return `${p.region ? `${p.region} ` : ""}${p.brand} 상담 전에 준비물·일정을 정리해 두었습니다.`;
    }
    return `${p.region ? `${p.region} ` : ""}${p.brand} ${p.flavor.spaceWord || "매장"}에서 ${p.topicObj} 직접 확인해 봤습니다.`;
  }
  if (/A\/S|보증|교환|반품/.test(t)) {
    return `보증·교환 범위는 상담 때 안내 문서로 같이 확인했습니다.`;
  }
  if (/주차|영업|휴무|대중교통/.test(t)) {
    return `${p.region ? `${p.region} ` : ""}매장 주차·영업 시간은 방문 전에 전화로 확인하고 갔습니다.`;
  }
  if (/비교|모델|라인업|스펙/.test(t)) {
    return `모델별 차이는 매장에서 표로 받아 두고, ${p.topicObj} 고를 때 기준으로 삼았습니다.`;
  }
  if (/메모|수면\s*자세|예산/.test(t)) {
    return `체험하면서 수면 자세·불편했던 점을 메모해 두니 상담이 빨라졌습니다.`;
  }
  if (/확인하세요|권합니다|필요합니다\.?$/.test(t)) {
    return null;
  }
  return t;
}

function isBrokenGrammar(s) {
  return (
    /(?:을|를)\s*가격은|브랜드\s*시선에서\s*정리|흐름이\s*분명해|모션베드을|특별할인를/.test(
      String(s || "")
    )
  );
}

function rewriteSectionBody(body, p, maxConfirm = 1) {
  const sentences = splitKoreanSentences(body).filter(
    (s) =>
      s.trim().replace(/\s/g, "").length >= 8 &&
      !isMetaSentence(s) &&
      !isBrokenGrammar(s)
  );
  const kept = [];
  let confirmKept = 0;

  for (const raw of sentences) {
    let s = raw.trim();
    if (isConfirmOnly(s)) {
      const reframed = reframeConfirmSentence(s, p);
      if (!reframed) continue;
      s = reframed;
      if (isConfirmOnly(s)) {
        if (confirmKept >= maxConfirm) continue;
        confirmKept += 1;
      }
    } else if (/확인하세요\.?$/.test(s)) {
      s = reframeConfirmSentence(s, p) || s.replace(/확인하세요\.?$/, "직접 짚어 봤습니다.");
    }
    const key = s.replace(/\s/g, "").slice(0, 40);
    if (kept.some((k) => k.replace(/\s/g, "").slice(0, 40) === key)) continue;
    kept.push(s);
  }

  return fixParticleErrors(kept.join("\n\n").trim());
}

function buildFieldOpener(p) {
  const regionBit = p.region ? `${p.region} ` : "";
  const space = p.flavor.spaceWord || "매장";
  const visit = p.flavor.visitReason || "방문·상담";
  let lines;

  if (p.categoryKey === "furniture") {
    const exhibition = /전시|오픈|소식|런칭|쇼케이스/i.test(`${p.topicRaw || ""} ${p.topic || ""}`);
    if (exhibition) {
      lines = [
        `${regionBit}${p.brand} 쇼룸에서 ${p.topic} 전시·체험 구성을 직접 확인했습니다.`,
        `왜 ${p.topicObj} 찾게 됐는지 — ${visit} 전에 전시 일정·대상 모델부터 정리했습니다.`,
      ];
    } else {
      lines = [
        `${regionBit}${p.brand} ${space}에서 ${p.topicObj} 직접 누워보며 각도·지지감을 비교했습니다.`,
        `허리·숙면 불편이 길어지면서 침대부터 손대게 됐고, 왜 ${p.topicObj} 찾게 됐는지부터 정리해 봤습니다.`,
      ];
    }
  } else if (p.categoryKey === "flower") {
    lines = [
      `${regionBit}${p.brand}에 직접 가서 ${p.topic} 생화 상태·포장을 확인했습니다.`,
      `${visit} 때문에 ${p.topicObj} 찾게 됐고, 색·리본·메시지 카드까지 비교해 봤습니다.`,
    ];
  } else if (p.categoryKey === "hospital") {
    lines = [
      `${regionBit}${p.brand}에 직접 문의하기 전에 증상·일정부터 정리해 봤습니다.`,
      `왜 ${p.topicObj} 찾게 됐는지 — ${visit} 맥락에서부터 적어 봤습니다.`,
    ];
  } else if (p.categoryKey === "marketing" || p.categoryKey === "saas") {
    lines = [
      `${regionBit}${p.brand} 담당자와 직접 미팅하며 ${p.topic} 도입 흐름을 짚어 봤습니다.`,
      `왜 ${p.topicObj} 찾게 됐는지 — 내부 기준부터 메모해 뒀습니다.`,
    ];
  } else if (p.categoryKey === "construction") {
    lines = [
      `${regionBit}${p.brand} 현장·쇼룸을 직접 보고 ${p.topic} 시공 범위를 확인했습니다.`,
      `왜 ${p.topicObj} 찾게 됐는지 — 공간·예산 기준부터 정리했습니다.`,
    ];
  } else if (p.categoryKey === "cafe") {
    lines = [
      `${regionBit}${p.brand}에 앉아 ${p.topic} 맛·좌석·분위기를 직접 확인했습니다.`,
      `${visit} 때문에 ${p.topicObj} 검색하게 됐고, 메뉴·혼잡 시간을 메모해 뒀습니다.`,
    ];
  } else {
    lines = [
      `${regionBit}${p.brand} ${space}에서 ${p.topicObj} 직접 확인해 봤습니다.`,
      `왜 ${p.topicObj} 찾게 됐는지 — ${visit} 때문에 상담 전에 기준부터 정리했습니다.`,
    ];
  }

  if (p.facts[0]) {
    lines.push(
      `${p.facts[0]}${/[.!?]$/.test(p.facts[0]) ? "" : "."} 조건은 당일 안내에서 같이 짚어 봤습니다.`
    );
  }
  return lines.join(" ");
}

function needsFieldOpener(fullText) {
  const head = String(fullText || "").slice(0, 500);
  let hits = 0;
  for (const re of REAL_FIELD_SMELL_RES) {
    if (re.test(head)) hits += 1;
  }
  return hits < 2;
}

/**
 * @param {object} pack
 * @param {object} ctx
 */
export function applyNarrativeBeliefPass(pack, ctx = {}) {
  if (!isHumanBeliefEnforced() || !pack?.sections?.length) return pack;

  const p = inputCtx(ctx);
  let sections = (pack.sections || []).map((sec) => ({
    ...sec,
    body: rewriteSectionBody(sec?.body || "", p),
  }));

  const fullBefore = getBlogFullText({ ...pack, sections });
  if (needsFieldOpener(fullBefore) && sections[0]?.body) {
    const opener = buildFieldOpener(p);
    sections = sections.map((sec, i) =>
      i === 0
        ? { ...sec, body: `${opener}\n\n${sec.body}`.trim() }
        : sec
    );
  }

  for (const fact of p.facts.slice(1, 3)) {
    const needle = fact.slice(0, 6);
    if (fullBefore.includes(needle)) continue;
    const idx = Math.min(2, sections.length - 1);
    if (sections[idx]?.body) {
      sections[idx] = {
        ...sections[idx],
        body: `${sections[idx].body}\n\n${fact}${/[.!?]$/.test(fact) ? "" : "."}`.trim(),
      };
    }
  }

  sections = sections.filter((s) => s.body?.replace(/\s/g, "").length >= 30);
  if (!sections.length) return pack;

  let next = {
    ...pack,
    sections,
    _meta: {
      ...(pack._meta || {}),
      narrativeBeliefPass: true,
    },
  };

  let afterScore = scoreHumanBelief(
    getBlogFullText(next),
    ctx.input || ctx,
    next
  );
  if (
    !afterScore.ok &&
    afterScore.issues.includes("field_smell_low") &&
    sections[0]?.body
  ) {
    sections = [
      {
        ...sections[0],
        body: `${buildFieldOpener(p)}\n\n${sections[0].body}`.trim(),
      },
      ...sections.slice(1),
    ];
    next = { ...next, sections };
    afterScore = scoreHumanBelief(getBlogFullText(next), ctx.input || ctx, next);
  }

  return {
    ...next,
    _meta: {
      ...next._meta,
      narrativeBeliefPass: {
        applied: true,
        scoreAfter: afterScore.score,
        okAfter: afterScore.ok,
      },
    },
  };
}

export function shouldApplyNarrativeBeliefPass(pack, ctx = {}) {
  if (!isHumanBeliefEnforced() || !pack?.sections?.length) return false;
  const input = ctx.input || ctx;
  const full = getBlogFullText(pack);
  if (/방문·체험·비교를\s*전제로|공식·매장\s*안내\s*기준|모션베드을/.test(full)) {
    return true;
  }
  const checklist = scoreChecklistVoice(full, pack);
  if (checklist.confirmRatio >= 0.12 || checklist.templateHits >= 1) return true;
  const belief = scoreHumanBelief(full, input, pack);
  if (belief.issues.includes("ad_smell_high") || belief.issues.includes("brochure_voice")) {
    return true;
  }
  return (
    !belief.ok ||
    belief.score < HUMAN_BELIEF_MIN_SCORE + 3 ||
    belief.issues.includes("field_smell_low")
  );
}
