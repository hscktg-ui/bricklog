/**
 * STORY TARGET ENGINE — 타깃 키워드·감정·비주얼·장면 SSOT
 * 뻔한 스펙 나열 대신 「누구·어떤 장면」으로 글을 잡는다.
 */
import { deriveTopicWritingContext, topicWritingFacet } from "@/lib/content/topicFacetEngine";
import { getIndustryFlavorForInput } from "@/lib/product/industryContextEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { polishNaverBlogVoice } from "@/lib/channel/naverBlogEngineRules";
import { buildRegionKeywordHints } from "@/lib/content/regionKeywordHints";

export const STORY_TARGET_ENGINE_VERSION = "v1";

/**
 * @typedef {object} StoryTarget
 * @property {string} id
 * @property {RegExp} match
 * @property {string} label
 * @property {string} emotionHook
 * @property {string[]} visualKeywords
 * @property {string[]} hashtagHints
 * @property {string[]} problemOpenings
 * @property {string} writerGuide
 * @property {(ctx: object) => string[]} sceneLines
 */

/** @type {Record<string, StoryTarget[]>} */
const STORY_TARGETS_BY_INDUSTRY = {
  furniture: [
    {
      id: "newlywed",
      match: /신혼|웨딩|혼수|신혼가구|신혼부부|신혼\s*침실/,
      label: "신혼가구",
      emotionHook: "처음 함께 꾸리는 침실의 설렘·낭만·‘우리만의 공간’",
      visualKeywords: ["화이트 톤", "저상형 연출", "호텔 침실 무드", "아늑한 조명", "패브릭 질감"],
      hashtagHints: ["신혼가구", "화이트인테리어", "호텔식침실", "저상형침대"],
      problemOpenings: [
        "신혼 준비를 하다 보면 침실만큼 고민되는 공간이 없다. 분위기와 실용 사이에서 막히는 날이 많다.",
        "처음 맞추는 침실은 설렘 반, ‘이게 맞나’ 하는 걱정 반이다. 사진과 실물이 다를까 봐 망설여진다.",
      ],
      writerGuide:
        "감정·공감: 신혼부부 침실의 설렘. 비주얼: 쇼룸·전시에서 본 컬러·조명·연출을 장면으로 묘사(스펙 단정 금지). 해시태그는 본문에 2~3개만 자연스럽게.",
      sceneLines: ({ p, brand, product, facet }) => [
        `${p.regionBit}${brand} 쇼룸에 들어서니 ${product} 전시 연출이 화사해서, 신혼 침실 그림을 상상하기 수월했어요.`,
        `조명 아래 패브릭 톤이 밝아서 화이트 인테리어 무드를 현장에서 바로 짚어 볼 수 있었어요.`,
        `${brand} ${product} 전시대 — 저상형·호텔 침실 같은 분위기 연출이 눈에 들어왔어요.`,
        `처음 꾸미는 침실이라 ${facet} 보러 ${p.regionBit}까지 다녀왔어요. 쇼룸 동선부터 천천히 봤어요.`,
      ],
    },
    {
      id: "move_in",
      match: /이사|입주|신축|공실|리모델|인테리어\s*교체/,
      label: "이사·입주",
      emotionHook: "공간이 비어 있을 때, 침실부터 채우고 싶은 마음",
      visualKeywords: ["동선", "방 크기", "조명", "수납", "전시 배치"],
      hashtagHints: ["이사준비", "신혼가구", "침실인테리어"],
      problemOpenings: [
        "이사 날짜가 잡히면 침대·침실부터 정해야 한다는 압박이 먼저 온다.",
        "공간이 비어 있는 상태에서 침실 무드를 상상하기가 생각보다 어렵다.",
      ],
      writerGuide: "이사·입주 맥락 → 쇼룸에서 방 크기·동선·배치를 본 1인칭 장면.",
      sceneLines: ({ p, brand, product }) => [
        `${p.regionBit}${brand}에서 ${product} 전시 배치를 보며 우리 집 침실 동선을 떠올려 봤어요.`,
        `문 통과·침실 폭을 상상하며 전시대 연출을 하나씩 비교해 봤어요.`,
      ],
    },
    {
      id: "sleep_pain",
      match: /허리|숙면|통증|뒤척|각도|지지|아침에\s*아/,
      label: "숙면·허리",
      emotionHook: "아침에 몸이 먼저 일어나는 불편",
      visualKeywords: ["누워본 느낌", "지지감", "조명 아래 연출"],
      hashtagHints: ["숙면", "침실"],
      problemOpenings: [
        "아침에 일어나면 허리가 먼저 아픈 사람들이 있다. 침대를 바꿀지 말지부터 고민이 길어진다.",
      ],
      writerGuide: "불편→쇼룸에서 누워·봤을 때 체감(기능 단정 없이).",
      sceneLines: ({ p, brand, product }) => [
        `${p.regionBit}${brand}에서 ${product} 전시 구성을 보며 누웠을 때의 높이·연출부터 확인했어요.`,
      ],
    },
    {
      id: "exhibition",
      match: /전시|오피모|오픈|런칭|신제품|프로모|소식/,
      label: "전시·신제품",
      emotionHook: "전시 소식을 보고 가도, 막상 쇼룸에 서면 무엇부터 볼지 헷갈림",
      visualKeywords: ["전시대", "연출", "조명", "라인업", "체험 동선"],
      hashtagHints: [],
      problemOpenings: [
        "전시 소식을 보고 가도, 막상 쇼룸에 서면 어떤 라인업이 전시대에 있는지부터 헷갈린다.",
      ],
      writerGuide: "전시·오피모: 쇼룸에서 본 연출·동선·구성. 스펙·기능 단정 금지.",
      sceneLines: ({ p, brand, product }) => [
        `${p.regionBit}${brand} 쇼룸 — ${product} 전시대부터 한 바퀴 돌며 연출·동선을 확인했어요.`,
        `전시 구성이 사진과 달랐는지, 현장 조명 아래 톤이 어떻게 보이는지부터 봤어요.`,
      ],
    },
  ],
  salon: [
    {
      id: "first_dye",
      match: /염색|톤|탈색|손상/,
      label: "첫 염색·톤",
      emotionHook: "예쁘게 바꾸고 싶은데 두피·손상이 먼저 걱정",
      visualKeywords: ["톤", "거울", "상담실 분위기"],
      hashtagHints: ["염색", "두피케어"],
      problemOpenings: ["염색은 하고 싶은데 두피가 먼저 걱정되는 날이 있다."],
      writerGuide: "두피·톤 고민 → 매장 상담·시술실에서 본 분위기.",
      sceneLines: ({ p, brand, facet }) => [
        `${p.regionBit}${brand}에서 ${facet} 상담 전 두피 상태부터 짚어 봤어요.`,
      ],
    },
  ],
  flower: [
    {
      id: "seasonal_guide",
      match:
        /여름|가을|봄|겨울|시즌|계절|사야|고르는|종류|소개|리스트|무엇을|뭐\s*살|어떤\s*꽃/,
      label: "시즌·꽃 가이드",
      emotionHook: "계절마다 꽃 종류가 달라 미리 알아두면 선택이 수월하다",
      visualKeywords: ["시즌 꽃", "컬러", "보관", "종류"],
      hashtagHints: ["꽃", "꽃다발"],
      problemOpenings: [
        "여름철에는 어떤 꽃을 고르면 좋을지, 종류와 보관까지 한 번에 정리해 두면 편하다.",
        "계절마다 꽃 종류가 달라서, 미리 알아두면 선물·집들이 때 선택이 수월하다.",
      ],
      writerGuide:
        "정보 안내형 — 방문 후기·「다녀왔어요」「상담해 주셨어요」 금지. 꽃 종류·색감·보관·선물 상황을 객관적으로.",
      sceneLines: ({ p, brand, facet }) => [
        `${facet}를 고를 때 ${p.regionBit}${brand}에서 자주 문의하는 시즌·목적별 구성을 기준으로 정리했습니다.`,
        `${p.regionBit}${brand} 기준으로 ${facet} 관련 조건·보관 포인트를 확인된 범위에서 담았습니다.`,
      ],
    },
    {
      id: "gift_moment",
      match: /선물|생일|축하|기념|졸업|퇴사/,
      label: "선물·기념",
      emotionHook: "마음 전하는 날, 톤과 포장이 막히는 순간",
      visualKeywords: ["포장", "리본", "시즌 꽃", "컬러"],
      hashtagHints: ["꽃다발", "선물"],
      problemOpenings: ["꽃을 사야 하는 날은 생각보다 많다. 막상 꽃집을 찾으면 어디로 갈지 모른다."],
      writerGuide: "목적·감정 → 플라워샵에서 본 톤·포장.",
      sceneLines: ({ p, brand, facet }) => [
        `${p.regionBit}${brand}에서 ${facet} 포장 톤을 하나씩 비교해 봤어요.`,
      ],
    },
  ],
  hospital: [
    {
      id: "visit_worry",
      match: /방문|진료|검진|수술|통증|증상|응급|예약/,
      label: "방문·진료",
      emotionHook: "아프거나 걱정될 때, 어디서부터 물어봐야 할지 막히는 순간",
      visualKeywords: ["대기실", "상담", "안내", "동선"],
      hashtagHints: ["병원", "진료"],
      problemOpenings: [
        "몸이 불편할수록 검색만 하다 보면 정보가 너무 많아서 더 막히는 날이 있다.",
      ],
      writerGuide: "불안·고민 → 병원 방문·상담에서 본 분위기·안내(의학적 단정 금지).",
      sceneLines: ({ p, brand, facet }) => [
        `${p.regionBit}${brand}에 방문해 ${facet} 관련 안내를 직접 들었어요.`,
        `대기·상담 동선이 생각보다 정돈돼 있어서 긴장이 조금 풀렸어요.`,
      ],
    },
  ],
  marketing: [
    {
      id: "blog_channel",
      match: /블로그|마케팅|광고|홍보|채널|바이럴|콘텐츠|대행/,
      label: "블로그·마케팅",
      emotionHook: "효과는 알고 싶은데 어디서부터 상담받을지 막히는 순간",
      visualKeywords: ["상담실", "제안 자료", "사례", "프로세스"],
      hashtagHints: ["블로그마케팅", "마케팅"],
      problemOpenings: [
        "블로그 마케팅이 필요하다는 건 알지만, 대행사를 고를 때 무엇을 기준으로 볼지 막히는 날이 있다.",
        "검색만 하다 보면 기준이 많아서 어디서부터 상담받을지 막히는 날이 있다.",
      ],
      writerGuide:
        "고민→상담·제안에서 본 프로세스·소통·사례 장면. 쇼룸·매장 체험 톤·스펙 단정 금지.",
      sceneLines: ({ p, brand, facet }) => [
        `${p.regionBit}${brand} 사무실에서 ${facet} 상담을 받으며 진행 방식부터 들었어요.`,
        `기존 사례·채널 전략을 보며 우리 업종에 맞는지 질문해 봤어요.`,
        `제안 받은 일정·보고 주기·소통 채널을 메모해 두고 집에서 다시 검토했어요.`,
      ],
    },
    {
      id: "local_visit",
      match: /.*/,
      label: "상담·제안",
      emotionHook: "검색만 하다 보면 기준이 많아 막히는 순간",
      visualKeywords: ["상담실", "제안", "소통"],
      hashtagHints: [],
      problemOpenings: ["검색만 하다 보면 기준이 많아서 어디서부터 볼지 막히는 날이 있다."],
      writerGuide: "문제→상담·제안에서 본 한 장면. 쇼룸 톤 금지.",
      sceneLines: ({ p, brand, facet }) => [
        `${p.regionBit}${brand}에서 ${facet} 상담을 받으며 진행 방식부터 들었어요.`,
      ],
    },
  ],
  pet_cafe: [
    {
      id: "pet_cafe_visit",
      match: /애견\s*카페|반려견|펫\s*카페|실내\s*놀이|다녀|방문|후기/,
      label: "애견카페 방문",
      emotionHook: "반려견과 함께 쉬고 싶은데 입장·좌석·놀이 구역이 막히는 날",
      visualKeywords: ["실내 놀이", "좌석", "메뉴판", "리드줄 안내"],
      hashtagHints: ["애견카페", "반려견"],
      problemOpenings: [
        "반려견과 함께 쉬고 싶은데, 입장 조건·좌석·실내 놀이 구역을 검색만으로는 잘 안 그려지는 날이 있다.",
        "애견카페를 찾다 보면 몸무게·리드줄·실내 규칙부터 막히는 경우가 많다.",
      ],
      writerGuide: "반려견 동반 맥락 → 매장에서 본 입장·좌석·놀이·메뉴 장면. 일반 카공·브런치 가이드 톤 금지.",
      sceneLines: ({ p, brand, facet }) => [
        `${p.regionBit}${brand}에 들어서니 입장·몸무게 안내판부터 확인했어요.`,
        `실내 놀이 구역과 사람 좌석 분위기를 나눠 보며 ${facet} 이용 조건을 짚었어요.`,
        `반려견 메뉴·사람 음료 메뉴를 각각 비교해 봤어요.`,
      ],
    },
  ],
  cafe: [
    {
      id: "brunch_mood",
      match: /브런치|카공|디저트|커피|테이크아웃|시즌\s*메뉴/,
      label: "브런치·카공",
      emotionHook: "잠깐 쉬고 싶은데 메뉴·자리·분위기가 막히는 날",
      visualKeywords: ["창가", "라떼", "플레이팅", "테이블 간격"],
      hashtagHints: ["카페", "브런치"],
      problemOpenings: [
        "점심 전후로 잠깐 앉고 싶은데, 메뉴와 분위기를 검색만으로는 잘 안 그려지는 날이 있다.",
      ],
      writerGuide: "쉬고 싶은 마음 → 매장에서 본 메뉴·좌석·분위기 장면.",
      sceneLines: ({ p, brand, facet }) => [
        `${p.regionBit}${brand}에 들어서니 ${facet} 메뉴판부터 천천히 봤어요.`,
        `창가 쪽 좌석 분위기가 생각보다 조용해서 잠깐 쉬기 좋았어요.`,
      ],
    },
  ],
  default: [
    {
      id: "local_visit",
      match: /.*/,
      label: "방문·체험",
      emotionHook: "검색만 하다 보면 기준이 많아 막히는 순간",
      visualKeywords: ["매장 분위기", "동선", "상담"],
      hashtagHints: [],
      problemOpenings: ["검색만 하다 보면 기준이 많아서 어디서부터 볼지 막히는 날이 있다."],
      writerGuide: "문제→현장에서 본 한 장면.",
      sceneLines: ({ p, brand, facet }) => [
        `${p.regionBit}${brand}에 직접 가서 ${facet} 관련 안내를 들었어요.`,
      ],
    },
  ],
};

