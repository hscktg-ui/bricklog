/**
 * 실제 지점 인스타·플레이스 감성 — 오픈 공지 / 일상 무드 / 제품·프로모 / 클래스
 * (블로그 요약체·체험 후기 톤과 구분)
 */
import { regionCompact } from "@/lib/prompts/engine/textUtils";
import { topicWritingFacet } from "@/lib/content/topicFacetEngine";

export const BRANCH_INSTA_ARCHETYPES = [
  "store_open",
  "daily_mood",
  "product_feature",
  "class_experience",
  "promo_event",
];

const DIVIDER = "-";

function cleanLine(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

function pickEmoji(kind, archetype) {
  if (kind === "flower") {
    if (archetype === "store_open") return "🌿💐";
    if (archetype === "promo_event") return "🌸";
    return "💐🌿";
  }
  if (kind === "furniture") return "✨";
  if (kind === "workshop") return "🍃";
  return "";
}

export function resolveIndustryKindForBranch(input = {}) {
  const ind = String(input.industry || input.industryText || "").toLowerCase();
  const topic = String(input.topic || input.mainKeyword || "").toLowerCase();
  const blob = `${ind} ${topic}`;
  if (/가구|침대|매트리스|쇼룸|소파|템퍼|에이스/.test(blob)) return "furniture";
  if (/꽃|플로리스트|플라워|무인/.test(blob)) return "flower";
  if (/다원|티\s*클래스|tea\s*class|차\s*클래스|다도|공예|도예|원데이/.test(blob)) return "workshop";
  if (/카페|커피|디저트/.test(blob)) return "cafe";
  if (/클래스|체험|공방/.test(blob)) return "workshop";
  if (/음식|맛집|식당/.test(blob)) return "food";
  return "general";
}

/**
 * @param {object} input
 * @returns {"store_open"|"daily_mood"|"product_feature"|"class_experience"|"promo_event"}
 */
export function resolveBranchInstaArchetype(input = {}) {
  const blob = [
    input.topic,
    input.mainKeyword,
    input.placeOffer,
    input.placePeriod,
    input.instaScene,
    input.placeHeadline,
    input.placePostType,
    input.benefit,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/오픈|신규|호점|입점|그랜드\s*오픈|오픈했|오픈해|신규\s*매장|n호점|\d+\s*호점/.test(blob)) {
    return "store_open";
  }
  if (
    /프로모|할인|혜택|행사|웨딩|증정|%\s*할인|benefit|기간\s*한정|이벤트\s*안내/.test(
      blob
    )
  ) {
    return "promo_event";
  }
  if (
    /클래스|tea\s*class|티\s*클래스|티클래스|체험|강좌|원데이|다도|워크숍|레슨|다원\s*tea/i.test(
      blob
    )
  ) {
    return "class_experience";
  }
  if (
    /매트리스|침대|모션|제품|모델|opimo|프레임|쿠션|설치|체험\s*가능\s*모델/.test(
      blob
    ) ||
    input.placePostType === "newProduct"
  ) {
    return "product_feature";
  }
  if (input.instaHookAngle === "informative" && resolveIndustryKindForBranch(input) === "furniture") {
    return "product_feature";
  }
  if (input.instaCampaignGoal === "visit" && /오픈|신규/.test(blob)) {
    return "store_open";
  }
  return "daily_mood";
}

function formatAddressBlock(input = {}) {
  const region = cleanLine(input.region);
  const address = cleanLine(input.address);
  const hint = cleanLine(input.storeFeatures || input.placeDetailHint);
  const lines = [];
  if (region || address) {
    lines.push("📍 " + [region, address].filter(Boolean).join("\n"));
  }
  if (hint && !address?.includes(hint.slice(0, 12))) {
    lines.push(hint);
  }
  return lines;
}

function formatContactFooter(input = {}, brand = "") {
  const lines = [];
  if (brand) lines.push(`• ${brand}`);
  if (input.phone) lines.push(`• ${input.phone}`);
  if (input.address) lines.push(`• ${cleanLine(input.address)}`);
  if (input.hours) lines.push(`• ${input.hours}`);
  return lines;
}

function buildStoreOpenCaption(input = {}, ctx = {}) {
  const brand = cleanLine(ctx.brandName || input.brandName);
  const region = cleanLine(ctx.region || input.region);
  const head = topicWritingFacet(input);
  const kind = resolveIndustryKindForBranch(input);
  const em = pickEmoji(kind, "store_open");
  const branchNote = cleanLine(input.instaScene || input.placeHeadline || head);
  const hook = branchNote.includes("오픈")
    ? `${branchNote} ${em}`.trim()
    : `${brand}${region ? ` ${region}` : ""}, ${head} 오픈했습니다 ${em}`.trim();

  const body = [];
  body.push(DIVIDER);
  for (const line of formatAddressBlock(input)) body.push(line);
  body.push(DIVIDER);

  const features = cleanLine(input.storeFeatures);
  const story =
    cleanLine(input.brandDescription) ||
    (kind === "flower"
      ? `${brand}는 예약 없이 바로 구매 가능한 무인 시스템과 24시간 운영으로 언제든 편하게 이용하실 수 있습니다.`
      : `${brand}를 찾아주시는 분들께 ${region ? `${region} ` : ""}에서도 편하게 만나 뵙겠습니다.`);

  if (story && story !== features) body.push(story);

  const offer = cleanLine(input.placeOffer || input.benefit);
  if (offer) body.push(offer);

  if (kind === "flower") {
    body.push(
      "매일 아침 채워지는 신선한 꽃다발을 부담 없이 만나보세요 🌸 산책 중에도, 퇴근 후에도 가볍게 들러 고르고 바로 결제하실 수 있습니다."
    );
  }

  body.push(DIVIDER);
  body.push(
    `언제나 어디서나 ${brand ? `${brand}는 ` : ""}오늘도 열려 있습니다 🌼`
  );

  return { hook, body, ending: brand ? `${brand} · 프로필·플레이스에서 위치 확인` : "" };
}

function buildDailyMoodCaption(input = {}, ctx = {}) {
  const brand = cleanLine(ctx.brandName || input.brandName);
  const region = cleanLine(ctx.region || input.region);
  const em = pickEmoji(resolveIndustryKindForBranch(input), "daily_mood");

  const hook = cleanLine(input.instaScene) || `오늘도 아침마다 싱그러운 하루를 열었습니다 ${em}`;

  const body = [
    "새벽 공기 속에서 하루가 조금 더 따뜻해지길 바라는 마음으로",
    "정성껏 준비하는 이 시간이",
    "여러분 일상의 작은 행복이 되었으면 좋겠습니다.",
    "",
    brand
      ? `함께하는 ${brand} 팀이 오늘도 준비한 이야기를 담아봤어요 🌿✨`
      : "오늘도 조용히, 그리고 반가운 마음으로 준비했습니다 🌿✨",
    DIVIDER,
    `언제나 ${brand || "이곳"}는 변함없이 여러분 곁에 있겠습니다 ${em}`,
  ];

  if (region) {
    body.splice(1, 0, `${region}, 문득 이곳이 떠올라 짧게 남겨봤어요.`);
  }

  return { hook, body, ending: brand ? `${brand} · DM 편하게 주세요` : "" };
}

function buildProductFeatureCaption(input = {}, ctx = {}) {
  const brand = cleanLine(ctx.brandName || input.brandName);
  const region = cleanLine(ctx.region || input.region);
  const head = topicWritingFacet(input);
  const product = cleanLine(input.placeOffer || input.instaScene || head);

  const hook = product.length > 8 ? product : `${brand} ${head}, 매장에서 확인해 보세요 ✨`;

  const bullets = [
    "✔ 매장에서 직접 보고 상담받을 수 있는 구성",
    "✔ 침실·거실 분위기에 맞춘 실사용 포인트 안내",
    "✔ 배송·설치 일정은 매장·지역에 따라 달라질 수 있어요",
  ];
  const custom = cleanLine(input.storeFeatures);
  if (custom) {
    const parts = custom.split(/[•\n]|(?=✔)/).map(cleanLine).filter((l) => l.length > 4);
    if (parts.length > 1) {
      bullets.length = 0;
      for (const p of parts.slice(0, 6)) {
        bullets.push(p.startsWith("✔") ? p : `✔ ${p}`);
      }
    } else {
      bullets.unshift(`✔ ${custom}`);
    }
  }

  const body = [
    "♪ .•¨•.¸¸♬✧",
    ...bullets,
    "",
    `${region ? `${region} ` : ""}${brand}에서 ${head} 관련 상담 받아보세요.`,
    DIVIDER,
    ...(input.placePeriod ? [`📅 ${input.placePeriod}`, ""] : []),
    "🙌 매장에서 직접 체험해 보세요 🙌",
    ...formatContactFooter(input, brand),
  ];

  return { hook, body, ending: brand ? `${brand} · 전화·플레이스 문의` : "" };
}

function buildClassExperienceCaption(input = {}, ctx = {}) {
  const brand = cleanLine(ctx.brandName || input.brandName);
  const region = cleanLine(ctx.region || input.region);
  const head = topicWritingFacet(input);

  const hook = `${brand} ${head} 🍃`;

  const body = [
    region ? `📍 ${region}` : "",
    input.address ? cleanLine(input.address) : "",
    input.phone ? `📞 ${input.phone}` : "",
    "",
    `차를 「배우는」 시간이 아닌, 차를 「느끼는」 시간`,
    "",
    "✔ 클래스 구성·진행 방식 안내",
    "✔ 예약·인원·준비물은 문의 시 안내",
    "✔ 현장 체험 후 취향에 맞는 차 추천",
    DIVIDER,
    "「한 잔에 담긴 향·온기·여운을 천천히 느끼는 시간」",
    DIVIDER,
    `${brand} · 예약은 플레이스·전화로 문의해 주세요.`,
  ].filter(Boolean);

  return { hook, body, ending: "" };
}

function buildPromoEventCaption(input = {}, ctx = {}) {
  const brand = cleanLine(ctx.brandName || input.brandName);
  const head = topicWritingFacet(input);
  const period = cleanLine(input.placePeriod || input.benefit);
  const offer = cleanLine(input.placeOffer);

  const hook = `${brand} ${head} 안내 💍`;

  const body = [
    DIVIDER,
    period ? `📅 ${period}` : "📅 행사 기간은 플레이스·매장 공지 기준",
    "",
    offer || "✔ 매장·플레이스 공지의 혜택·조건을 확인해 주세요.",
    "✔ 전 품목·구성은 매장 재고·일정에 따라 달라질 수 있어요.",
    "✔ 자세한 적용 조건은 방문·전화 상담 시 안내",
    DIVIDER,
    "📌 혜택·증정품은 구매 구성에 따라 달라질 수 있습니다.",
    DIVIDER,
    `${brand} · 매장·플레이스에서 일정·혜택 확인`,
  ];

  return { hook, body, ending: "" };
}

/**
 * @returns {{ hook: string, body: string[], ending: string, archetype: string } | null}
 */
export function buildBranchInstaCaption(input = {}, ctx = {}) {
  const archetype = resolveBranchInstaArchetype(input);
  let built;
  switch (archetype) {
    case "store_open":
      built = buildStoreOpenCaption(input, ctx);
      break;
    case "product_feature":
      built = buildProductFeatureCaption(input, ctx);
      break;
    case "class_experience":
      built = buildClassExperienceCaption(input, ctx);
      break;
    case "promo_event":
      built = buildPromoEventCaption(input, ctx);
      break;
    default:
      built = buildDailyMoodCaption(input, ctx);
  }
  if (!built?.hook) return null;
  return { ...built, archetype };
}

/**
 * 지점 인스타형 로컬 해시태그 보강
 */
export function buildBranchInstaHashtagBoost(input = {}, ctx = {}) {
  const brand = cleanLine(ctx.brandName || input.brandName);
  const region = cleanLine(ctx.region || input.region);
  const rc = regionCompact(region);
  const kind = resolveIndustryKindForBranch(input);
  const tag = (s) => (s ? `#${s.replace(/\s+/g, "")}` : "");
  const out = [tag(brand), tag(rc), tag(topicWritingFacet(input))];

  if (kind === "flower") {
    out.push(
      tag(`${rc}꽃집`),
      tag("무인꽃집"),
      tag("24시간꽃집"),
      "#꽃스타그램",
      "#플라워스타그램",
      "#꽃선물",
      "#일상기록",
      "#감성꽃집"
    );
  } else if (kind === "furniture") {
    out.push(tag(`${rc}침대`), tag(`${rc}매트리스`), "#가구스타그램", "#인테리어");
  } else if (kind === "workshop") {
    out.push("#클래스", "#체험", "#힐링클래스", "#감성여행");
  }
  return [...new Set(out.filter(Boolean))];
}
