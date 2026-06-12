/**
 * 꽃 추천 — 사람 칼럼형 서사 (카탈로그·만족도 템플릿 금지)
 */
import { isUnmannedFlowerShop, isFlowerRecommendationTopic } from "@/lib/product/flowerRecommendationProseEngine";
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine";
import { resolveBlogLengthTier } from "@/lib/constants";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { applyHumanColumnProsePass } from "@/lib/product/humanColumnProseEngine";
import { applyDuplicateKiller } from "@/lib/content/duplicateKillerEngine";
import {
  isFieldReviewSpeaker,
  buildSpeakerAlignedTitle,
} from "@/lib/persona/speakerVoiceLock";

/**
 * @param {object} p — deriveTopicWritingContext
 * @param {object} input
 * @returns {string[]}
 */
export function buildFlowerNarrativeParagraphs(p, input = {}) {
  const brand = p.brand || String(input.brandName || "").trim();
  const regionBit = p.regionBit || "";
  const unmanned = isUnmannedFlowerShop(input);
  const brandEditor = !isFieldReviewSpeaker(input);
  const blocks = [];

  blocks.push(
    brandEditor
      ? "여름이 되면 꽃도 계절을 꽤 많이 탑니다. 같은 꽃이라도 보관 환경에 따라 며칠 차이가 나기 때문에, 저희도 여름철에 자주 문의하는 꽃 구성을 정리해 봤습니다."
      : "여름이 되면 꽃도 계절을 꽤 많이 탑니다. 같은 꽃다발이라도 겨울에 오래 가던 꽃이 여름에는 금방 시들 수 있고, 반대로 여름에 더 예쁘게 보이는 꽃들도 있습니다."
  );

  if (brand) {
    if (brandEditor) {
      blocks.push(
        unmanned
          ? `${regionBit}${brand}는 24시간 무인으로 운영하고 있습니다. 늦은 시간 축하·선물용 꽃다발을 찾는 분들도 부담 없이 이용하실 수 있도록, 여름에 많이 고르는 수국·해바라기·거베라 조합을 미리 안내해 드립니다.`
          : `${regionBit}${brand}에서는 여름철 선물·축하용 꽃 문의가 많이 들어옵니다. 진열대 구성은 시즌마다 조금씩 달라지지만, 수국·해바라기·거베라는 꾸준히 많이 찾으시는 편입니다.`
      );
    } else {
      const visit =
        unmanned
          ? `최근 꽃 선물 때문에 알아보다가 ${regionBit}${brand}를 들르게 됐습니다. 24시간 무인으로 운영되는 곳이라 늦은 시간에도 부담 없이 방문할 수 있었고, 어떤 꽃들이 여름에 많이 활용되는지 살펴볼 수 있었습니다.`
          : `최근 꽃 선물 때문에 알아보다가 ${regionBit}${brand}를 들르게 됐습니다. 진열대에서 여름에 많이 찾는 꽃 구성을 살펴볼 수 있었습니다.`;
      blocks.push(visit);
    }
  }

  blocks.push(
    "수국은 한 다발만으로도 풍성해 보이는 느낌이 있어서 집들이나 개업 선물로 자주 활용됩니다. 공간에 두었을 때 존재감이 큰 편이라, 작은 꽃다발보다 조금 더 특별한 느낌을 주고 싶을 때 잘 어울립니다.",
    "해바라기도 여름철에 진열대에서 눈에 잘 들어오는 꽃입니다. 노란 색감 자체가 밝고 시원한 분위기를 만들어주기 때문에 생일이나 축하 꽃다발을 준비할 때 많이 찾게 됩니다. 사진으로 찍었을 때도 색감이 잘 살아나는 편입니다."
  );

  const gerberaTail =
    brandEditor && unmanned && brand
      ? " 저희 만원대 꽃다발 구성에서도 거베라 조합을 쉽게 맞출 수 있습니다."
      : !brandEditor && unmanned && brand
        ? ` ${brand}의 만원대 꽃다발 구성에서도 거베라 조합을 쉽게 찾아볼 수 있어, 가볍게 선물하기에도 괜찮아 보였습니다.`
        : "";
  blocks.push(
    `꽃을 자주 사보지 않은 분들은 어떤 꽃이 오래 가는지부터 고민하게 됩니다. 그럴 때는 거베라를 한번 고려해 볼 만한데, 관리 부담이 비교적 적은 편이라 처음 구매하는 분들도 부담 없이 고를 수 있습니다.${gerberaTail}`,
    "조금 더 부드럽고 로맨틱한 분위기를 원한다면 라넌큘러스도 좋은 선택입니다. 꽃잎이 여러 겹으로 겹쳐 피는 형태라 사진으로 봤을 때보다 실제로 보면 훨씬 풍성하게 느껴집니다. 기념일이나 감사 선물처럼 조금 더 분위기를 살리고 싶은 날 잘 어울리는 꽃입니다.",
    "여름 시즌에는 리시안셔스·안개꽃을 섞은 부드러운 톤도 많이 찾습니다. 가는 줄기와 작은 꽃이 특징이라 꽃다발 전체 분위기를 가볍게 만들어 줍니다.",
    "꽃 종류도 중요하지만 사실 여름에는 보관이 더 중요합니다. 직사광선이 강한 창가보다는 비교적 시원한 공간에 두는 것이 좋고, 물도 자주 확인해 주는 편이 꽃 상태를 오래 유지하는 데 도움이 됩니다. 같은 꽃이라도 어디에 두느냐에 따라 며칠 이상 차이가 나기도 합니다."
  );

  if (brand && unmanned) {
    blocks.push(
      brandEditor
        ? `${regionBit}${brand}는 키오스크에서 조합을 고른 뒤 픽업함에서 바로 받으실 수 있습니다. 여름철 꽃을 고르신다면 수국, 해바라기, 거베라, 라넌큘러스 정도는 한 번 비교해 보시길 권해 드립니다.`
        : `${regionBit}${brand}는 24시간 무인 운영이라 늦은 시간에도 꽃을 구매할 수 있었습니다. 여름철 꽃을 고를 예정이라면 수국, 해바라기, 거베라, 라넌큘러스 정도는 한 번 비교해 보시는 것을 추천드립니다.`
    );
  } else if (brand && brandEditor) {
    blocks.push(
      `${regionBit}${brand}에서 여름철 꽃을 고를 때는 색감과 줄기 상태를 먼저 보시면 이후 선택이 편합니다. 궁금한 점은 매장 안내를 참고해 주세요.`
    );
  } else if (brand) {
    blocks.push(
      `${regionBit}${brand}에서 여름철 꽃을 고를 때는 진열대 색감과 줄기 상태를 먼저 보면 이후 선택이 편합니다.`
    );
  }

  return blocks;
}