function collectMatchBlob(input = {}) {
  const facts = (input.researchFacts || [])
    .map((f) => String(f?.fact || f?.text || f || ""))
    .join(" ");
  const regionHints = buildRegionKeywordHints(input).join(" ");
  return `${input.topic || ""} ${input.mainKeyword || ""} ${input.writingSubject || ""} ${facts} ${input.region || ""} ${regionHints}`.toLowerCase();
}

/**
 * @param {object} input
 * @returns {{ target: StoryTarget, industryKey: string } | null}
 */
export function resolveStoryTarget(input = {}) {
  if (!isBriclogMissionEnforced()) return null;
  const { key } = getIndustryFlavorForInput(input);
  const pool = STORY_TARGETS_BY_INDUSTRY[key] || STORY_TARGETS_BY_INDUSTRY.default;
  const blob = collectMatchBlob(input);

  for (const target of pool) {
    if (target.id === "local_visit") continue;
    if (target.match.test(blob)) {
      return { target, industryKey: key };
    }
  }

  const fallback = pool.find((t) => t.id === "local_visit");
  if (fallback) return { target: fallback, industryKey: key };

  return null;
}

function storySceneContext(input = {}) {
  const p = deriveTopicWritingContext(input);
  const { flavor } = getIndustryFlavorForInput(input);
  const facet = topicWritingFacet(input) || p.topicFacet || "이용";
  const product = /오피모/i.test(`${input.topic || ""} ${input.mainKeyword || ""}`)
    ? "오피모"
    : facet.split(/\s+/)[0] || flavor.productWord?.split(/·/)[0] || facet;
  return {
    p,
    flavor,
    facet,
    brand: p.brand,
    product,
    region: p.region,
  };
}

