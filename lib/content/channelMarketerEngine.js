/**
 * BRICLOG Channel Marketer Engine — 스마트플레이스·인스타 전문 마케터/인플루언서 관점
 * 블로그 요약·키워드 나열·원문 주제 붙여넣기 금지
 */
import { getChannelFullText } from "@/lib/content/channelPack";
import { PLACE_CHANNEL } from "@/styles/channels/placeStyle";
import { INSTAGRAM_CHANNEL } from "@/styles/channels/instagramStyle";
import {
  isMechanicalListingTitle,
} from "@/lib/content/humanTitleEngine";
import {
  sanitizeVerbatimTopicInPack,
  topicWritingFacet,
  topicReaderPhrase,
  topicRaw,
} from "@/lib/content/informationUnitEngine";
import {
  resolveContentPerspective,
  getPerspectiveDef,
} from "@/lib/content/perspectiveEngine";
import {
  getPlacePersonaStyle,
  getInstaPersonaStyle,
} from "@/lib/persona/personaChannelStyle";
import { toInstaLineBreaks, koreanObjectParticle, koreanSubjectParticle } from "@/lib/prompts/engine/textUtils";
import { adaptPlaceLineFromBlog } from "@/lib/content/blogDerive";
import {
  buildBranchInstaCaption,
  buildBranchInstaHashtagBoost,
  resolveBranchInstaArchetype,
} from "@/lib/content/branchInstaCaptionEngine";
import { stripEditorAuditSentences } from "@/lib/content/editorQualityEngine";

const BLOG_TONE_RE =
  /(이번\s*글|결론적으로|정리하면|소제목|서론|본론|마무리|알아보시다\s*보면|검색하시는\s*분)/;

const INSTA_BLOG_LEAK_RE =
  /홍보보다|결론(?:적|부터)|체크리스트|알아보(?:시다|볼)|확인할\s*포인트|SEO|키워드/;

const PLACE_BLOG_TITLE_RE =
  /(다녀온|체험\s*전|체험\s*후|후기|비교\s*전|헷갈리|솔직|FAQ|읽을\s*거|알아둘\s*것)/;

const GENERIC_PLACE_TITLE_RE =
  /^(봄|여름|가을|겨울)\s*(운영\s*안내|관련\s*안내)|운영\s*안내드립니다/i;

const PLACE_MARKETER_BRIEF = `【스마트플레이스 · 전문 마케터 관점】
- 사장님/매장 운영자 공지 — 블로그 요약·칼럼 톤 금지.
- 한 게시물 = 핵심 메시지 1개 (입고·행사·예약·운영·혜택).
- title: 방문·확인하고 싶게, 키워드 나열 금지.
- shortNotice: 한 줄 공지 / detailBody: 조건·기간·방문 포인트 2~3줄.
- CTA: 플레이스·전화·예약 — 과장·「지금 바로」 남발 금지.`;

const INSTA_MARKETER_BRIEF = `【인스타그램 · 지점 SNS 감성】
- 실제 매장 인스타: 오픈 공지(📍주소·-구분선), 감성 일상(짧은 시·줄바꿈), 제품(✔불릿), 클래스(체험·인용), 프로모(📅기간·혜택).
- 블로그 요약·체험후기·「다녀왔어요」 연속 톤 금지.
- hook: 오픈/소재 한 줄 + 이모지 1~2개 / body: 1~2문장마다 줄바꿈, - 구분선 활용.
- ending: 프로필·플레이스·DM — 「저장해두세요」 금지.
- 해시태그 8~15개(지역+업종+브랜드), #일산꽃집 형태 지역 결합 태그 포함.`;

function cleanField(text) {
  return stripEditorAuditSentences(String(text || "").trim());
}

/** 제목·캡션용 — trailing 「소식」 중복 방지 */
function facetHeadline(input = {}) {
  const facet = topicWritingFacet(input);
  return facet.replace(/\s+소식\s*$/i, "").trim() || facet;
}

