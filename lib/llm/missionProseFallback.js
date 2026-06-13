/**
 * Mission UI fallback — coverage 슬롯 덤프 대신 칼럼형 솔직 후기 + tier 글자수
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { resolveBlogLengthTier } from "@/lib/constants";
import {
  deriveTopicWritingContext,
  isInformationalTopicInput,
  isVisitReviewTopicInput,
  topicRaw,
  topicWritingFacet,
} from "@/lib/content/topicFacetEngine";
import { buildHumanClickTitles } from "@/lib/content/humanTitleEngine";
import { buildSignatureWhyHeading } from "@/lib/product/signatureWritingEngine";
import { buildHumanStoryProblemOpening } from "@/lib/product/humanStoryEngine";
import { scoreChecklistVoice } from "@/lib/product/checklistVoiceEngine";
import {
  buildMissionConclusionLine,
  buildMissionExperienceCatalog,
  deepenDensityFirstPack,
  finalizeMissionProsePack,
  filterMissionExperienceParagraphs,
  leadMissionGiParagraphs,
  missionProseClean,
  polishMissionProsePack,
} from "@/lib/product/missionProseEngine";
import { shouldSuppressLengthTopoff } from "@/lib/product/coreContentEngine";
import { isFurnitureIndustry, isExhibitionTopic, resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { buildStoryTargetSceneLines } from "@/lib/product/storyTargetEngine";
import { isOpimoTopic } from "@/lib/product/furnitureExhibitionEngine";
import {
  buildTopicArcSectionHeadings,
  mapSectionArcRoles,
} from "@/lib/content/humanColumnPolishEngine";
import {
  buildResearchFactLines,
  buildResearchGroundedHumanPack,
  hasUsableResearchFacts,
} from "@/lib/content/researchGroundedHumanPack";
import {
  buildEditorialQualityPack,
  shouldUseEditorialQualityPath,
} from "@/lib/product/editorialQualityStandard";
import { applyNarrativeArcShape } from "@/lib/product/narrativeArcShapeEngine";
import { applyHumanColumnPolish } from "@/lib/content/humanColumnPolishEngine";
import { buildSectionPlan } from "@/lib/content/sectionPlannerEngine";
import { shouldForceMissionProseOnlyPath } from "@/lib/product/missionProseRouteFlags";
import { isGpt55WriterDominant } from "@/lib/llm/llmProvider";
import {
  isFlowerRecommendationTopic,
  scrubFlowerRecommendationPack,
} from "@/lib/product/flowerRecommendationProseEngine";
import { buildFlowerRecommendationEditorialPack } from "@/lib/product/flowerNarrativeProse";
import {
  buildIndustryHumanColumnEditorialPack,
} from "@/lib/product/industryHumanColumnProse";
import {
  isFurnitureChairProductTopic,
  scrubFurnitureChairPack,
  extractFurnitureProductLabel,
} from "@/lib/product/furnitureProductProseEngine";

const TIER_MIN_SECTIONS = { short: 4, medium: 6, long: 8 };

const clean = missionProseClean;

function paragraphKey(text) {
  return String(text || "")
    .replace(/\s/g, "")
    .slice(0, 56);
}

export function isCoverageSlotDumpPack(pack) {
  if (!pack?.sections?.length) return false;
  const full = getBlogFullText(pack);
  const checklist = scoreChecklistVoice(full, pack);
  if (!checklist.ok) return true;
  if ((full.match(/당일 안내(?:로)? 짚어/g) || []).length >= 3) return true;
  if ((full.match(/에\s*직접\s*가서\s+.+?\s+관련\s+안내를\s+들었어요/g) || []).length >= 2) return true;
  if ((full.match(/응대을|이용를|쇼룸를/g) || []).length >= 1) return true;
  if (/입력·공개 맥락|방문·예약 전에 일정을|조건 조건|이용을 직접 확인/.test(full)) {
    return true;
  }
  if (/(?:확인하세요|권합니다|정리해 두세요|안내받으세요)/.test(full)) return true;
  const confirmRatio = checklist.confirmRatio || 0;
  if (confirmRatio >= 0.12) return true;
  if (checklist.templateHits >= 2) return true;
  return false;
}

function researchExperienceLines(input = {}, limit = 6) {
  const p = deriveTopicWritingContext(input);
  const lines = [];
  for (const item of input.researchFacts || []) {
    const raw = clean(typeof item === "string" ? item : item?.fact || "");
    if (!raw || raw.length < 4) continue;
    const tail = raw.includes("—") ? raw.split("—").pop().trim() : raw;
    if (/체험|행사|전시|오피모|할인|프로모/.test(tail)) {
      lines.push(
        `${p.regionBit}${p.brand} 쇼룸에서 ${tail.replace(/조건$/, "")} 이야기를 직접 들었어요.`
      );
    } else if (/예약|상담|방문/.test(tail)) {
      const visitBit = /가능\s*$/.test(tail) ? `${tail} 여부` : `${tail} 가능 여부`;
      lines.push(`${p.regionBit}방문 전 ${visitBit}를 전화로 확인하고 갔어요.`);
    } else if (lines.length < limit) {
      const fact = tail
        .replace(/\.\s*$/, "")
        .replace(/이다\.?$/, "")
        .replace(/한다\.?$/, "")
        .replace(/있다\.?$/, "")
        .replace(/했다\.?$/, "")
        .trim();
      if (/출시|인기|알려져|저상형|프리미엄/.test(fact)) {
        lines.push(`매장에서 ${fact} 쪽 이야기를 직접 들었어요.`);
      } else {
        lines.push(`매장에서 ${fact}를 직접 확인했어요.`);
      }
    }
    if (lines.length >= limit) break;
  }
  return lines;
}

function genericParagraphCatalog(p, input) {
  const researchLines = shouldForceMissionProseOnlyPath(input)
    ? []
    : researchExperienceLines(input, 5);
  return buildMissionExperienceCatalog(p, input, researchLines);
}

function buildFurnitureExhibitionSectionSets(p, input) {
  const opimo = isOpimoTopic(input);
  const subject = input.topic || p.topicRaw || p.topicFacet;
  const exhibitBit = opimo ? "오피모" : p.topicFacet;
  const research = researchExperienceLines(input, 6);
  const scenes = buildStoryTargetSceneLines(input, 6);

  return [
    [
      buildHumanStoryProblemOpening(input),
      `${p.regionBit}그래서 ${p.brand} ${subject} 보러 직접 다녀왔어요.`,
      `쇼룸 동선부터 체험 가능한 구역까지 한 바퀴 돌아봤어요.`,
      `${p.regionBit}${p.brand} 매장에서 ${exhibitBit} 전시 구성을 먼저 확인했어요.`,
      `어떤 라인업이 전시대에 올라와 있는지, 체험 가능한 모델이 어디인지부터 짚었어요.`,
      scenes[0],
      research[0],
    ],
    [
      scenes[1] || `전시 구성이 사진과 달랐는지, 현장 조명 아래 톤이 어떻게 보이는지부터 봤어요.`,
      scenes[2] || `조명 아래 패브릭 톤이 밝아서 화이트 인테리어 무드를 현장에서 바로 짚어 볼 수 있었어요.`,
      `혼자만 보면 놓치기 쉬운 포인트라 같이 가는 편이 좋았어요.`,
      research[1],
    ],
    [
      `체험 가능한 프레임·매트리스 조합이 전시대마다 달라 라인업부터 확인했어요.`,
      `두 번째로 돌아본 전시대는 첫인상과 연출 톤이 달라서 메모해 두었어요.`,
      `직원분이 조명·동선 쪽을 먼저 짚어 주셔서 비교하기 수월했어요.`,
      `${exhibitBit} 전시 기간·대상 라인업은 매장 안내로 확인했고, 재고·체험 가능 여부는 당일 다시 물어봤어요.`,
      research[2],
    ],
    [
      `상담 때 궁금했던 점을 짧게 메모해 가니 질문이 빠르게 정리됐어요.`,
      `당일 들은 조건은 사진으로 남겨 두고 집에서 다시 검토했어요.`,
      `체험·시연 후 바로 결정하지 않고 하루 두고 메모를 다시 읽어 봤어요.`,
      research[3],
    ],
    [
      `${p.regionBit}매장 주차·영업 시간·대기 줄은 주말과 평일 차이가 커서 평일 오전 방문이 수월했어요.`,
      `행사·프로모션은 매장에서 들은 기준으로 대상 모델·적용 기간을 메모해 두었어요.`,
      opimo
        ? `오피모 관련 혜택은 시기마다 달라질 수 있어서 당일 안내를 다시 확인했어요.`
        : `혜택·할인은 방문 시점마다 달라질 수 있어서 당일 조건을 메모해 두었어요.`,
      research[4],
    ],
    [
      `돌아오는 길에 일정·예산을 맞춰 볼지 집에서 메모를 다시 읽어 봤어요.`,
      `배송 당일 바닥 보호·조립 시간·잔여 포장 처리까지 들은 내용을 메모해 두었어요.`,
      research[5],
    ],
  ].map((section) => section.filter(Boolean).map(clean));
}

function buildFlowerSectionSets(p, input) {
  const subject = topicRaw(input) || p.topicFacet || "꽃";
  const research = researchExperienceLines(input, 6);
  const scenes = buildStoryTargetSceneLines(input, 6);

  return [
    [
      buildHumanStoryProblemOpening(input),
      `${p.regionBit}그래서 ${p.brand} ${subject} 보러 직접 다녀왔어요.`,
      `매장 문을 열고 들어서니 진열대에 생화 색감이 먼저 보였어요.`,
      scenes[0] || `가까이에서 보니 사진과 달리 톤·채도가 조금 달랐어요.`,
      research[0],
    ],
    [
      `목적을 말하니 추천 구성이 짧게 정리됐어요.`,
      `다발·박스·바구니 중 어디에 둘지에 따라 구성이 달라진다고 들었어요.`,
      scenes[1] || `리본 색과 카드 문구 샘플을 같이 보며 톤을 맞췄어요.`,
      `생일·축하처럼 상황을 말하니 꽃 종류 추천이 달라졌어요.`,
      research[1],
    ],
    [
      `줄기 마감·포장 상태를 손으로 확인해 봤어요.`,
      `당일 픽업과 배송 시간대를 따로 안내받고 일정에 맞춰 메모했어요.`,
      scenes[2] || `비슷한 가격대 두 안을 놓고 꽃 종류 차이를 비교했어요.`,
      `진열대에서 여름 톤 꽃을 하나씩 비교해 봤어요.`,
      research[2],
    ],
    [
      `집에 들고 왔을 때 보관 방법만 정리해 두었어요.`,
      `다음에 또 필요하면 같은 기준으로 골라 보면 될 것 같아요.`,
      research[3],
    ],
    [
      `${p.regionBit}매장 주차·영업 시간은 방문 전에 확인해 두었어요.`,
      `주말·피크 시간대는 대기가 있을 수 있어 평일 오전에 갔어요.`,
      `당일 재고와 예약 주문 가능 여부를 따로 안내받았어요.`,
      research[4],
    ],
    [
      `돌아오는 길에 일정·예산을 맞춰 볼지 집에서 메모를 다시 읽어 봤어요.`,
      `포장·리본 마감이 마음에 들었는지 사진으로 남겨 두고 비교했어요.`,
      `다음 선물 때도 같은 기준으로 골라 보면 될 것 같아요.`,
      research[5],
    ],
  ].map((section) => section.filter(Boolean).map(clean));
}

function experienceLineForPlanSlot(slot, p, input, role) {
  const subject = topicRaw(input) || p.topicFacet || "이용";
  const id = String(slot?.id || "").replace(/_x\d+$/i, "");
  const bySlot = {
    product: `${p.regionBit}${p.brand} 진열대에서 ${subject} 구성을 하나씩 비교해 봤어요.`,
    menu: `메뉴판에서 시그니처와 시즌 메뉴를 나눠 보며 고를 항목을 좁혀 갔어요.`,
    space: `좌석·테이블 간격과 실내 분위기를 체류 시간까지 염두에 두고 봤어요.`,
    price: `가격대별 옵션을 메모해 두고 집에서 다시 비교했어요.`,
    reserve: `예약·주문 가능 시간을 상담 초반에 확인해 두니 일정 맞추기가 수월했어요.`,
    pack: `포장·리본·카드 문구 샘플을 같이 보며 톤을 맞췄어요.`,
    delivery: `당일 픽업과 배송 시간대를 따로 안내받고 메모했어요.`,
    visit: `${p.regionBit}방문 전 주차·영업 시간을 확인하고 평일 오전에 갔어요.`,
    location: `${p.regionBit}동선·주차 위치를 미리 확인해 두니 찾아가기 수월했어요.`,
    care: `${subject} 관련 관리·보관 포인트를 매장에서 들은 대로 메모했어요.`,
    flow: `매장 안내·동선을 따라가며 ${subject} 체험 순서를 짚어 봤어요.`,
    treatment: `시술·관리 과정을 짧게 설명해 주셔서 기대치를 맞춰 볼 수 있었어요.`,
  };
  const roleFallback = {
    gi: `${subject} 알아보던 중 ${p.regionBit}${p.brand}가 눈에 들어왔어요.`,
    seung: `${p.regionBit}${p.brand}에 들어가 ${subject}를 직접 봤어요.`,
    jeon: `두 가지 안을 놓고 보니 ${subject} 고를 때 기준이 조금씩 달랐어요.`,
    gyeol: `당일 들은 조건은 메모해 두고 집에서 본인 기준으로 다시 정리했어요.`,
  };
  return bySlot[id] || roleFallback[role] || roleFallback.seung;
}

function buildVisitIndustrySectionSets(p, input, sectionCount) {
  const plan = buildSectionPlan({}, input);
  const roles = mapSectionArcRoles(sectionCount);
  const research = researchExperienceLines(input, sectionCount + 2);
  const scenes = buildStoryTargetSceneLines(input, sectionCount);
  const sets = [];

  for (let i = 0; i < sectionCount; i += 1) {
    const role = roles[i] || "seung";
    const slot = plan.sections[i % Math.max(1, plan.sections.length)] || {};
    const paras = [];
    if (i === 0 && role === "gi") {
      paras.push(buildHumanStoryProblemOpening(input));
    }
    paras.push(experienceLineForPlanSlot(slot, p, input, role));
    if (scenes[i]) paras.push(scenes[i]);
    if (research[i]) paras.push(research[i]);
    if (role === "jeon" && paras.length < 3) {
      paras.push(
        `${topicRaw(input) || p.topicFacet}를 비교해 보니 가격·구성·조건 기준이 조금씩 보였어요.`
      );
    }
    if (role === "gyeol" && paras.length < 3) {
      paras.push(`정리하면 본인 용도에 맞춰 고르면 될 것 같아요.`);
    }
    sets.push(paras.filter(Boolean).map(clean));
  }
  return sets;
}

function buildFurnitureSectionSets(p, input) {
  const exhibition = isExhibitionTopic(input);
  const opimo = isOpimoTopic(input);
  if (exhibition && opimo) {
    return buildFurnitureExhibitionSectionSets(p, input);
  }
  const subject = input.topic || p.topicRaw || p.topicFacet;
  const exhibitBit = opimo ? "오피모" : p.topicFacet;
  const research = researchExperienceLines(input, 6);

  return [
    [
      buildHumanStoryProblemOpening(input),
      `${p.regionBit}그래서 ${p.brand} ${subject}${exhibition ? " 보러" : ""} 직접 다녀왔어요.`,
      `쇼룸 동선부터 누워볼 수 있는 구역까지 한 바퀴 돌아봤어요.`,
      `${p.brand} ${p.regionBit}매장에서 ${exhibitBit} 전시 구성을 먼저 확인했어요.`,
      `어떤 라인업이 전시대에 올라와 있는지, 체험 가능한 모델이 어디인지부터 짚었어요.`,
      research[0],
    ],
    [
      `10분 넘게 누워보니 허리 지지감과 뒤척임 때 소음·진동 전달이 꽤 달랐어요.`,
      `${p.regionBit}매장에서는 모션 각도·제로지 모드도 직접 눌러봤어요.`,
      `파트너와 함께 누워보니 모션 작동 시 프레임 쪽 전달감도 함께 확인할 수 있었어요.`,
      `혼자만 체험하면 놓치기 쉬운 포인트라 같이 가는 편이 좋았어요.`,
      research[1],
    ],
    [
      `프레임 높이·헤드보드·수납 옵션은 방 동선과 맞는지 실물 배치를 보면서 비교했어요.`,
      `사진만으로는 알기 어려운 체감 차이가 있어서 현장 확인이 도움이 됐어요.`,
      `두 번째로 누워본 모델은 첫 체험보다 지지감이 달라서 메모해 두었어요.`,
      `매장 직원분이 설명해 주신 레이어 구성·스프링 타입 차이도 비교에 참고했어요.`,
      research[2],
    ],
    [
      `${subject} 고를 때 예산 상한·수면 자세·방 크기를 먼저 정해 두니 상담이 빨라졌어요.`,
      `인기 모델만 보지 않고 본인 기준으로 좁혀 갔어요.`,
      `견적서에는 설치비·배송비·회수비가 포함됐는지 항목별로 적혀 있었어요.`,
      `${p.regionBit}가구단지·운정 쪽에서 ${p.brand}까지 오는 동선도 함께 봤어요.`,
      research[3],
    ],
    [
      `${p.regionBit}매장 주차·영업 시간·대기 줄은 주말과 평일 차이가 커서 평일 오전 방문이 수월했어요.`,
      `상담 대기 없이 체험할 수 있어서 모델별로 충분히 누워볼 시간이 있었어요.`,
      `설치·배송은 통로 폭·층간 이동·엘리베이터 사용 가능 여부를 주문 전에 매장과 맞춰 봤어요.`,
      `기존 침대 회수·철거 포함 여부도 같이 확인했어요.`,
      research[4],
    ],
    [
      exhibition
        ? `행사·프로모션은 매장에서 들은 기준으로 대상 모델·적용 기간·카드·증정 조건을 메모해 두었어요.`
        : `${p.brand} ${p.topicFacet} 견적은 본체·설치·옵션·할인을 항목별로 나눠 받아봤어요.`,
      opimo
        ? `오피모 관련 혜택은 시기마다 달라질 수 있어서 당일 안내를 다시 확인했어요.`
        : `혜택·할인은 방문 시점마다 달라질 수 있어서 당일 조건을 메모해 두었어요.`,
      `교환·반품·A/S 범위는 계약서·안내 문서로 다시 한번 확인했어요.`,
      `행사 제품도 사후 지원 조건이 동일한지 상담사에게 질문해 봤어요.`,
      `최종 결정 전에 파트너와 각도·소음·쿠션감에 대한 의견을 맞춰 보는 시간을 가졌어요.`,
      research[5],
    ],
  ].map((section) => section.filter(Boolean).map(clean));
}

function poolByArcRole(catalog, role) {
  const tests = {
    gi: /(?:왜|찾|고민|솔직|처음|알아보|검색|헷갈|걱정|당김|각질)/,
    seung: /(?:직접|방문|매장|다녀|확인|체험|누워|들었|상담|진단|시술)/,
    jeon: /(?:비교|기준|조건|막히|달랐|차이|견적|톤|채도)/,
    gyeol: /(?:본인|메모|다시|집에서|정리|결정|재방|맞을)/,
  };
  const re = tests[role] || tests.seung;
  const cleanCatalog = filterMissionExperienceParagraphs(catalog);
  const hit = cleanCatalog.filter((para) => re.test(para));
  return hit.length ? hit : cleanCatalog;
}

function buildCatalogSectionSets(p, input, sectionCount) {
  const catalog = filterMissionExperienceParagraphs(
    buildMissionExperienceCatalog(p, input, [])
  );
  const usedGlobal = new Set();
  const perSection = Math.max(2, Math.min(3, Math.ceil(catalog.length / sectionCount)));
  const sets = [];
  for (let i = 0; i < sectionCount; i += 1) {
    sets.push(pickUniqueParagraphs(catalog, usedGlobal, i, perSection));
  }
  return sets;
}

function buildInformationalSectionSets(p, input, sectionCount) {
  if (isFlowerRecommendationTopic(input) || isFurnitureChairProductTopic(input)) {
    return buildCatalogSectionSets(p, input, sectionCount);
  }
  const subject = topicRaw(input) || p.topicFacet || "안내";
  const catalog = filterMissionExperienceParagraphs(
    buildMissionExperienceCatalog(p, input, [])
  );
  const usedGlobal = new Set();
  const roles = mapSectionArcRoles(sectionCount);
  const defaultByRole = {
    gi: [
      ...leadMissionGiParagraphs(input),
      `검색만 하다 보면 기준이 많아서 어디서부터 볼지 막히는 날이 있습니다.`,
      `${subject}를 고를 때 성분·보관·목적을 함께 보면 기준이 분명해집니다.`,
    ],
    seung: [
      `${p.brand}에서 안내하는 ${subject} 관련 조건을 정리해 봤습니다.`,
      `성분·원재료·보관 방법은 제품마다 달라 라벨을 먼저 확인하는 편이 좋습니다.`,
    ],
    jeon: [
      `선물·반려·집에서 먹기 등 용도별로 ${subject} 기준이 달라질 수 있습니다.`,
      `비슷한 제품을 비교할 때는 첨가물·알레르기 표기를 나란히 보면 수월합니다.`,
    ],
    gyeol: [
      `${p.regionBit}${p.brand} ${subject} — 용도와 보관 환경을 먼저 정리해 두면 선택이 빨라집니다.`,
      `궁금한 점은 매장 문의로 확인하시면 됩니다.`,
    ],
  };
  const sets = [];
  for (let i = 0; i < sectionCount; i += 1) {
    const role = roles[i] || "seung";
    const pool = [...poolByArcRole(catalog, role), ...defaultByRole[role]];
    sets.push(pickUniqueParagraphs(pool, usedGlobal, i, Math.max(4, 5)));
  }
  return sets;
}

function buildGenericSectionSets(p, input, sectionCount) {
  if (isInformationalTopicInput(input)) {
    return buildInformationalSectionSets(p, input, sectionCount);
  }
  const catalog = genericParagraphCatalog(p, input);
  const usedGlobal = new Set();
  const roles = mapSectionArcRoles(sectionCount);
  const defaultByRole = {
    gi: [
      ...leadMissionGiParagraphs(input),
      `요즘 ${p.topicFacet} 알아보던 중 ${p.regionBit}${p.brand}에 직접 가볼 일이 생겼어요.`,
    ],
    seung: [
      `${p.regionBit}${p.brand}에 들어가 ${p.topicFacet}를 직접 봤어요.`,
      `현장에서 색감·구성·조건을 하나씩 확인했어요.`,
    ],
    jeon: [
      `${p.topicFacet}를 고를 때 가격·구성·이용 방식을 함께 비교했어요.`,
      `두 가지 안을 놓고 보니 기준이 조금씩 달라 보였어요.`,
    ],
    gyeol: [
      `마지막으로 당일 들은 조건은 메모해 두고 집에서 다시 검토했어요.`,
      `일정·예산은 그 메모를 보며 맞춰 보면 될 것 같아요.`,
    ],
  };
  const sets = [];
  for (let i = 0; i < sectionCount; i += 1) {
    const role = roles[i] || "seung";
    const pool = [...poolByArcRole(catalog, role), ...defaultByRole[role]];
    let paras = pickUniqueParagraphs(pool, usedGlobal, i, Math.max(4, 5));
    if (i === 0 && role === "gi") {
      const lead = buildHumanStoryProblemOpening(input);
      paras = [lead, ...paras.filter((para) => para !== lead && !/염색은 하고 싶은데/.test(para))];
    }
    sets.push(paras);
  }
  return sets;
}

/** 글자수 보강 — missionProseEngine SSOT */
export function deepenMissionProseToMin(pack, minChars, input = {}) {
  if (!pack?.sections?.length) return pack;
  const mode = String(pack?._meta?.generationMode || "");
  const llmPack =
    pack?._meta?.llmGenerated === true ||
    mode.startsWith("llm_") ||
    pack?._meta?.briclogWriterEngine;
  if (isGpt55WriterDominant() && llmPack) return pack;

  if (shouldSuppressLengthTopoff(pack, input)) {
    const researchLines = hasUsableResearchFacts(input)
      ? buildResearchFactLines(input, 12)
      : [];
    const before = countBlogBodyCharsWithSpaces(pack);
    let next = dedupeMissionPackGlobally(polishMissionProsePack(pack, input));
    let round = 0;
    while (countBlogBodyCharsWithSpaces(next) < minChars && round < 10) {
      next = dedupeMissionPackGlobally(
        deepenDensityFirstPack(next, minChars, input, {
          polishAfter: false,
          seedOffset: round,
          researchLines,
        })
      );
      round += 1;
    }
    const expanded = countBlogBodyCharsWithSpaces(next);
    if (expanded > before && (next.sections?.length || 0) >= 3) {
      const polished = dedupeMissionPackGlobally(polishMissionProsePack(next, input));
      if ((polished.sections?.length || 0) >= 3) {
        next = polished;
      }
    }
    return next;
  }

  return dedupeMissionPackGlobally(
    finalizeMissionProsePack(dedupeMissionPackGlobally(pack), input, {
      min: minChars,
      target: minChars,
    })
  );
}