export function buildStoryTargetProblemOpening(input = {}) {
  const resolved = resolveStoryTarget(input);
  if (!resolved) return "";
  const { target } = resolved;
  const idx = Math.abs(String(input.brandName || input.topic || "").length) % target.problemOpenings.length;
  return target.problemOpenings[idx];
}

/**
 * @param {object} input
 * @param {number} [count]
 */
export function buildStoryTargetSceneLines(input = {}, count = 3) {
  const resolved = resolveStoryTarget(input);
  if (!resolved) return [];
  const ctx = storySceneContext(input);
  const lines = resolved.target.sceneLines(ctx).map((line) =>
    polishNaverBlogVoice(
      String(line)
        .trim()
        .replace(/\(본\s*톤·연출만[^)]*\)/g, "")
        .trim()
    )
  );
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const key = line.replace(/\s/g, "").slice(0, 48);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length >= count) break;
  }
  return out;
}

export function buildStoryTargetWriterBrief(input = {}) {
  const resolved = resolveStoryTarget(input);
  if (!resolved) return "";
  const { target } = resolved;
  const ctx = storySceneContext(input);
  const scenes = buildStoryTargetSceneLines(input, 3);
  return [
    `【STORY TARGET · ${STORY_TARGET_ENGINE_VERSION}】`,
    `이 글의 메인 타깃: 「${target.label}」`,
    `감정·공감: ${target.emotionHook}`,
    `비주얼 키워드(쇼룸·현장에서 본 연출로만): ${target.visualKeywords.join(" · ")}`,
    target.hashtagHints.length
      ? `해시태그 힌트(2~3개만 본문에 자연스럽게): ${target.hashtagHints.map((h) => `#${h}`).join(" ")}`
      : "",
    target.writerGuide,
    "스펙·기능 나열 금지. 「문을 열자마자~」 같은 장면은 쇼룸·전시 방문 맥락으로 쓸 것.",
    scenes.length ? `장면 예시(그대로 복사 금지, 톤 참고):\n- ${scenes.join("\n- ")}` : "",
    `${ctx.region}${ctx.brand ? ` ${ctx.brand}` : ""} · ${ctx.facet}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildStoryTargetEnginePromptBlock() {
  return `【STORY TARGET ENGINE】
글마다 하나의 타깃 키워드(예: 신혼가구·이사·전시)를 정하고, 감정→비주얼 장면→현장 확인 순으로 쓴다.
뻔한 스펙 나열·매장 안내 FAQ 대신, 독자가 상상할 수 있는 쇼룸·방문 장면 1~2개를 본문에 녹인다.`;
}

export function buildStoryTargetHashtagHints(input = {}) {
  const resolved = resolveStoryTarget(input);
  if (!resolved?.target?.hashtagHints?.length) return [];
  return resolved.target.hashtagHints.slice(0, 4).map((h) => `#${h.replace(/^#/, "")}`);
}

const CHANNEL_STORY_RULES = {
  place: [
    "플레이스: shortNotice=현장·장면 1~2문장(해요체). detailBody=타깃 감정→확인한 포인트.",
    "FAQ·A/S·설치·예약 섹션 나열 금지. 실무(영업·주차·예약)는 detailBody 말미 > 인용 3줄 이내.",
    "스펙·기능 단정 금지 — 쇼룸·전시에서 본 연출·톤만.",
  ],
  instagram: [
    "인스타: hook=타깃 감정·장면(56자). body=비주얼 키워드를 줄바꿈 장면으로.",
    "블로그 톤·소제목·「정리하면」 금지. 해시태그 5~10개(visualKeywords·hashtagHints 참고).",
    "저장하고 싶은 한 장면 — 광고 카피·스펙 나열 금지.",
  ],
};

/**
 * @param {object} input
 * @param {"place"|"instagram"} channel
 */
export function buildStoryTargetChannelBrief(input = {}, channel = "place") {
  const base = buildStoryTargetWriterBrief(input);
  if (!base) return "";
  const rules = CHANNEL_STORY_RULES[channel] || [];
  return [base, ...rules.map((r) => `【${channel.toUpperCase()} STORY】${r}`)].join("\n");
}