export function buildFlowerRecommendationSectionHeadings(_input = {}, count = 5) {
  return [
    "여름에는 어떤 꽃을 많이 고를까?",
    "꽃을 처음 산다면 거베라도 괜찮습니다",
    "기념일이라면 라넌큘러스",
    "여름철 꽃은 보관도 중요합니다",
    "마무리",
  ].slice(0, Math.max(1, count));
}

/**
 * 꽃 추천 — 조사·서사형 editorial pack (researchGrounded 대체)
 */
export function buildFlowerRecommendationEditorialPack(input = {}) {
  const p = deriveTopicWritingContext(input);
  const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
  const sectionCount = tier.key === "short" ? 4 : 5;
  const headings = buildFlowerRecommendationSectionHeadings(input, sectionCount);
  const paras = buildFlowerNarrativeParagraphs(p, input);
  const brandEditor = !isFieldReviewSpeaker(input);
  const facet = p.topicFacet || input.topic || "여름철 꽃 추천";

  const sections = headings.map((heading, i) => {
    const chunk = [];
    for (let j = i; j < paras.length; j += headings.length) {
      chunk.push(paras[j]);
    }
    return {
      heading,
      body: chunk.filter(Boolean).join("\n\n") || paras[i] || paras[0] || "",
    };
  });

  const brandLabel = p.brand || String(input.brandName || "").trim();
  const closeLine = brandEditor
    ? `${brandLabel}${p.regionBit ? ` ${String(input.region || "").trim()}` : ""}에서 ${facet}를 고르실 때 궁금한 점은 매장 안내를 참고해 주세요.`
    : `${p.regionBit}${brandLabel}에서 ${facet}를 고를 때는 수국·해바라기·거베라·라넌큘러스를 한 번 비교해 보시면 좋습니다.`;

  let pack = {
    title: brandEditor
      ? buildSpeakerAlignedTitle(input, "brand_editor")
      : `${p.regionBit}${p.brand}, ${facet} 직접 보고 정리해봤습니다`.replace(/\s+/g, " ").trim(),
    representativeTitle: brandEditor
      ? buildSpeakerAlignedTitle(input, "brand_editor")
      : `${p.regionBit}${p.brand}, ${facet} 직접 보고 정리해봤습니다`.replace(/\s+/g, " ").trim(),
    sections,
    conclusion: closeLine,
    hashtags: [],
    _meta: {
      flowerRecommendationEditorial: true,
      missionProseFallback: true,
    },
  };

  if (isFlowerRecommendationTopic(input)) {
    pack = applyHumanColumnProsePass(pack, input, { force: true });
    pack = applyDuplicateKiller(pack, input);
  }
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      flowerRecommendationEditorial: true,
      missionProseFallback: true,
      lengthTierMet: countBlogBodyCharsWithSpaces(pack) >= tier.min,
    },
  };
}