function dedupeChannelLines(text = "") {
  const lines = String(text || "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const seen = new Set();
  const kept = [];
  for (const line of lines) {
    const key = line.replace(/\s/g, "").slice(0, 56);
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(line);
  }
  return kept.join("\n\n");
}

function lineAlreadyInDetail(detail, line) {
  const needle = String(line || "")
    .replace(/\s/g, "")
    .slice(0, 24);
  if (!needle) return true;
  const body = String(detail || "").replace(/\s/g, "");
  if (body.includes(needle)) return true;
  if (/주차|영업\s*시간/.test(line) && /주차|영업\s*시간/.test(detail)) return true;
  return false;
}

function blogSceneLineForPlace(ctx = {}, input = {}) {
  const ins = ctx.insights || ctx.blogInsights || input.blogInsights;
  const blob = [
    ins?.excerpt,
    ...(ins?.sectionHooks || []),
    ...(ins?.sceneLines || []),
    ...(ins?.emotionalBeats || []),
    ...(ins?.practicalTips || []),
    ...(ins?.visitReasons || []),
  ]
    .filter(Boolean)
    .join(" ");
  const sentences = blob
    .split(/(?<=[.!?。])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\s/g, "").length >= 12);
  const line =
    sentences.find((s) => /직접/.test(s)) ||
    sentences.find((s) => /솔직/.test(s)) ||
    sentences.find((s) => /들러|보니|다녀|방문/.test(s)) ||
    sentences[0];
  if (!line) return null;
  const trimmed = cleanField(String(line)).slice(0, 88);
  if (/직접|솔직|들러|보니|다녀|방문/.test(trimmed)) return trimmed;
  return adaptPlaceLineFromBlog(trimmed, ins, 88);
}

function placeTitleSuffix(head) {
  const h = String(head || "").trim();
  if (!h) return "운영 안내";
  if (/(안내|소식|확인|문의)$/.test(h)) return h;
  return `${h} 안내`;
}

function resolveIndustryKind(input = {}) {
  const ind = String(input.industry || input.industryText || "");
  if (/가구|침대|매트리스|쇼룸|소파/.test(ind)) return "furniture";
  if (/꽃|플로리스트|플라워/.test(ind)) return "flower";
  if (/반려|펫|애견|고양이/.test(ind)) return "pet";
  if (/인테리어|리모델|홈스타일링/.test(ind)) return "interior";
  if (/펜션|숙박|호텔|게스트하우스/.test(ind)) return "lodging";
  if (/공방|원데이|체험\s*클래스|핸드메이드/.test(ind)) return "workshop";
  if (/약국/.test(ind)) return "pharmacy";
  if (/부동산|중개|임대/.test(ind)) return "realestate";
  if (/법률|세무|노무|변호/.test(ind)) return "legal";
  if (/패션|리테일|의류|뷰티\s*샵/.test(ind)) return "retail";
  if (/쇼핑몰|이커머스|온라인/.test(ind)) return "ecommerce";
  if (/카페|커피|디저트/.test(ind)) return "cafe";
  if (/음식|맛집|식당|한식|일식|중식/.test(ind)) return "food";
  if (/요가|피트니스|헬스|필라|운동/.test(ind)) return "fitness";
  if (/치과|병원|의료|한의|피부/.test(ind)) return "medical";
  if (/미용|헤어|네일|피부과/.test(ind)) return "beauty";
  if (/학원|교육|과외|입시/.test(ind)) return "academy";
  return "general";
}

/** 가구 전용 문구(체험 가능 모델)가 타 업종 플레이스에 섞이지 않도록 */
function buildPlaceScheduleLine(input = {}) {
  const kind = resolveIndustryKind(input);
  if (kind === "furniture") {
    return `전시·체험 가능 모델과 일정은 매장·시기마다 달라질 수 있어요.`;
  }
  if (kind === "medical") {
    return `상담·시술 일정과 대기는 매장·시기마다 달라질 수 있어요.`;
  }
  if (kind === "food" || kind === "cafe") {
    return `메뉴·좌석·예약 가능 여부는 매장·시기마다 달라질 수 있어요.`;
  }
  if (kind === "flower") {
    return `꽃 재고·맞춤 제작 일정은 매장·시기마다 달라질 수 있어요.`;
  }
  if (kind === "pet") {
    return `패키지 구성·예약 가능 시간은 매장·시기마다 달라질 수 있어요.`;
  }
  if (kind === "fitness") {
    return `수업·체험 일정과 정원은 매장·시기마다 달라질 수 있어요.`;
  }
  return `서비스·예약 일정은 매장·시기마다 달라질 수 있어요.`;
}

