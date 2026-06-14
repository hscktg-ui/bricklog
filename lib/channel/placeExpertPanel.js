/**
 * 스마트플레이스 전문가 패널 — 10인 구조·톤·결과값 SSOT
 */
import { scoreSmartPlaceVoice } from "@/lib/channel/smartPlaceVoiceProfile";
import { cleanOutputText } from "@/utils/sanitizeInput";

export const PLACE_EXPERT_PANEL_VERSION = "v1";

/** @type {Array<{ id: string, name: string, role: string, focus: string }>} */
export const PLACE_EXPERT_PANEL = [
  {
    id: "notice_architect",
    name: "공지 구조 설계자",
    role: "SmartPlace PM",
    focus: "제목·한 줄 공지·상세·CTA 4단 구조",
  },
  {
    id: "local_seo",
    name: "로컬 검색 전문가",
    role: "네이버 플레이스 SEO",
    focus: "지역·업종·브랜드명 노출, 블로그체 금지",
  },
  {
    id: "ops_facts",
    name: "매장 운영 실무가",
    role: "오프라인 운영",
    focus: "영업·예약·입고·이벤트 등 확인 가능한 사실만",
  },
  {
    id: "owner_voice",
    name: "사장님 톤 코치",
    role: "1인칭 공지",
    focus: "저희·매장·안내드립니다 — 후기·체험담 금지",
  },
  {
    id: "cta_designer",
    name: "방문 유도 설계자",
    role: "전환 CTA",
    focus: "플레이스·전화·예약 중 하나로 마무리",
  },
  {
    id: "density_editor",
    name: "정보 밀도 편집자",
    role: "상세 본문",
    focus: "불릿 3줄+, 공백 제외 150자+",
  },
  {
    id: "emoji_guard",
    name: "이모지 절제 편집자",
    role: "공지 가독",
    focus: "이모지 0~1개, 과장 표현 금지",
  },
  {
    id: "blog_isolation",
    name: "채널 분리 검수",
    role: "블로그 파생",
    focus: "블로그 요약·SEO·체크리스트 문장 차단",
  },
  {
    id: "season_curator",
    name: "시즌·트렌드 큐레이터",
    role: "적시성",
    focus: "주제·시즌과 맞는 한 줄 훅",
  },
  {
    id: "trust_reviewer",
    name: "신뢰·준수 검수",
    role: "과장·허위 차단",
    focus: "완치·100%·무조건 등 금지, 확인 유도",
  },
];

const BLOG_LEAK =
  /블로그|SEO|키워드|체크리스트|알아보시다|다녀(?:왔|온)|솔직\s*후기|방문\s*후기|정리하자면|소개해드릴/gi;
const TRUST_BAN = /완치|100%|무조건|최고\s*보장|진단\s*보장/gi;
const OWNER_MARKERS = /(?:안내|준비|운영|예약|입고|매장|저희)/;

function countNoSpace(text = "") {
  return String(text || "").replace(/\s/g, "").length;
}

