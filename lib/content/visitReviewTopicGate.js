/**
 * 방문 후기 주제 — 정보형·제품 가이드 템플릿 오염 차단
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import {
  deriveTopicWritingContext,
  isVisitReviewTopicInput,
  topicRaw,
  topicWritingFacet,
} from "@/lib/content/topicFacetEngine";
import { getIndustryFlavorForInput, resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import { buildMissionConclusionLine } from "@/lib/product/missionProseEngine";
import { buildTopicArcSectionHeadings } from "@/lib/content/humanColumnPolishEngine";
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";

const PRODUCT_INFO_PAD_RES = [
  /성분·보관·선물/,
  /성분·원재료·보관/,
  /첨가물·알레르기\s*표기/,
  /유통기한·냉장/,
  /선물·반려·집에서\s*먹기/,
  /원재료\s*비율/,
  /라벨을\s*먼저\s*확인/,
];

const INFO_HEADING_RES = [
  /알아보게\s*된\s*이유/,
  /고를\s*때\s*체크\s*포인트/,
  /성분·보관·선물\s*목적/,
  /한눈에\s*보기/,
];

const GENERIC_CAFE_GUIDE_RES = [
  /카공·모임\s*자리/,
  /브런치\s*메뉴를\s*찾다/,
  /콘센트부터\s*먼저\s*걱정/,
];

const VISIT_SUFFIX_IN_HEADING_RE = /다녀(?:왔|온|갔)어요|솔직\s*후기\s*$/;

function filterVisitParagraph(text = "") {
  const t = String(text || "").trim();
  if (!t) return "";
  if (PRODUCT_INFO_PAD_RES.some((re) => re.test(t))) return "";
  return t;
}

export function buildVisitReviewParagraphs(input = {}, need = 6) {
  const p = deriveTopicWritingContext(input);
  const subject = topicWritingFacet(input) || "이용";
  const { flavor } = getIndustryFlavorForInput(input);
  const key = resolveBriclogIndustryKey(input);
  const pool = [
    `${p.regionBit}${p.brand} ${subject} — ${flavor.spaceWord} 분위기와 이용 조건을 당일 기준으로 정리해 봤어요.`,
    `처음 방문 전에는 입장·동반 규모·좌석 분위기부터 확인해 두면 당일 동선이 수월해요.`,
    `${flavor.productWord}는 현장에서 본 구성과 안내를 기준으로 비교했어요.`,
    `메뉴·이용 시간·주차 안내는 매장에서 확인한 범위만 메모해 두었어요.`,
    `혼잡한 시간대와 한산한 시간대 분위기 차이도 같이 봤어요.`,
    `궁금한 점은 ${p.regionBit}${p.brand} 문의로 다시 확인하는 편이 정확해요.`,
  ];

  if (key === "pet_cafe") {
    pool.unshift(
      `반려견과 함께 앉기 좋은 좌석·실내 놀이 구역을 먼저 둘러봤어요.`,
      `입장 조건·몸무게·리드줄 안내는 방문 전에 확인해 두는 편이 좋았어요.`
    );
  } else if (key === "cafe") {
    pool.unshift(
      `좌석·분위기·메뉴 구성을 구역별로 나눠 보며 비교했어요.`,
      `테이크아웃·매장 이용 안내는 메뉴판 옆 표기를 먼저 확인했어요.`
    );
  }

  return pool.slice(0, Math.max(need, 2));
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function detectVisitReviewTemplateContamination(pack, input = {}) {
  if (!isVisitReviewTopicInput(input) || !pack) {
    return { ok: true, violations: [] };
  }

  const full = [
    pack.title,
    pack.representativeTitle,
    getBlogFullText(pack),
    pack.conclusion,
    ...(pack.sections || []).map((s) => s.heading),
  ].join("\n");

  const violations = [];
  const key = resolveBriclogIndustryKey(input);

  for (const re of PRODUCT_INFO_PAD_RES) {
    if (re.test(full)) {
      violations.push({ type: "product_info_pad", pattern: re.source });
    }
  }

  const headings = (pack.sections || []).map((s) => String(s.heading || "")).join("\n");
  if (INFO_HEADING_RES.some((re) => re.test(headings))) {
    violations.push({ type: "informational_heading" });
  }

  if (VISIT_SUFFIX_IN_HEADING_RE.test(headings)) {
    violations.push({ type: "visit_suffix_heading" });
  }

  if (key === "pet_cafe" && GENERIC_CAFE_GUIDE_RES.some((re) => re.test(full))) {
    violations.push({ type: "cafe_guide_on_pet_cafe" });
  }

  const rawTopic = topicRaw(input);
  if (rawTopic && full.includes(`왜 ${koreanObjectParticle(rawTopic)} 찾게 되는가`)) {
    violations.push({ type: "verbatim_visit_topic_why_heading" });
  }

  return { ok: violations.length === 0, violations };
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function rebuildVisitReviewAccuratePack(pack, input = {}) {
  const p = deriveTopicWritingContext(input);
  const subject = topicWritingFacet(input) || "이용";
  const title = `${p.regionBit}${p.brand} ${subject} 방문 후기`.replace(/\s+/g, " ").trim();
  const qa = buildVisitReviewParagraphs(input, 6);
  const headings = buildTopicArcSectionHeadings(input, 3);

  const sections = [
    { heading: headings[0] || `${subject}, 찾게 된 계기`, body: qa.slice(0, 2).join("\n\n") },
    { heading: headings[1] || `${p.regionBit}${p.brand} 직접 다녀온 이야기`, body: qa.slice(2, 4).join("\n\n") },
    { heading: headings[2] || `${subject} — 당일 확인한 포인트`, body: qa.slice(4, 6).join("\n\n") },
  ].map((sec) => ({
    ...sec,
    body: sec.body
      .split(/\n\n+/)
      .map((para) => filterVisitParagraph(para))
      .filter(Boolean)
      .join("\n\n"),
  }));

  return {
    ...pack,
    title,
    representativeTitle: title,
    sections,
    conclusion: buildMissionConclusionLine(p, input, subject),
    hashtags: [],
    _meta: {
      ...(pack._meta || {}),
      visitReviewAccurateRebuild: true,
    },
  };
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function applyVisitReviewTopicPackGate(pack, input = {}) {
  if (!isVisitReviewTopicInput(input) || !pack?.sections?.length) return pack;

  const key = resolveBriclogIndustryKey(input);
  const headings = buildTopicArcSectionHeadings(input, pack.sections.length);
  let slot = 0;
  const replacements = buildVisitReviewParagraphs(input, 12);

  const sections = pack.sections.map((sec, i) => {
    let heading = String(sec.heading || "").trim();
    if (
      !heading ||
      INFO_HEADING_RES.some((re) => re.test(heading)) ||
      VISIT_SUFFIX_IN_HEADING_RE.test(heading) ||
      /^왜\s+.+찾게\s*되는가/.test(heading)
    ) {
      heading = headings[i] || headings[headings.length - 1] || `${topicWritingFacet(input)} 정리`;
    }

    const paras = String(sec.body || "")
      .split(/\n\n+/)
      .map((p) => filterVisitParagraph(p))
      .filter(Boolean);

    while (paras.length < 2 && slot < replacements.length) {
      paras.push(replacements[slot]);
      slot += 1;
    }

    let body = paras.join("\n\n").trim();
    if (key === "pet_cafe" && GENERIC_CAFE_GUIDE_RES.some((re) => re.test(body))) {
      body = replacements.filter((p) => !GENERIC_CAFE_GUIDE_RES.some((re) => re.test(p))).slice(0, 3).join("\n\n");
    }

    return { ...sec, heading, body };
  });

  const p = deriveTopicWritingContext(input);
  const subject = topicWritingFacet(input) || "이용";
  let conclusion = String(pack.conclusion || "").trim();
  if (!conclusion || PRODUCT_INFO_PAD_RES.some((re) => re.test(conclusion))) {
    conclusion = buildMissionConclusionLine(p, input, subject);
  }

  return {
    ...pack,
    sections,
    conclusion,
    _meta: {
      ...(pack._meta || {}),
      visitReviewTopicPackGate: true,
    },
  };
}