function buildInstaSceneLines(input, ctx) {
  const brand = String(ctx.brandName || input.brandName || "").trim();
  const region = String(ctx.region || input.region || "").trim();
  const head = facetHeadline(input);
  const kind = resolveIndustryKind(input);

  if (kind === "furniture") {
    return [
      `${region ? `${region}, ` : ""}${head} 보러 다녀왔어요.`,
      `쇼룸 문 열자마`,
      `직접 누워보고 나니`,
      `쇼룸 무드가 달랐더라구요.`,
      `순간 마음이 편해졌어요.`,
      brand ? `${brand} · 프로필·플레이스에 더 올려둘게요.` : "프로필·플레이스에서 이어서 보면 돼요.",
    ];
  }
  if (kind === "flower") {
    return [
      `${region ? `${region} ` : ""}${head}`,
      `졸업식 날, 문득 들러보고 싶어져서`,
      `실물로 보니`,
      `사진이랑 또 달랐더라구요.`,
      `꽃 무드가 더 맘에 들었어요.`,
      `기분 전환 되더라구요.`,
      brand ? `${brand} · DM 편하게 주세요.` : "DM 편하게 주세요.",
    ];
  }
  if (kind === "cafe") {
    return [
      `${region ? `${region}, ` : ""}${head}`,
      `문득 들르고 싶어져서`,
      `좌석에 앉아보니`,
      `카페 분위기까지 좋더라구요.`,
      `순간 기분이 올라갔어요.`,
      `다음에 또 올 것 같아요.`,
      brand ? `${brand} · 프로필·플레이스` : "프로필·플레이스",
    ];
  }
  if (kind === "interior") {
    return [
      `${region ? `${region}, ` : ""}${head}`,
      `상담 받아보고`,
      `실물 샘플 보니`,
      `집 분위기가 달라질 것 같더라구요.`,
      brand ? `${brand} · 플레이스·DM 문의` : "플레이스·DM 문의",
    ];
  }
  if (kind === "lodging") {
    return [
      `${region ? `${region}, ` : ""}${head}`,
      `주말에 다녀왔어요.`,
      `방 들어서자마`,
      `숙소 무드가 편했더라구요.`,
      brand ? `${brand} · 예약은 프로필·플레이스` : "예약은 프로필·플레이스",
    ];
  }
  if (kind === "workshop") {
    return [
      `${region ? `${region}, ` : ""}${head}`,
      `문득 신청했어요.`,
      `직접 만들어 보니`,
      `공방 분위기도 좋더라구요.`,
      `또 하고 싶었어요.`,
      brand ? `${brand} · 클래스 예약 DM` : "클래스 예약 DM",
    ];
  }
  if (kind === "pharmacy") {
    return [
      `${region ? `${region}, ` : ""}${head}`,
      `문득 들러서`,
      `약사님이 차분히 설명해 주셔서`,
      `순간 안심됐더라구요.`,
      brand ? `${brand} · 문의는 플레이스·전화` : "문의는 플레이스·전화",
    ];
  }
  if (kind === "realestate") {
    return [
      `${region ? `${region}, ` : ""}${head}`,
      `문득 상담 받아봤어요.`,
      `현장 같이 보니`,
      `조건 정리가 빨라지더라구요.`,
      `순간 안심됐어요.`,
      brand ? `${brand} · 예약은 플레이스·전화` : "예약은 플레이스·전화",
    ];
  }
  if (kind === "legal") {
    return [
      `${region ? `${region}, ` : ""}${head}`,
      `문득 초기 상담 받았어요.`,
      `절차 설명 들으니`,
      `순간 마음이 놓이더라구요.`,
      `차분한 분위기였어요.`,
      brand ? `${brand} · 예약은 전화·플레이스` : "예약은 전화·플레이스",
    ];
  }
  if (kind === "retail") {
    return [
      `${region ? `${region}, ` : ""}${head}`,
      `문득 들렀어요.`,
      `매장 분위기 보니`,
      `코디가 딱 맞더라구요.`,
      `기분까지 올라갔어요.`,
      brand ? `${brand} · 프로필·DM` : "프로필·DM",
    ];
  }
  if (kind === "ecommerce") {
    return [
      `${head}`,
      `문득 주문해 봤어요.`,
      `받아보니`,
      `사진이랑 거의 같더라구요.`,
      `순간 만족했어요.`,
      `데일리로 쓰기 좋았어요.`,
      brand ? `${brand} · 프로필 링크 확인` : "프로필 링크 확인",
    ];
  }
  if (kind === "pet") {
    return [
      `${region ? `${region}, ` : ""}${head}`,
      `우리 아이랑 같이 갔어요.`,
      `공간 분위기 보니`,
      `또 가고 싶더라구요.`,
      brand ? `${brand} · DM으로 예약 문의 주세요.` : "DM으로 예약 문의 주세요.",
    ];
  }
  if (kind === "food") {
    return [
      `${region ? `${region}, ` : ""}${head}`,
      `문득 들러봤어요.`,
      `한 입 먹어보니`,
      `생각보다 맛있더라구요.`,
      `분위기도 좋았어요.`,
      brand ? `${brand} · 프로필·플레이스 확인` : "프로필·플레이스 확인",
    ];
  }
  if (kind === "fitness") {
    return [
      `${region ? `${region}, ` : ""}${head}`,
      `수업 한번 들어보고`,
      `몸이 좀 풀리더라구요.`,
      `분위기도 편했어요.`,
      brand ? `${brand} · 체험 문의 환영해요.` : "체험 문의 환영해요.",
    ];
  }
  if (kind === "medical") {
    return [
      `${region ? `${region}, ` : ""}${head}`,
      `문득 상담 예약 잡았어요.`,
      `직접 받아보니`,
      `설명이 차분해서`,
      `순간 마음이 놓였더라구요.`,
      brand ? `${brand} · 예약은 플레이스·전화` : "예약은 플레이스·전화",
    ];
  }
  if (kind === "beauty") {
    return [
      `${region ? `${region}, ` : ""}${head}`,
      `거울 보는 순간`,
      `스타일이 딱 맞더라구요.`,
      `기분까지 올라갔어요.`,
      brand ? `${brand} · DM·플레이스 예약` : "DM·플레이스 예약",
    ];
  }
  if (kind === "academy") {
    return [
      `${region ? `${region}, ` : ""}${head}`,
      `문득 상담 받아봤어요.`,
      `커리큘럼이 명확하더라구요.`,
      `순간 안심됐어요.`,
      brand ? `${brand} · 문의는 플레이스·전화` : "문의는 플레이스·전화",
    ];
  }
  return [
    `${region ? `${region}, ` : ""}${head}`,
    `문득 떠올라서`,
    `직접 가봤어요.`,
    `마음에 들더라구요.`,
    brand ? `${brand} · 프로필 확인` : "프로필에서 확인",
  ];
}