function buildMissionSectionHeadings(input = {}, count = 6) {
  if (isFlowerRecommendationTopic(input) || isFurnitureChairProductTopic(input)) {
    return buildTopicArcSectionHeadings(input, count).slice(0, Math.max(1, count));
  }
  if (isVisitReviewTopicInput(input)) {
    const arc = buildTopicArcSectionHeadings(input, count);
    return arc.length >= count ? arc : arc;
  }
  if (isFurnitureIndustry(input) && isExhibitionTopic(input) && isOpimoTopic(input)) {
    const p = deriveTopicWritingContext(input);
    const headings = [
      `${p.regionBit}${p.brand} 오피모 전시, 쇼룸에서 직접 본 점`,
      "전시 연출·동선을 본 순서",
      "사진과 달랐던 체감 포인트",
      "상담·조건을 정리한 방법",
      `${p.brand} 쇼룸, 당일 확인한 것`,
      "방문 후 본인 기준으로",
    ];
    return headings.slice(0, Math.max(1, count));
  }
  const arc = buildTopicArcSectionHeadings(input, count);
  if (arc.length >= count) return arc;
  const why = buildSignatureWhyHeading(input);
  return [why, ...arc].slice(0, Math.max(1, count));
}

function pickUniqueParagraphs(catalog, usedGlobal, startIdx, count) {
  const picked = [];
  let idx = startIdx;
  let guard = 0;
  while (picked.length < count && guard < catalog.length * 2) {
    const para = catalog[idx % catalog.length];
    const key = paragraphKey(para);
    if (!usedGlobal.has(key)) {
      usedGlobal.add(key);
      picked.push(para);
    }
    idx += 1;
    guard += 1;
  }
  return picked;
}