function bulletLines(text = "") {
  return String(text || "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function toBulletLine(line = "") {
  const t = cleanOutputText(String(line || "").replace(/^·\s*/, ""));
  if (!t) return "";
  return t.startsWith("·") ? t : `· ${t}`;
}

function ensureDetailBullets(detailBody = "", ctx = {}) {
  let lines = bulletLines(detailBody).map((l) => toBulletLine(l));
  const brand = String(ctx.brandName || ctx.input?.brandName || "").trim();
  const region = String(ctx.region || ctx.input?.region || "").trim();
  const topic = String(ctx.main || ctx.input?.topic || ctx.input?.mainKeyword || "").trim();
  const tips = ctx.insights?.practicalTips || [];

  const fallbacks = [
    tips[0],
    tips[1],
    topic ? `${topic} — 자세한 내용은 매장에 문의해 주세요` : "",
    brand ? `${brand} 방문·예약은 플레이스·전화로 확인` : "",
    region ? `${region} — 영업 시간은 플레이스에 표시된 시간을 확인해 주세요` : "",
    "방문 전 예약·대기·이용 가능 시간은 매장·시기마다 달라질 수 있습니다.",
  ]
    .map((l) => toBulletLine(l))
    .filter(Boolean);

  for (const fb of fallbacks) {
    if (lines.length >= 3 && countNoSpace(lines.join("")) >= 150) break;
    if (lines.some((l) => l.slice(0, 12) === fb.slice(0, 12))) continue;
    lines.push(fb);
  }

  lines = lines.filter((l) => !BLOG_LEAK.test(l)).slice(0, 6);
  return lines.join("\n").trim();
}

function defaultCta(ctx = {}) {
  const brand = String(ctx.brandName || ctx.input?.brandName || "").trim();
  if (brand) return "플레이스에서 자세히 확인해 주세요";
  return "방문·문의 환영합니다";
}

function stripEmojis(text = "", max = 1) {
  const emojiRe =
    /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/gu;
  let kept = 0;
  return String(text || "").replace(emojiRe, (m) => {
    if (kept >= max) return "";
    kept += 1;
    return m;
  });
}

/**
 * @param {object} pack
 * @param {object} ctx
 */
export function assessPlaceExpertPanel(pack = {}, ctx = {}) {
  const title = String(pack.title || "").trim();
  const shortNotice = String(pack.shortNotice || pack.shortBody || "").trim();
  const detailBody = String(pack.detailBody || "").trim();
  const cta = String(pack.cta || "").trim();
  const brand = String(ctx.brandName || ctx.input?.brandName || "").trim();
  const region = String(ctx.region || ctx.input?.region || "").trim();
  const voice = scoreSmartPlaceVoice(`${title}\n${shortNotice}\n${detailBody}`);
  const bullets = bulletLines(detailBody).filter((l) => l.startsWith("·") || l.startsWith("-"));
  const emojiCount = (
    `${title}${shortNotice}${detailBody}`.match(
      /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/gu
    ) || []
  ).length;

  const checks = {
    notice_architect: title.length >= 8 && shortNotice.length >= 12 && detailBody.length >= 40 && cta.length >= 6,
    local_seo: (!brand || title.includes(brand) || shortNotice.includes(brand)) && (!region || title.includes(region.split(" ").pop() || region) || detailBody.includes(region.split(" ").pop() || region) || shortNotice.includes(region.split(" ").pop() || region)),
    ops_facts: /(?:예약|운영|입고|문의|영업|픽업|배송|체크인|접수|메뉴)/.test(`${shortNotice} ${detailBody}`),
    owner_voice: OWNER_MARKERS.test(`${shortNotice} ${detailBody}`) && voice.blogLeakHits === 0,
    cta_designer: /플레이스|전화|예약|문의|방문/.test(cta),
    density_editor: bullets.length >= 3 && countNoSpace(detailBody) >= 150,
    emoji_guard: emojiCount <= 1,
    blog_isolation: !BLOG_LEAK.test(`${title} ${shortNotice} ${detailBody}`),
    season_curator: shortNotice.length >= 20,
    trust_reviewer: !TRUST_BAN.test(`${title} ${shortNotice} ${detailBody} ${cta}`),
  };

  const experts = PLACE_EXPERT_PANEL.map((e) => ({
    ...e,
    pass: Boolean(checks[e.id]),
  }));
  const passCount = experts.filter((e) => e.pass).length;
  const score = Math.round((passCount / PLACE_EXPERT_PANEL.length) * 100);

  return {
    version: PLACE_EXPERT_PANEL_VERSION,
    score,
    pass: passCount >= 8 && voice.ok,
    passCount,
    voice,
    experts,
  };
}

/**
 * @param {object} pack
 * @param {object} ctx
 */
export function applyPlaceExpertPanel(pack = {}, ctx = {}) {
  if (!pack) return pack;
  const brand = String(ctx.brandName || ctx.input?.brandName || "").trim();
  const region = String(ctx.region || ctx.input?.region || "").trim();
  const topic = String(ctx.main || ctx.input?.topic || ctx.input?.mainKeyword || "").trim();

  let title = cleanOutputText(pack.title || "");
  if (brand && !title.includes(brand)) {
    title = cleanOutputText(`${brand} ${topic || "매장 소식"}`.slice(0, 44));
  }

  let shortNotice = cleanOutputText(
    pack.shortNotice || pack.shortBody || ""
  ).replace(BLOG_LEAK, "");
  if (countNoSpace(shortNotice) < 20) {
    const hook =
      ctx.insights?.practicalTips?.[0] ||
      ctx.insights?.visitReasons?.[0] ||
      `${region ? `${region} ` : ""}${brand || "매장"} — ${topic || "운영 소식"} 안내드립니다.`;
    shortNotice = cleanOutputText(hook).slice(0, 120);
  }
  shortNotice = stripEmojis(shortNotice, 1);

  let detailBody = ensureDetailBullets(
    pack.detailBody || "",
    { ...ctx, brandName: brand, region, main: topic }
  );
  detailBody = cleanOutputText(detailBody.replace(BLOG_LEAK, ""));
  detailBody = stripEmojis(detailBody, 0);

  let cta = cleanOutputText(pack.cta || defaultCta(ctx)).replace(TRUST_BAN, "");
  if (!/(?:플레이스|전화|예약|문의|방문)/.test(cta)) {
    cta = defaultCta(ctx);
  }

  title = stripEmojis(cleanOutputText(title.replace(BLOG_LEAK, "").replace(TRUST_BAN, "")), 1);

  const next = {
    ...pack,
    title,
    shortNotice,
    shortBody: shortNotice,
    detailBody,
    cta,
    body: `${shortNotice}\n\n${detailBody}`.trim(),
    _meta: {
      ...(pack._meta || {}),
      placeExpertPanel: assessPlaceExpertPanel(
        { title, shortNotice, detailBody, cta },
        ctx
      ),
    },
  };

  return next;
}

export function buildPlaceExpertPromptBlock() {
  return [
    "【플레이스 · 전문가 10인 패널】",
    ...PLACE_EXPERT_PANEL.map(
      (e, i) => `${i + 1}. ${e.name}(${e.role}) — ${e.focus}`
    ),
  ].join("\n");
}
