/**
 * Scene Engine — 정보 나열이 아닌 생활 장면에서 시작
 * 구조: 장면 → 감정 → 공감 → 정보 → 브랜드 연결
 */
import { getPersonaBlogModifiers } from "@/lib/persona/personaChannelStyle";
import {
  headingFromMoment,
  isBannedHeading,
  rewriteBannedHeading,
} from "@/lib/constitution/writingConstitution";

const HUMANIZATION_BANNED_RE =
  /(햇살이 따뜻하게|커피 한 잔|설레는 마음|피곤한 몸|따뜻한 분위기|새로운 시작|특별한 순간|여러분의 이야기를|소중한 경험|새로운 세계|즐거운 경험|퇴근길에 문득|비 오는 날|주말 아침)/g;

const BUSINESS_FIRST_LINES = [
  "문제를 먼저 정의하고 운영 흐름으로 설명하면 의사결정이 빨라집니다.",
  "브랜드가 반복해야 할 메시지를 고정해야 콘텐츠 일관성이 유지됩니다.",
  "기능 설명은 장점 나열보다 실제 적용 순서 중심으로 정리하는 편이 효과적입니다.",
  "검색 결과를 복사하기보다 브랜드 맥락으로 재해석해야 장기적으로 신뢰가 쌓입니다.",
  "콘텐츠가 쌓일수록 브랜드 말투와 철학이 선명해지도록 기준을 유지해야 합니다.",
];

function hashSeed(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h + str.charCodeAt(i) * (i + 1)) % 997;
  return h;
}

function pick(pool, seed) {
  if (!pool?.length) return "";
  return pool[Math.abs(seed) % pool.length];
}