function buildSectionBodies(input, sectionCount) {
  const p = deriveTopicWritingContext(input);
  if (shouldForceMissionProseOnlyPath(input)) {
    return buildInformationalSectionSets(p, input, sectionCount).map((paras) =>
      paras.join("\n\n")
    );
  }
  const industryKey = resolveBriclogIndustryKey(input);
  const visitIndustry = ["cafe", "restaurant", "salon", "beauty", "pet_cafe", "hospital"].includes(
    industryKey
  );
  const sectionSets = isFurnitureIndustry(input)
    ? buildFurnitureSectionSets(p, input)
    : industryKey === "flower"
      ? buildFlowerSectionSets(p, input)
      : visitIndustry
        ? buildVisitIndustrySectionSets(p, input, sectionCount)
        : buildGenericSectionSets(p, input, sectionCount);

  const sections = [];
  for (let i = 0; i < sectionCount; i += 1) {
    const paras = sectionSets[i] || sectionSets[sectionSets.length - 1] || [];
    sections.push(paras.join("\n\n"));
  }
  return sections;
}

export function stripTitleEchoParagraphs(pack) {
  const title = String(pack?.representativeTitle || pack?.title || "").trim();
  const titleKey = paragraphKey(title);
  if (!titleKey || titleKey.length < 12) return pack;
  const sections = (pack.sections || []).map((sec) => {
    const kept = String(sec.body || "")
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => {
        const key = paragraphKey(p);
        return key !== titleKey && !p.includes(title);
      });
    return { ...sec, body: kept.join("\n\n").trim() };
  });
  return { ...pack, sections };
}

