/**
 * 꽃 추천 — 사람 칼럼형 서사 (카탈로그·만족도 템플릿 금지)
 */
import { isUnmannedFlowerShop, isFlowerRecommendationTopic } from "@/lib/product/flowerRecommendationProseEngine";
import { deriveTopicWritingContext, topicRaw } from "@/lib/content/topicFacetEngine";
import { resolveBlogLengthTier } from "@/lib/constants";
import { countBlogBodyChars, countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { applyHumanColumnProsePass } from "@/lib/product/humanColumnProseEngine";
import { applyDuplicateKiller } from "@/lib/content/duplicateKillerEngine";
import {
  isFieldReviewSpeaker,
  buildSpeakerAlignedTitle,
} from "@/lib/persona/speakerVoiceLock";
import { resolvePersonaEngineProfile } from "@/lib/persona/personaEngineProfile";

/**
 * @param {object} p — deriveTopicWritingContext
 * @param {object} input
 * @returns {string[]}
 */
export function buildFlowerNarrativeParagraphs(p, input = {}) {
  const brand = p.brand || String(input.brandName || "").trim();
  const regionBit = p.regionBit || "";
  const region = String(input.region || "").trim();
  const unmanned = isUnmannedFlowerShop(input);
  const brandEditor = !isFieldReviewSpeaker(input);
  const topicLine = String(input.topic || topicRaw(input) || "").trim();
  const seasonTopic = /추천|여름|봄|가을|겨울|시즌/.test(topicLine);
  const occasionTopic = /어버이|카네|꽃다발|예약|배송|기념|생일|개업|축하/.test(topicLine);

  if (!seasonTopic && occasionTopic) {
    return buildFlowerOccasionParagraphs({
      brand,
      region,
      regionBit,
      topicLine,
      unmanned,
      brandEditor,
    });
  }

  const blocks = [];

  blocks.push(
    brandEditor
      ? seasonTopic
        ? "여름이 되면 꽃도 계절을 꽤 많이 탑니다. 같은 꽃이라도 보관 환경에 따라 며칠 차이가 나기 때문에, 저희도 여름철에 자주 문의하는 꽃 구성을 정리해 봤습니다."
        : `${topicLine ? `${topicLine} 관련 문의` : "꽃 선물·예약 문의"}가 늘어나는 시기입니다. ${topicLine ? `${topicLine}을(를) 준비하실 때 ` : ""}꽃 종류와 보관, 예약·배송 방식을 함께 정리해 봤습니다.`
      : seasonTopic
        ? "여름이 되면 꽃도 계절을 꽤 많이 탑니다. 같은 꽃다발이라도 겨울에 오래 가던 꽃이 여름에는 금방 시들 수 있고, 반대로 여름에 더 예쁘게 보이는 꽃들도 있습니다."
        : `${topicLine ? `${topicLine} 때문에 ` : ""}꽃집을 알아보게 됐습니다. 진열대 구성과 예약·배송 안내를 함께 확인해 보았습니다.`
  );

  if (topicLine && /어버이|카네|꽃다발|예약|배송|기념/.test(topicLine)) {
    blocks.push(
      brandEditor
        ? `${topicLine} 문의가 늘어날 때는 카네이션·거베라·튤립처럼 메시지에 맞는 꽃과 리본 구성을 함께 정리해 드립니다. ${regionBit}${brand ? `${brand} ` : ""}에서는 예약·배송 가능 시간과 포장 옵션을 매장 안내로 확인하실 수 있습니다.`
        : `${topicLine} 때문에 ${regionBit}${brand}를 알아보게 됐습니다. 진열대에서 카네이션·거베라 조합과 예약·배송 안내를 함께 확인할 수 있었습니다.`
    );
  }

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

function buildFlowerOccasionParagraphs({
  brand,
  region,
  regionBit,
  topicLine,
  unmanned,
  brandEditor,
}) {
  const blocks = [
    brandEditor
      ? `${topicLine} 관련 문의가 늘어나는 시기입니다. ${topicLine}을(를) 준비하실 때는 꽃 종류·리본·카드 메시지와 함께 예약·배송 시간을 확인하는 편이 좋습니다.`
      : `${topicLine} 때문에 ${regionBit}${brand}를 알아보게 됐습니다. 진열대 구성과 예약·배송 안내를 함께 확인해 보았습니다.`,
    brandEditor
      ? `${topicLine}에는 카네이션·거베라·튤립처럼 메시지에 맞는 꽃을 많이 고르십니다. 색감과 줄기 상태, 포장 옵션을 함께 보면 선택이 빨라집니다.`
      : `카네이션과 거베라 조합이 ${topicLine}에 자주 언급돼 눈에 들어왔습니다. 리본 색과 포장 방식도 함께 비교해 보았습니다.`,
    brandEditor
      ? `카네이션은 ${topicLine}에 자주 쓰이는 꽃입니다. 붉은·분홍·흰색 톤에 따라 분위기가 달라지므로, 받는 분의 취향을 먼저 떠올려 보시면 좋습니다.`
      : `카네이션 색감을 비교해 보니 ${topicLine} 분위기에 맞는 톤을 고르는 기준이 조금 분명해졌습니다.`,
    brandEditor
      ? `거베라는 관리 부담이 비교적 적어 ${topicLine} 꽃다발에 자주 포함됩니다. 밝은 색감 덕분에 사진으로 전달할 때도 분위기가 잘 살아납니다.`
      : `거베라가 들어간 구성은 ${topicLine} 선물로 무난해 보였습니다. 줄기 상태와 포장 마감도 함께 확인했습니다.`,
    brandEditor
      ? `예약·배송 문의가 많을 때는 희망 일시와 수령 방법(매장 픽업·배송)을 미리 정리해 두면 상담이 수월합니다. ${region ? `${region} ` : ""}근처에서 당일 수령이 필요한지, 포장만 맡길지에 따라 준비 시간이 달라집니다.`
      : `예약 가능 시간과 배송 범위를 확인해 보니, ${topicLine} 일정에 맞춰 준비하려면 하루 이상 여유를 두는 편이 안전해 보였습니다.`,
    brandEditor
      ? `꽃다발은 받는 분의 취향과 전달 방식(직접 전달·배송)에 따라 구성이 달라집니다. ${topicLine}에 맞는 톤을 원하시면 색감 레퍼런스 사진을 함께 알려 주시면 도움이 됩니다.`
      : `직접 전달과 배송 중 무엇이 우선인지 정해 두니 ${topicLine} 준비 기준이 조금 분명해졌습니다.`,
    brandEditor
      ? `포장·리본·메시지 카드는 ${topicLine} 인상을 좌우하는 요소입니다. 문구는 짧게, 꽃 색과 대비되지 않는 톤으로 맞추면 전체 구성이 정돈돼 보입니다.`
      : `포장과 메시지 카드 옵션을 함께 볼 수 있어 ${topicLine} 준비 시 참고할 만했습니다.`,
    brandEditor
      ? `${regionBit}${brand ? `${brand} ` : ""}에서는 ${topicLine} 관련 꽃다발·포장·예약·배송 안내를 매장 기준으로 준비하고 있습니다.`
      : `${regionBit}${brand}에서 ${topicLine} 관련 안내를 확인했습니다.`,
  ];

  if (brand && unmanned) {
    blocks.push(
      brandEditor
        ? `${regionBit}${brand}는 24시간 무인으로 운영하고 있어, ${topicLine} 준비가 늦은 시간에 필요한 경우에도 부담 없이 이용하실 수 있습니다. 키오스크에서 조합을 고른 뒤 픽업함에서 받을 수 있습니다.`
        : `${regionBit}${brand}는 24시간 무인이라 ${topicLine} 준비를 늦은 시간에도 확인할 수 있었습니다.`
    );
  } else if (brand) {
    blocks.push(
      brandEditor
        ? `${regionBit}${brand}에서 ${topicLine} 꽃다발을 준비하실 때는 진열대 색감·줄기 상태·포장 옵션을 함께 확인해 보시면 좋습니다.`
        : `${regionBit}${brand} 진열대에서 ${topicLine}에 맞는 구성을 비교해 보았습니다.`
    );
  }

  blocks.push(
    brandEditor
      ? `${region ? `${region} ` : ""}${topicLine} 준비 시 궁금한 점은 ${brand || "매장"} 안내를 참고해 주세요.`
      : `${regionBit}${brand}에서 ${topicLine} 관련 안내를 확인해 보시면 좋습니다.`
  );

  return blocks.filter(Boolean);
}

export function buildFlowerRecommendationSectionHeadings(input = {}, count = 5) {
  const topicLine = String(input?.topic || topicRaw(input) || "").trim();
  const occasionTopic = /어버이|카네|꽃다발|예약|배송|기념|생일|개업|축하/.test(topicLine);
  const pool = occasionTopic
    ? [
        "기념일 꽃다발은 어떻게 고를까?",
        "예약과 배송 안내",
        "포장·메시지 카드 팁",
        "마무리",
      ]
    : [
        "여름에는 어떤 꽃을 많이 고를까?",
        "꽃을 처음 산다면 거베라도 괜찮습니다",
        "기념일이라면 라넌큘러스",
        "여름철 꽃은 보관도 중요합니다",
        "마무리",
      ];
  return pool.slice(0, Math.max(1, count));
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
  const profile = resolvePersonaEngineProfile(input);
  const fieldTitle = `${p.regionBit}${p.brand}, ${facet} 직접 보고 정리해봤습니다`.replace(/\s+/g, " ").trim();
  const editorTitle =
    buildSpeakerAlignedTitle(input, profile.archetype) ||
    `${p.brand || String(input.brandName || "").trim()}, ${facet}`;

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
    title: brandEditor ? editorTitle : fieldTitle,
    representativeTitle: brandEditor ? editorTitle : fieldTitle,
    sections,
    conclusion: closeLine,
    hashtags: [],
    _meta: {
      flowerRecommendationEditorial: true,
      missionProseFallback: true,
    },
  };

  pack = applyHumanColumnProsePass(pack, input, { force: true });
  pack = applyDuplicateKiller(pack, input);
  if (countBlogBodyCharsWithSpaces(pack) < Math.round(tier.min * 0.45)) {
    const tail = pack.sections[pack.sections.length - 1];
    if (tail) {
      pack.sections[pack.sections.length - 1] = {
        ...tail,
        body: `${tail.body}\n\n${paras.slice(-2).join("\n\n")}`.trim(),
      };
    }
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