function normalizeLine(line) {
  return String(line || "")
    .replace(HUMANIZATION_BANNED_RE, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isBusinessPracticalIndustry(ctx = {}) {
  const raw = `${ctx.industryKey || ""} ${ctx.industryLabel || ""} ${ctx.main || ""}`.toLowerCase();
  return /saas|ai|academy|교육|마케팅|platform|플랫폼|서비스|솔루션/.test(raw);
}

export const SCENE_DATASETS = {
  flower: [
    {
      id: "after-work",
      heading: "퇴근 후, 꽃이 필요해지는 순간",
      opener: [
        "문을 열고 들어왔는데, 거실이 평소보다 텅 빈 느낌이 들던 날이 있었어요.",
        "퇴근길에 지나가다 꽃집 불빛만 보고도 발걸음이 느려지는 날이 있습니다.",
      ],
      experience: [
        "기념일이 갑자기 다가오면, 먼저 떠오르는 게 꽃인 경우가 많아요.",
        "비 오는 날에는 실내 분위기를 바꾸고 싶어서 꽃을 찾게 되더라고요.",
        "빈 화병만 보고 있으면, 집이 왠지 차갑게 느껴질 때가 있어요.",
      ],
      bridge: [
        "그래서 {region}에서 꽃을 고를 때는, 생화 상태와 늦은 시간 이용 여부를 같이 봅니다.",
        "이때 {brand}처럼 상황에 맞게 구성을 잡아 주는 곳이 부담이 덜해요.",
      ],
    },
    {
      id: "sudden-gift",
      heading: "갑작스러운 기념일",
      opener: [
        "일정이 꼬여서 선물을 미루다가, 막상 오늘 필요해진 적 있으시죠.",
        "메시지 하나에 ‘오늘 꽃 가능할까요?’가 오면, 마음이 먼저 급해집니다.",
      ],
      experience: [
        "사진으로만 고르면 아쉬운 경우가 있어, 리본·카드·포장까지 한 번에 보게 됩니다.",
        "늦은 시간에도 들를 수 있는지, 주차는 되는지가 같이 따라옵니다.",
      ],
      bridge: [
        "{region}에서 {keywordHint}을 알아보실 때, 영업 시간과 재고를 먼저 확인해 보시면 편합니다.",
        "{brand}는 기념일·당일 수령 문의가 많아, 구성을 빠르게 맞춰 주는 편이에요.",
      ],
    },
    {
      id: "rainy-mood",
      heading: "비 오는 날, 집 분위기",
      opener: [
        "창밖만 보면 나가기 싫은 날, 거실 테이블 위가 유난히 허해 보일 때가 있어요.",
        "장마철에는 실내를 조금만 바꿔도 하루 느낌이 달라지더라고요.",
      ],
      experience: [
        "꽃 한 다발만 놓아도 공간 톤이 부드러워지는 날이 있습니다.",
        "향이 강하지 않은 생화를 고르시는 분들도 많아요.",
      ],
      bridge: [
        "{region} 근처에서 꽃을 찾으신다면, 배송·당일 픽업 가능 여부도 함께 보시면 좋아요.",
        "{brand}는 계절마다 강조하는 꽃이 달라, 같은 매장이라도 방문 때마다 느낌이 조금씩 다릅니다.",
      ],
    },
  ],
  cafe: [
    {
      id: "solo-work",
      heading: "혼자 작업하기 좋은 오후",
      opener: [
        "노트북을 펼쳤는데 집에서는 집중이 안 되는 날, 카페 문을 열게 됩니다.",
        "조용한 자리와 콘센트 위치가 먼저 보이는 타입이에요.",
      ],
      experience: [
        "메뉴 사진보다 실제 좌석 간격과 소음이 더 중요하게 느껴집니다.",
        "비 오는 날에는 창가 자리가 특히 편하더라고요.",
      ],
      bridge: [
        "{region}에서 {keywordHint}을 찾을 때는 ‘얼마나 오래 머물 수 있는지’가 기준이 됩니다.",
        "{brand}는 평일 오전·늦은 오후가 한산한 편이라 작업하기 편합니다.",
      ],
    },
    {
      id: "weekend-brunch",
      heading: "주말, 잠깐 쉬고 싶을 때",
      opener: [
        "주말 오전에 일정이 비면, 산책 후 들르는 카페가 떠오르는 분들이 많아요.",
      ],
      experience: [
        "브런치 메뉴는 시즌마다 조금씩 바뀌어, 재방문할 때도 새로움이 있습니다.",
        "사진보다 현장 조도가 더 차분한 날도 있어요.",
      ],
      bridge: [
        "{region} 근처 {keywordHint}을 비교하실 때는 주차와 대기 시간을 같이 보시면 후회가 적습니다.",
        "{brand}는 과한 연출 없이 커피와 공간이 먼저 보이는 구조입니다.",
      ],
    },
  ],
  furniture: [
    {
      id: "move-in",
      heading: "이사·신혼, 공간이 비어 있을 때",
      opener: [
        "이사 날짜가 잡히면, 침대와 소파부터 사진으로만 고르기 시작하게 됩니다.",
        "현장에서 보기 전에는 색감·크기가 맞는지 확신이 안 서는 경우가 많아요.",
      ],
      experience: [
        "쇼룸 동선이 넓으면 제품을 가까이에서 볼 수 있어 결정이 빨라집니다.",
        "허리·수면 불편이 있으면 체험 후 상담하는 분들이 많습니다.",
      ],
      bridge: [
        "{region}에서 {keywordHint}을 알아보실 때는 배송·조립 일정을 미리 확인해 두시면 일정이 수월합니다.",
        "{brand}는 공간 사진과 평수를 알려 주시면 구성 제안이 빨라지는 편입니다.",
      ],
    },
    {
      id: "hotel-feel",
      heading: "호텔 같은 분위기를 원할 때",
      opener: [
        "집이 너무 밋밋하게 느껴질 때, 조명과 침구부터 바꾸고 싶어지는 날이 있습니다.",
      ],
      experience: [
        "사진과 실제 재질·마감은 꼭 현장에서 확인하는 게 맞습니다.",
        "프리미엄 라인은 상담 예약이 있으면 대기가 덜합니다.",
      ],
      bridge: [
        "{keywordHint}을 비교할 때는 AS 범위와 배송 지역을 함께 보시면 좋아요.",
        "{brand} 쇼룸은 {region}에서 방문해 보시기 좋은 편입니다.",
      ],
    },
  ],
  hospital: [
    {
      id: "first-visit",
      heading: "처음 내원 전, 긴장되는 날",
      opener: [
        "증상이 생기면 검색부터 하게 되는데, 막상 예약·접수가 더 막막하게 느껴질 때가 있어요.",
        "가족이 동행하면 대기·주차까지 같이 챙기게 됩니다.",
      ],
      experience: [
        "과장된 후기보다 접수 방식과 상담 톤이 더 중요하게 느껴집니다.",
        "진료 이력을 간단히 정리해 가면 상담이 수월합니다.",
      ],
      bridge: [
        "{region}에서 {keywordHint}을 알아보실 때는 진료 시간·주차·예약 방식을 먼저 확인해 주세요.",
        "{brand}는 불필요하게 긴 설명보다 필요한 안내에 집중하는 편입니다.",
      ],
    },
    {
      id: "family",
      heading: "가족 동행, 상담이 필요할 때",
      opener: [
        "부모님 모시고 갈 때는 대기 공간과 동선이 먼저 보입니다.",
      ],
      experience: [
        "궁금한 점은 그 자리에서 짧게라도 확인하는 것이 좋습니다.",
        "재방문 시 관리 안내가 명확한지가 만족도에 크게 작용합니다.",
      ],
      bridge: [
        "{keywordHint} 관련 문의는 방문 전 전화로 확인 가능한지 보시면 마음이 편합니다.",
        "{brand} · {region}에서 첫 방문도 긴장이 덜한 편이에요.",
      ],
    },
  ],
  carwash: [
    {
      id: "before-after",
      heading: "비 오기 전, 차가 먼저 지저분해질 때",
      opener: [
        "출근 전에 유리창만 봐도 세차가 필요하다는 게 느껴지는 날이 있습니다.",
      ],
      experience: [
        "before/after 차이가 큰 업종이라, 대기 시간과 코스 구성을 같이 봅니다.",
        "주말은 줄이 길어 평일 오전이 한산한 편입니다.",
      ],
      bridge: [
        "{region}에서 {keywordHint}을 찾을 때는 운영 시간과 예약 가능 여부를 확인해 보세요.",
        "{brand}는 코스별 소요 시간을 미리 안내해 드립니다.",
      ],
    },
  ],
  agency: [
    {
      id: "deadline",
      heading: "일정이 겹치는 날",
      opener: [
        "캠페인 일정이 겹치면, 먼저 소통 채널부터 확인하게 됩니다.",
        "브리프가 길수록, 현장에서 맞추는 시간이 줄어드는 편이에요.",
      ],
      experience: [
        "왜 이 대행사를 부르는지, 결과물보다 소통 방식이 먼저 보일 때가 많습니다.",
        "리뷰만 보고 결정했다가, 수정 라운드에서 아쉬운 경우도 있습니다.",
      ],
      bridge: [
        "{region}에서 {keywordHint}을 찾을 때는 포트폴리오와 운영 방식을 같이 보시면 좋아요.",
        "{brand}는 브리프 단계부터 방향을 맞춰, 불필요한 수정을 줄이는 편입니다.",
      ],
    },
    {
      id: "brief-night",
      heading: "늦은 밤, 브리프를 정리할 때",
      opener: [
        "내일 오전 미팅 전날, 슬라이드보다 말이 먼저 정리되는 밤이 있습니다.",
      ],
      experience: [
        "왜 기억에 남는지, 숫자보다 ‘말이 통했는지’로 남는 경우가 많아요.",
        "지역·업종이 다르더라도, 필요한 장면을 먼저 그려 주는 팀이 편합니다.",
      ],
      bridge: [
        "{brand}는 {region} 근처에서도 미팅·원격을 병행해, 일정 부담을 줄이는 편이에요.",
      ],
    },
  ],
  default: [
    {
      id: "everyday",
      heading: "평소에 떠올리는 순간",
      opener: [
        "필요할 때마다 검색하는 것보다, 한번 가 보고 기억해 두는 편이 편한 매장이 있습니다.",
      ],
      experience: [
        "사진과 현장 느낌이 다를 수 있어, 직접 확인해 보시는 게 낫습니다.",
        "처음 방문이시라면 이용 방식부터 보시면 후회가 적어요.",
      ],
      bridge: [
        "{region}에서 {keywordHint}을 알아보신다면, {brand}도 한번 들러 보시면 좋겠습니다.",
      ],
    },
  ],
};

function resolveIndustryKey(ctx, flavor) {
  const k = flavor?.legacyKey || ctx.industryKey || ctx.pipeline?.industryLock;
  if (k === "agency" || /광고|대행|마케팅/.test(ctx.industryLabel || "")) {
    return "agency";
  }
  if (k === "flower" || /꽃/.test(ctx.industryLabel || "")) return "flower";
  if (k === "cafe") return "cafe";
  if (k === "hospital") return "hospital";
  if (k === "furniture" || ctx.industryKey === "furniture") return "furniture";
  if (k === "carwash" || ctx.industryKey === "carwash") return "carwash";
  return "default";
}

function fillTemplate(line, ctx) {
  const brand = ctx.brandName || "이 매장";
  const region = ctx.region || "";
  const main = ctx.main || "";
  const keywordHint = main.includes(region)
    ? main
    : region
      ? `${region}에서 ${main}`
      : main;
  return String(line)
    .replace(/\{brand\}/g, brand)
    .replace(/\{region\}/g, region)
    .replace(/\{keywordHint\}/g, keywordHint)
    .replace(/\{main\}/g, main);
}

export function pickScene(ctx, flavor) {
  const key = resolveIndustryKey(ctx, flavor);
  const pool = SCENE_DATASETS[key] || SCENE_DATASETS.default;
  const seed = hashSeed(
    `${ctx.region}|${ctx.main}|${ctx.purposeType}|${ctx.contentPersona}|${key}`
  );
  const scene = pick(pool, seed);
  const subSeed = seed + 7;
  const practical = isBusinessPracticalIndustry(ctx);
  const opener = fillTemplate(pick(scene.opener, subSeed), ctx);
  const experienceLines = (scene.experience || []).map((l, i) =>
    fillTemplate(l, subSeed + i)
  );
  const bridgeLines = (scene.bridge || []).map((l, i) =>
    fillTemplate(l, subSeed + i + 3)
  );

  const practicalLines = practical
    ? [
        `요즘 ${ctx.main || "해당 주제"} 관련 글은 많지만, 브랜드별 기준이 달라 운영 메시지가 자주 흔들립니다.`,
        `브릭로그는 브랜드 기억, 콘텐츠 축적, 말투 일관성을 먼저 고정하고 글을 전개합니다.`,
        pick(BUSINESS_FIRST_LINES, subSeed),
      ]
    : [];

  return {
    industryKey: key,
    sceneId: scene.id,
    heading: normalizeLine(fillTemplate(scene.heading, ctx)),
    opener: practical ? practicalLines[0] : normalizeLine(opener),
    experienceLines: practical
      ? practicalLines.slice(1)
      : experienceLines.map(normalizeLine),
    bridgeLines: practical ? [pick(BUSINESS_FIRST_LINES, subSeed + 1)] : bridgeLines.map(normalizeLine),
  };
}

function pickFlowHeading(seed, used, candidates) {
  const pool = candidates.filter(Boolean);
  for (let i = 0; i < pool.length; i++) {
    const h = pool[(seed + i) % pool.length];
    if (!h || isBannedHeading(h) || used.has(h)) continue;
    used.add(h);
    return h;
  }
  return headingFromMoment(pool[0]) || "그날의 이야기";
}

function brandResearchLines(ctx) {
  const s = ctx.brandResearch?.summary;
  if (!s) return [];
  return [
    s.operationStyle,
    ...(s.coreStrengths || []).slice(0, 2),
    ...(s.searchVoices || []).slice(0, 1),
  ].filter(Boolean);
}

/** 장면 → 감정 → 공감 → 정보 → 브랜드 연결 */
export function buildSceneBlogSections(ctx, flavor) {
  const scene = pickScene(ctx, flavor);
  const persona = ctx.contentPersona || "brand_story";
  const subtype = ctx.contentPersonaSubtype || "product";
  const mods = getPersonaBlogModifiers(persona, subtype, ctx);
  const seed = hashSeed(
    `${ctx.region}|${ctx.main}|${ctx._regenAttempt || 0}|${persona}`
  );
  const usedHeadings = new Set();
  const sections = [];
  const research = brandResearchLines(ctx);
  const contextBullets = (ctx.brandContextItems || [])
    .slice(0, 3)
    .map((i) => i.value);

  sections.push({
    heading: scene.heading,
    body: [scene.opener, scene.experienceLines[0]].filter(Boolean).join("\n\n"),
  });

  const exp1 = scene.experienceLines[1] || scene.experienceLines[0];
  sections.push({
    heading: pickFlowHeading(seed, usedHeadings, [
      headingFromMoment(exp1),
      headingFromMoment(scene.opener),
      scene.heading,
    ]),
    body: exp1,
  });

  if (scene.experienceLines[2]) {
    sections.push({
      heading: pickFlowHeading(seed + 2, usedHeadings, [
        headingFromMoment(scene.experienceLines[2]),
        headingFromMoment(scene.experienceLines[0]),
      ]),
      body: scene.experienceLines[2],
    });
  }

  const empathyBody = mods.empathyPool[seed % mods.empathyPool.length];
  const safeEmpathy = isBusinessPracticalIndustry(ctx)
    ? pick(BUSINESS_FIRST_LINES, seed + 2)
    : normalizeLine(empathyBody);
  sections.push({
    heading: pickFlowHeading(seed + 4, usedHeadings, [
      headingFromMoment(empathyBody),
      "비슷한 날, 비슷한 마음",
    ]),
    body: safeEmpathy,
  });

  const infoLines = [
    contextBullets[0] || null,
    research[0] || null,
    mods.whyPool?.[seed % (mods.whyPool?.length || 1)],
    ctx.includeList?.[0]
      ? `${ctx.includeList[0]} — 그날 필요했던 포인트예요.`
      : null,
  ].filter(Boolean);

  if (infoLines.length) {
    const infoBody = infoLines.join("\n\n");
    sections.push({
      heading: pickFlowHeading(seed + 6, usedHeadings, [
        headingFromMoment(infoBody),
        "막상 필요한 날이 오면",
      ]),
      body: infoBody,
    });
  }

  const intentLine = ctx.contentThesis
    ? `이 글에서 말하고 싶은 것은, ${ctx.contentThesis}`
    : null;

  const bridge = [
    intentLine,
    ...scene.bridgeLines.filter(Boolean),
    research[1],
    ...(mods.brandBridgePool || []).filter(Boolean),
    ctx.brandName && sUniqueness(ctx) && persona === "brand_story"
      ? `${ctx.brandName}은(는) ${sUniqueness(ctx)}`
      : null,
  ].filter(Boolean);

  if (bridge.length) {
    const bridgeBody = bridge.join("\n\n");
    const brandHeading =
      ctx.brandName && mods.brandHeading && !isBannedHeading(mods.brandHeading)
        ? mods.brandHeading
        : pickFlowHeading(seed + 8, usedHeadings, [
            headingFromMoment(bridgeBody),
            ctx.brandName ? `${ctx.brandName}, 그날의 인상` : null,
          ]);
    sections.push({
      heading: rewriteBannedHeading(brandHeading, bridgeBody),
      body: bridgeBody,
    });
  }

  return { sections: sections.slice(0, 7), scene, personaModifiers: mods };
}

function sUniqueness(ctx) {
  const u = ctx.brandResearch?.summary?.uniqueness;
  if (!u || u.length > 80) return ctx.brandResearch?.summary?.operationStyle || null;
  return u.replace(/^.+—\s*/, "").slice(0, 60);
}

/** 플레이스·인스타용 짧은 장면 한 줄 */
export function pickSceneLine(ctx, flavor, used = new Set()) {
  const scene = pickScene(ctx, flavor);
  const candidates = [scene.opener, ...scene.experienceLines].filter(Boolean);
  for (const c of candidates) {
    if (!used.has(c) && c.length < 80) {
      used.add(c);
      return c;
    }
  }
  return scene.opener;
}

export function pickSceneHook(ctx, flavor) {
  const scene = pickScene(ctx, flavor);
  const line = scene.experienceLines[0] || scene.opener;
  const short = line.split(/[.!?]/)[0]?.trim();
  return short?.length > 12 && short.length < 48
    ? short
    : scene.heading.replace(/,.*/, "");
}