function dedupeMissionPackGlobally(pack) {
  const seen = new Set();
  const sections = (pack.sections || [])
    .map((sec) => {
      const kept = [];
      for (const para of String(sec.body || "").split(/\n\n+/)) {
        const t = para.trim();
        if (t.replace(/\s/g, "").length < 12) continue;
        const key = paragraphKey(t);
        if (seen.has(key)) continue;
        seen.add(key);
        kept.push(t);
      }
      return { ...sec, body: kept.join("\n\n").trim() };
    })
    .filter((s) => s.body.replace(/\s/g, "").length >= 40);

  let conclusion = String(pack.conclusion || "").trim();
  const concKey = paragraphKey(conclusion);
  if (seen.has(concKey)) {
    conclusion = "";
  }

  return { ...pack, sections, conclusion };
}

function buildHashtags(input = {}) {
  const p = deriveTopicWritingContext(input);
  const raw = [
    p.region,
    p.brand,
    topicWritingFacet(input).replace(/\s+/g, ""),
    input.mainKeyword?.split(/[,，]/)[0]?.trim()?.replace(/\s+/g, ""),
  ].filter(Boolean);
  return [...new Set(raw)].slice(0, 6).map((t) => `#${t}`);
}

export function buildMissionProseFallbackPack(input = {}) {
  if (isGpt55WriterDominant()) {
    return {
      sections: [],
      title: "",
      representativeTitle: "",
      _meta: {
        gpt55FallbackBlocked: true,
        generationMode: "gpt55_template_blocked",
      },
    };
  }
  if (isFlowerRecommendationTopic(input)) {
    return buildFlowerRecommendationEditorialPack(input);
  }
  if (!shouldForceMissionProseOnlyPath(input)) {
    return buildIndustryHumanColumnEditorialPack(input);
  }
  if (hasUsableResearchFacts(input)) {
    return buildResearchGroundedHumanPack(input);
  }
  const p = deriveTopicWritingContext(input);
  const forcedMission = shouldForceMissionProseOnlyPath(input);
  const tierKey = input.blogLengthTier || "medium";
  const tier = resolveBlogLengthTier(tierKey);
  let sectionCount = TIER_MIN_SECTIONS[tierKey] || TIER_MIN_SECTIONS.medium;
  if (forcedMission) {
    const catalogSize = filterMissionExperienceParagraphs(
      buildMissionExperienceCatalog(p, input, [])
    ).length;
    sectionCount = Math.min(
      sectionCount,
      Math.max(3, Math.ceil(Math.max(catalogSize, 1) / 2))
    );
  }
  const headings = buildMissionSectionHeadings(input, sectionCount);
  const bodies = buildSectionBodies(input, sectionCount);

  const displayTopic = String(topicWritingFacet(input) || p.topicFacet || "이용").trim();
  const titleTopic =
    isFurnitureChairProductTopic(input)
      ? extractFurnitureProductLabel(input) || topicRaw(input) || displayTopic
      : topicWritingFacet(input) || displayTopic;
  const title =
    forcedMission || isInformationalTopicInput(input)
    ? `${p.regionBit}${p.brand} ${titleTopic}`.trim()
    : buildHumanClickTitles(
        {
          brandName: p.brand,
          region: p.region,
          topic: displayTopic,
          mainKeyword: input.mainKeyword || displayTopic,
          industry: input.industry,
        },
        input
      ).find((t) => /후기|다녀|솔직/.test(t) && t.includes(p.brand)) ||
      `${p.regionBit}${p.brand} 솔직 후기, ${displayTopic}`;

  let pack = {
    title,
    representativeTitle: title,
    sections: headings.map((heading, i) => ({
      heading: clean(heading),
      body: bodies[i] || bodies[bodies.length - 1] || "",
    })),
    conclusion: buildMissionConclusionLine(p, input, displayTopic),
    hashtags: isInformationalTopicInput(input) ? [] : buildHashtags(input),
    _meta: {
      missionProseFallback: true,
      isBriefOnly: false,
      draftFallback: true,
      forcedMissionProseRoute: forcedMission || undefined,
    },
  };

  pack = dedupeMissionPackGlobally(pack);
  pack = stripTitleEchoParagraphs(pack);
  pack = polishMissionProsePack(pack, input);
  if (!forcedMission) {
    pack = applyNarrativeArcShape(pack, input, { force: true });
    pack = applyHumanColumnPolish(pack, input, { lightAnchors: true, force: true });
  }
  pack = finalizeMissionProsePack(pack, input, tier);
  pack = polishMissionProsePack(pack, input);
  pack = dedupeMissionPackGlobally(pack);
  pack = stripTitleEchoParagraphs(pack);
  if (isFlowerRecommendationTopic(input)) {
    pack = scrubFlowerRecommendationPack(pack, input);
  }
  if (isFurnitureChairProductTopic(input)) {
    pack = scrubFurnitureChairPack(pack, input);
  }

  if (!forcedMission && countBlogBodyCharsWithSpaces(pack) < tier.min) {
    let refill = 0;
    while (countBlogBodyCharsWithSpaces(pack) < tier.min && refill < 4) {
      pack = deepenMissionProseToMin(pack, tier.min, input);
      refill += 1;
    }
  }
  if (!forcedMission) {
    pack = applyNarrativeArcShape(pack, input, { force: true });
  }
  pack = dedupeMissionPackGlobally(pack);
  if (isFlowerRecommendationTopic(input)) {
    pack = scrubFlowerRecommendationPack(pack, input);
  }
  if (isFurnitureChairProductTopic(input)) {
    pack = scrubFurnitureChairPack(pack, input);
  }

  const chars = countBlogBodyCharsWithSpaces(pack);
  return {
    ...pack,
    _meta: {
      ...pack._meta,
      missionProseFallback: true,
      forcedMissionProseRoute: forcedMission || pack._meta?.forcedMissionProseRoute || undefined,
      missionProseChars: chars,
      lengthTierMet: chars >= tier.min,
      lengthTierTarget: tier.min,
    },
  };
}

export function replaceCoverageDumpWithMissionProse(pack, input = {}) {
  if (!isBriclogMissionEnforced()) return pack;
  if (!isCoverageSlotDumpPack(pack)) return pack;
  if (hasUsableResearchFacts(input)) {
    return buildResearchGroundedHumanPack(input);
  }
  return buildMissionProseFallbackPack(input);
}

export function dedupeMissionProsePack(pack) {
  return dedupeMissionPackGlobally(pack);
}