function scrubInstaBlogLeak(text) {
  return String(text || "")
    .replace(/홍보보다\s*확인할\s*포인트[^.\n]*\.?/g, "")
    .replace(/한\s*줄\s*홍보보다[^.\n]*\.?/g, "")
    .replace(/결론보다\s*기준[^.\n]*\.?/g, "")
    .replace(/입력·공개\s*맥락[^.\n]*\.?/g, "")
    .replace(/✔[^\n]*/g, "")
    .replace(/🌿|🎁|🏠/g, "")
    .replace(/결론(?:적|부터)/g, "마지막에")
    .replace(/예약·문의는\s*프로필·플레이스에서\s*이어서\s*보면\s*됩니다\.?/g, "프로필·플레이스에서 이어서 보면 돼요.")
    .replace(/알아볼\s*때/g, "궁금할 때")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function instaCaptionVoiceWeak(body) {
  const b = String(body || "");
  const hasHaeyo = /(?:더라구요|더라고요|같아요|해요|했어요|어요|네요)/.test(b);
  const hasScene = /(?:분위기|무드|문득|순간|그날|장면)/.test(b);
  return !hasHaeyo || !hasScene;
}

function instaBodyNeedsRewrite(body) {
  const b = String(body || "");
  return (
    b.replace(/\s/g, "").length < 120 ||
    BLOG_TONE_RE.test(b) ||
    INSTA_BLOG_LEAK_RE.test(b) ||
    /운영\s*포인트|결론보다|홍보보다|입력·공개/.test(b) ||
    instaCaptionVoiceWeak(b)
  );
}

function perspectivePersona(input = {}) {
  const resolved = resolveContentPerspective(input);
  const map = {
    brand: "brand_story",
    customer: "visit_review",
    informational: "info_intro",
    expert: "info_intro",
    comparison: "info_intro",
    review: "visit_review",
    storytelling: "brand_story",
  };
  return map[resolved.perspective] || "brand_story";
}

function buildPlaceTitle(pack, ctx, input) {
  const brand = String(ctx.brandName || input.brandName || "").trim();
  const region = String(ctx.region || input.region || "").trim();
  const facet = topicWritingFacet(input);
  const head = facetHeadline(input);
  let title = cleanField(pack?.title || "");
  const needsRewrite =
    title.length < 8 ||
    (brand && !title.includes(brand)) ||
    isMechanicalListingTitle(title, ctx, input) ||
    BLOG_TONE_RE.test(title) ||
    PLACE_BLOG_TITLE_RE.test(title) ||
    GENERIC_PLACE_TITLE_RE.test(title) ||
    /\b소식\s+소식\b/.test(title);
  if (!needsRewrite) return title.slice(0, 44);

  const resolved = resolveContentPerspective(input);
  const byPerspective = {
    brand: region && brand ? `${region} ${brand}, ${head} 운영 안내` : null,
    customer: brand ? `${brand} — ${head} 문의·예약 안내` : null,
    informational: region && brand ? `${region} ${brand}, ${head} 확인·방문 안내` : null,
    expert: brand ? `${brand} ${head}, 선택 전 확인 사항` : null,
    comparison: brand ? `${brand} ${head}, 비교·문의 안내` : null,
    review: region && brand ? `${region} ${brand} — ${head} 체험·방문 안내` : null,
    storytelling: brand ? `${brand} · ${head} 안내` : `${head} 안내`,
  };
  const headSuffix = placeTitleSuffix(head);
  const candidates = [
    byPerspective[resolved.perspective],
    region && brand ? `${region} ${brand}, ${headSuffix}` : null,
    brand ? `${brand} — ${headSuffix}` : null,
    region ? `${region}, ${headSuffix}` : null,
  ].filter(Boolean);
  title = candidates[0] || `${brand || "매장"} ${headSuffix}`;
  return title.slice(0, 44);
}

function buildPlaceNotice(pack, ctx, input) {
  const existing = cleanField(pack?.shortNotice || pack?.shortBody || "");
  if (existing.length >= 40 && !BLOG_TONE_RE.test(existing)) return existing.slice(0, 120);
  const brand = String(ctx.brandName || input.brandName || "").trim();
  const region = String(ctx.region || input.region || "").trim();
  const head = facetHeadline(input);
  const prefix = region ? `[${region}] ` : "";
  return `${prefix}${brand ? `${brand} ` : ""}${head} 관련 매장 소식 안내드립니다. 방문·예약은 플레이스에서 확인해 주세요.`.slice(
    0,
    120
  );
}

function buildPlaceDetail(pack, ctx, input) {
  let detail = dedupeChannelLines(cleanField(pack?.detailBody || ""));
  const detailLen = detail.replace(/\s/g, "").length;
  if (detailLen >= 110 && !BLOG_TONE_RE.test(detail)) {
    return detail.slice(0, 380);
  }
  const brand = String(ctx.brandName || input.brandName || "").trim();
  const region = String(ctx.region || input.region || "").trim();
  const head = facetHeadline(input);
  const persona = perspectivePersona(input);
  const style = getPlacePersonaStyle(input.contentPersona || persona, { ...ctx, ...input });
  const salvage =
    detailLen >= 40 && !BLOG_TONE_RE.test(detail) ? detail : "";
  const ins = ctx.insights || ctx.blogInsights || input.blogInsights;
  const blogLine = blogSceneLineForPlace(ctx, input);
  const blogTip = (ins?.practicalTips || [])[0];
  const coreLines = [
    `${region ? `${region} ` : ""}${brand ? `${brand}, ` : ""}${head} 소식 전해드려요.`,
    blogLine,
    blogTip ? cleanField(String(blogTip)).slice(0, 88) : null,
    buildPlaceScheduleLine(input),
    `방문·예약은 플레이스 공지와 전화 문의로 확인할 수 있으며, 주차·영업 시간도 같은 경로에서 함께 안내드리고 있어요.`,
    style.detailHint && !/주차|영업\s*시간/.test(style.detailHint)
      ? style.detailHint
      : null,
    "문의는 플레이스·전화로 편하게 남겨 주세요.",
  ].filter((line) => line && !lineAlreadyInDetail(salvage, line));
  const lines = salvage ? [salvage, ...coreLines] : coreLines;
  return dedupeChannelLines(lines.filter(Boolean).join("\n\n")).slice(0, 380);
}

function detectChannelVerbatimTopic(pack, channel, input = {}) {
  const raw = topicRaw(input);
  const facet = topicWritingFacet(input);
  if (!raw || raw.replace(/\s/g, "").length < 4) {
    return { ok: true, count: 0 };
  }
  if (raw.replace(/\s/g, "") === facet.replace(/\s/g, "")) {
    return { ok: true, count: 0, facetOnly: true };
  }
  const full = getChannelFullText(pack, channel);
  const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const count = (full.match(new RegExp(escaped, "g")) || []).length;
  return { ok: count <= 1, count };
}

function finalizeInstaHook(hook, ctx, input, fallback) {
  let next = String(hook || "").trim();
  if (
    next.length < 12 ||
    BLOG_TONE_RE.test(next) ||
    isMechanicalListingTitle(next, ctx, input)
  ) {
    next = fallback;
  }
  if (isMechanicalListingTitle(next, ctx, input)) {
    const brand = String(ctx.brandName || input.brandName || "").trim();
    const facet = topicWritingFacet(input);
    next = `${brand || "매장"} ${facet}, 한 번쯤`;
  }
  return next.slice(0, 56);
}

function buildInstaHook(pack, ctx, input) {
  const archetype = resolveBranchInstaArchetype(input);
  const branchCaption = buildBranchInstaCaption(input, ctx);
  if (archetype !== "daily_mood" && branchCaption?.hook) {
    const hook = scrubInstaBlogLeak(branchCaption.hook).slice(0, 56);
    if (hook.length >= 8) return hook;
  }
  const existing = scrubInstaBlogLeak(cleanField(pack?.hook || ""));
  const region = String(ctx.region || input.region || "").trim();
  const brand = String(ctx.brandName || input.brandName || "").trim();
  const head = facetHeadline(input);
  const resolved = resolveContentPerspective(input);
  const hooks = {
    review: `${region ? `${region}에서 ` : ""}${brand} ${head}, 다녀온 뒤`,
    comparison: `${head}, 고를 때 이것만`,
    expert: `${head} — 자주 묻는 포인트`,
    customer: `${head} 고민, 여기서 멈췄어요`,
    informational: `${brand} ${head}, 확인 전에`,
    storytelling: `${region ? `${region}, ` : ""}문득 ${koreanSubjectParticle(head)} 떠올라서`,
    brand: brand ? `${brand}, ${head}` : head,
  };
  const fallback = hooks[resolved.perspective] || hooks.brand;
  if (
    existing.length >= 12 &&
    existing.length <= 56 &&
    !BLOG_TONE_RE.test(existing) &&
    !INSTA_BLOG_LEAK_RE.test(existing) &&
    !instaCaptionVoiceWeak(existing) &&
    !isMechanicalListingTitle(existing, ctx, input)
  ) {
    return finalizeInstaHook(existing, ctx, input, fallback);
  }
  return finalizeInstaHook(fallback, ctx, input, `${brand || "매장"} ${head}, 한 번쯤`);
}

function blogLinesForInsta(ctx = {}, input = {}) {
  const ins = ctx.insights || ctx.blogInsights || input.blogInsights;
  const pool = [
    ...(ins?.emotionalBeats || []),
    ...(ins?.practicalTips || []),
    ...(ins?.sectionHooks || []),
    ...(ins?.sceneLines || []),
  ]
    .map((s) => cleanField(String(s)).slice(0, 80))
    .filter((s) => s.replace(/\s/g, "").length >= 12);
  const seen = new Set();
  return pool.filter((line) => {
    const key = line.replace(/\s/g, "").slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);
}

function diversifyInstaRecallEndings(lines = []) {
  const recallRe = /(?:더라구요|더라고요|거든요|었어요)\s*$/;
  const alt = ["해요", "했습니다", "네요", "어요", "입니다", "해 주세요"];
  let recallSeen = 0;
  return lines.map((line, i) => {
    if (!recallRe.test(line)) return line;
    if (recallSeen < 2) {
      recallSeen += 1;
      return line;
    }
    return line.replace(recallRe, alt[i % alt.length]);
  });
}

function buildInstaBody(pack, ctx, input) {
  const archetype = resolveBranchInstaArchetype(input);
  const branchCaption = buildBranchInstaCaption(input, ctx);
  if (archetype !== "daily_mood" && branchCaption?.body?.length) {
    const blogBits = blogLinesForInsta(ctx, input);
    let lines = branchCaption.body.filter((l) => l !== undefined);
    if (blogBits[0] && !lines.some((l) => l.includes(blogBits[0].slice(0, 16)))) {
      lines.splice(Math.min(3, lines.length), 0, blogBits[0]);
    }
    lines = diversifyInstaRecallEndings(
      lines.filter((l) => l === "-" || String(l).trim())
    );
    return toInstaLineBreaks(scrubInstaBlogLeak(lines.join("\n"))).slice(0, 520);
  }

  let body = scrubInstaBlogLeak(cleanField(pack?.body || pack?.lineBreakBody || ""));
  body = body.replace(/\n{3,}/g, "\n\n");
  const blogBits = blogLinesForInsta(ctx, input);
  const kind = resolveIndustryKind(input);
  const forceScene = kind === "cafe";
  if (
    !forceScene &&
    !instaBodyNeedsRewrite(body) &&
    body.replace(/\s/g, "").length >= 160
  ) {
    return toInstaLineBreaks(body).slice(0, 520);
  }
  const persona = perspectivePersona(input);
  const style = getInstaPersonaStyle(input.contentPersona || persona, { ...ctx, ...input });
  const sceneLines = buildInstaSceneLines(input, ctx);
  const lead = style.bodyPrefix
    ? `${style.bodyPrefix} ${sceneLines[0]}`.trim()
    : sceneLines[0];
  const brand = String(ctx.brandName || input.brandName || "").trim();
  const head = facetHeadline(input);
  let lines = diversifyInstaRecallEndings(
    [lead, ...blogBits, ...sceneLines.slice(1)].filter((l) => l?.trim())
  );
  if (brand && !lines.some((l) => /이야기|준비|이곳|저희/.test(l))) {
    lines.splice(1, 0, `${brand} 이야기로, ${head} 준비하며 적어봤어요.`);
  }
  const anchor = blogBits.join(" ").trim().slice(0, 96);
  if (anchor.replace(/\s/g, "").length >= 40 && !lines.some((l) => l.includes(anchor.slice(0, 20)))) {
    lines.splice(2, 0, anchor);
  }
  if (lines.join("").replace(/\s/g, "").length < 150) {
    lines.push(
      `${String(ctx.region || input.region || "").trim() ? `${ctx.region || input.region}, ` : ""}직접 들러 보고 정리한 내용을 짧게 남겨봤어요. 플레이스에서 이어서 확인해 주세요.`
    );
  }
  return toInstaLineBreaks(scrubInstaBlogLeak(lines.join("\n"))).slice(0, 520);
}

function buildInstaHashtags(pack, ctx, input) {
  const existing = Array.isArray(pack?.hashtags)
    ? pack.hashtags.map((t) => String(t || "").trim()).filter(Boolean)
    : [];
  if (existing.length >= 5) return existing.slice(0, 12);
  const brand = String(ctx.brandName || input.brandName || "").trim();
  const region = String(ctx.region || input.region || "").trim();
  const facet = topicWritingFacet(input);
  const tag = (s) => (s ? `#${s.replace(/\s+/g, "")}` : "");
  const defaults = [
    tag(brand),
    tag(region),
    tag(facet),
    "#매장소식",
    "#방문안내",
    "#로컬브랜드",
    ...buildBranchInstaHashtagBoost(input, ctx),
  ].filter(Boolean);
  return [...new Set([...existing, ...defaults])].slice(0, 15);
}

function buildInstaEnding(pack, ctx, input) {
  const archetype = resolveBranchInstaArchetype(input);
  const branchCaption = buildBranchInstaCaption(input, ctx);
  if (archetype !== "daily_mood" && branchCaption?.ending) {
    return branchCaption.ending.slice(0, 72);
  }
  const existing = cleanField(pack?.ending || "");
  if (existing.length >= 8 && !/저장해\s*두세요|지금\s*바로/.test(existing)) {
    return existing.slice(0, 72);
  }
  const persona = perspectivePersona(input);
  const style = getInstaPersonaStyle(input.contentPersona || persona, { ...ctx, ...input });
  if (style.ending) return style.ending.slice(0, 72);
  const brand = String(ctx.brandName || input.brandName || "").trim();
  return brand ? `${brand} · 프로필·플레이스에서 확인` : "프로필·플레이스에서 확인";
}

export function buildChannelMarketerPromptBlock(channel, ctx = {}, input = {}) {
  const resolved = resolveContentPerspective({ ...input, ...ctx });
  const base =
    channel === "place"
      ? PLACE_MARKETER_BRIEF
      : channel === "instagram"
        ? INSTA_MARKETER_BRIEF
        : "";
  if (!base) return "";
  const archetype =
    channel === "instagram" ? resolveBranchInstaArchetype(input) : null;
  return [
    base,
    `콘텐츠 관점: ${resolved.label} — 톤·hook·CTA가 관점에 맞게 달라져야 함.`,
    `재해석 주제: ${topicWritingFacet(input)} (원문 주제 문장 출력 금지)`,
    archetype ? `인스타 지점 형식: ${archetype} (실매장 SNS 레퍼런스)` : "",
  ].join("\n");
}

export function applyPlaceMarketerPack(pack, ctx = {}, input = {}) {
  if (!pack) return pack;
  let next = sanitizeVerbatimTopicInPack(pack, input, "place");
  const title = buildPlaceTitle(next, ctx, input);
  const shortNotice = buildPlaceNotice(next, ctx, input);
  const detailBody = buildPlaceDetail(next, ctx, input);
  const persona = perspectivePersona(input);
  const style = getPlacePersonaStyle(input.contentPersona || persona, { ...ctx, ...input });
  return {
    ...next,
    title,
    shortNotice,
    shortBody: shortNotice,
    detailBody,
    body: `${shortNotice}\n\n${detailBody}`.trim(),
    _meta: {
      ...(next._meta || {}),
      channelMarketerEngine: true,
      channelMarketerApplied: true,
      placeVoice: style.coreTone || "owner",
      contentPerspective: resolveContentPerspective(input).perspective,
    },
  };
}

export function applyInstagramMarketerPack(pack, ctx = {}, input = {}) {
  if (!pack) return pack;
  let next = sanitizeVerbatimTopicInPack(pack, input, "instagram");
  const hook = buildInstaHook(next, ctx, input);
  const body = buildInstaBody(next, ctx, input);
  const ending = buildInstaEnding(next, ctx, input);
  const lineBreakBody = diversifyInstaRecallEndings(
    toInstaLineBreaks([hook, body, ending].filter(Boolean).join("\n\n"))
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean)
  ).join("\n\n");
  const hashtags = buildInstaHashtags(next, ctx, input);
  return {
    ...next,
    hook,
    body,
    ending,
    lineBreakBody,
    legacyBody: lineBreakBody,
    hashtags,
    _meta: {
      ...(next._meta || {}),
      channelMarketerEngine: true,
      channelMarketerApplied: true,
      instaVoice: getInstaPersonaStyle(perspectivePersona(input), { ...ctx, ...input }).hookStyle,
      contentPerspective: resolveContentPerspective(input).perspective,
      branchInstaArchetype: resolveBranchInstaArchetype(input),
      channelVoice: "branch-insta",
    },
  };
}

export function applyChannelMarketerPack(pack, channel, ctx = {}, input = {}) {
  if (pack?._meta?.channelMarketerApplied) return pack;
  if (channel === "place") return applyPlaceMarketerPack(pack, ctx, input);
  if (channel === "instagram") return applyInstagramMarketerPack(pack, ctx, input);
  return pack;
}

export function detectPlaceMarketerIssues(pack, ctx = {}, input = {}) {
  const issues = [];
  const full = getChannelFullText(pack, "place");
  const title = pack?.title || "";

  if (isMechanicalListingTitle(title, ctx, input)) {
    issues.push({ type: "mechanical_title" });
  }
  if (PLACE_BLOG_TITLE_RE.test(title)) {
    issues.push({ type: "blog_title_on_place" });
  }
  if (BLOG_TONE_RE.test(full)) {
    issues.push({ type: "blog_tone_leak" });
  }
  for (const banned of PLACE_CHANNEL.banned.slice(0, 8)) {
    if (full.includes(banned)) issues.push({ type: "place_banned_phrase" });
  }
  const verbatim = detectChannelVerbatimTopic(pack, "place", input);
  if (!verbatim.ok) issues.push({ type: "verbatim_topic" });

  const detailLen = String(pack?.detailBody || "").replace(/\s/g, "").length;
  if (detailLen < 100) issues.push({ type: "detail_thin" });

  return { ok: issues.length === 0, issues };
}

export function detectInstagramMarketerIssues(pack, ctx = {}, input = {}) {
  const issues = [];
  const full = getChannelFullText(pack, "instagram");
  const body = pack?.lineBreakBody || pack?.body || "";

  if (BLOG_TONE_RE.test(full)) {
    issues.push({ type: "blog_tone_leak" });
  }
  for (const banned of INSTAGRAM_CHANNEL.banned.slice(0, 10)) {
    if (full.includes(banned)) issues.push({ type: "insta_banned_phrase" });
  }
  const lineCount = body.split(/\n+/).filter((l) => l.trim()).length;
  if (lineCount < 3) issues.push({ type: "line_break_thin" });
  if (!String(pack?.hook || "").trim()) issues.push({ type: "missing_hook" });
  if (isMechanicalListingTitle(pack?.hook || "", ctx, input)) {
    issues.push({ type: "mechanical_hook" });
  }
  const verbatim = detectChannelVerbatimTopic(pack, "instagram", input);
  if (!verbatim.ok) issues.push({ type: "verbatim_topic" });

  const hashtagCount = (pack?.hashtags || []).length;
  if (hashtagCount < 3) issues.push({ type: "hashtag_low" });

  return { ok: issues.length === 0, issues };
}

export function detectChannelMarketerIssues(pack, channel, ctx = {}, input = {}) {
  if (channel === "place") return detectPlaceMarketerIssues(pack, ctx, input);
  if (channel === "instagram") return detectInstagramMarketerIssues(pack, ctx, input);
  return { ok: true, issues: [] };
}

export { PLACE_MARKETER_BRIEF, INSTA_MARKETER_BRIEF };
