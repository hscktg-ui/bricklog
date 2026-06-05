/**
 * BRICLOG BRAND CONTENT ENGINE
 * SEO 생성기가 아닌 — 브랜드 자산·전문 칼럼·기승전결·재해석
 */
import { getChannelFullText } from "@/lib/content/channelPack";
import {
  buildHumanClickTitles,
  isMechanicalListingTitle,
  rewriteMechanicalTitle as rewriteHumanTitle,
  titleContext,
  titleIncludesAllEntities,
  topicCore,
} from "@/lib/content/humanTitleEngine";

export {
  buildHumanClickTitles,
  isMechanicalListingTitle,
  titleIncludesAllEntities,
  topicCore,
} from "@/lib/content/humanTitleEngine";

export const BRAND_CONTENT_PHILOSOPHY = `【BRICLOG BRAND CONTENT · 철학】
- 브릭로그는 SEO 글 생성기가 아니다. 브랜드 자산을 쌓는 콘텐츠 시스템이다.
- 검색 노출은 목표가 아니라 결과다. 글의 목적은 브랜드를 설명하는 것이 아니라 기억하게 만드는 것.
- 수집 정보는 복사하지 않고 재해석한다. 기능 나열(X) → 왜 사람들이 찾게 되는가(O).
- 블로그가 아니라 전문 칼럼·에세이·브랜드 저널 중간 지점. 정보×해석×맥락×관점.
- SEO는 본문 완성 후 자연스럽게 녹인다. SEO 때문에 문장을 만들지 않는다. 키워드 반복 금지.
- CTA·과장·억지 홍보 금지.`;

export const GI_SEUNG_JEON_GYEOL_BRIEF = `【기-승-전-결 · 본문 구조】
- 기(起): 독자가 검색하게 된 이유·상황·질문 — 장면으로 시작.
- 승(承): 주제 관련 정보·비교·맥락 — 칼럼리스트 해설 톤.
- 전(轉): 실제 선택 기준·체크포인트·주의 — 결정에 쓸 정보.
- 결(結): 브랜드와 자연스럽게 연결 — 기억에 남는 한 줄. CTA·「방문하세요」 금지.`;

export const REINTERPRETATION_BRIEF = `【정보 재해석 · 복사 금지】
- 사용자 주제 문장을 그대로 쓰지 않는다. 20~50개 정보 단위로 분해 → 조사 → 칼럼 재구성.
- 조사·스니펫 문장을 그대로 쓰지 않는다.
- 「모션베드」→ 각도 스펙 나열(X) / 「왜 모션베드를 찾게 되는가」— 수면·각도·생활 리듬(O).
- 「꽃집」→ 꽃 종류 나열(X) / 「어떤 상황에서 어떤 꽃을 찾게 되는가」(O).`;

export const TITLE_RULES_BRIEF = `【제목 · 클릭하고 싶은 문장】
- 금지: 「지역 브랜드 주제」 키워드 나열 (예: 평택 템퍼 모션베드 특별할인, 평택 · 템퍼 · 모션베드).
- 필수: 지역·브랜드·주제 모두 포함 — 기계적 나열 금지.
- 구조: 지역 → 상황 → 브랜드 → 주제 (쉼표·접속·질문으로 자연스럽게).
- 예: 「평택에서 모션베드를 고민한다면, 템퍼 체험 전 알아둘 것」
- 예: 「평택 템퍼, 모션베드 할인보다 먼저 봐야 할 기준」
- 예: 「평택에서 찾은 선택의 이유, 템퍼 모션베드 체험 이야기」
- 검색엔진이 아니라 사람이 클릭해야 한다.`;

const CTA_CONCLUSION_RE =
  /(방문해\s*보세요|지금\s*바로|확인해\s*보세요|예약해\s*주세요|문의해\s*주세요|저장해\s*두세요|클릭)/gi;

const KEYWORD_STUFF_RE = /(.{4,24})\1{2,}/;

function brandCtx(ctx = {}, input = {}) {
  return titleContext(ctx, input);
}

/** @deprecated use buildHumanClickTitles */
export function buildNaturalBrandTitles(ctx = {}, input = {}) {
  return buildHumanClickTitles(ctx, input, "brand").slice(0, 5);
}

export function rewriteMechanicalTitle(title, ctx = {}, input = {}) {
  return rewriteHumanTitle(title, ctx, input, "brand");
}

const MECHANICAL_SECTION_PREFIX_RE = /^(.{8,}?)\s*[—–-]\s*(.+)$/;

export function isMechanicalSectionHeading(heading, ctx = {}, input = {}) {
  const h = String(heading || "").trim();
  if (!h || h.length < 10) return false;
  if (/[?？]/.test(h)) return false;

  const { region, brand, topic } = brandCtx(ctx, input);
  const triple = [region, brand, topic].filter(Boolean).join(" ");
  if (triple && h.replace(/\s/g, "").startsWith(triple.replace(/\s/g, ""))) {
    return true;
  }

  const m = h.match(MECHANICAL_SECTION_PREFIX_RE);
  if (!m) return false;
  const prefix = m[1].trim();
  const prefixWords = prefix.split(/\s+/).filter(Boolean);
  if (prefixWords.length >= 3 && prefix.length >= 14) return true;
  if (region && brand && prefix.includes(region) && prefix.includes(brand) && prefix.length > 18) {
    return true;
  }
  return false;
}

export function humanizeSectionHeading(heading, ctx = {}, input = {}, index = 0) {
  const h = String(heading || "").trim();
  if (!isMechanicalSectionHeading(h, ctx, input)) return h;

  const m = h.match(MECHANICAL_SECTION_PREFIX_RE);
  const suffix = (m?.[2] || h).trim();
  const variants = [
    suffix,
    `${suffix}, 알아두면 좋은 것`,
    `${suffix} — 선택 전 체크`,
    `${suffix}, 매장 가기 전 질문`,
  ];
  return variants[index % variants.length].slice(0, 52);
}

export function humanizeSectionHeadings(pack, ctx = {}, input = {}) {
  if (!pack?.sections?.length) return pack;
  const seen = new Set();
  return {
    ...pack,
    sections: pack.sections.map((sec, index) => {
      let heading = humanizeSectionHeading(sec.heading, ctx, input, index);
      let key = heading.toLowerCase();
      let guard = 0;
      while (seen.has(key) && guard < 5) {
        heading = humanizeSectionHeading(sec.heading, ctx, input, index + guard + 2);
        key = heading.toLowerCase();
        guard += 1;
      }
      seen.add(key);
      return { ...sec, heading };
    }),
  };
}

function softenConclusion(conclusion, ctx = {}, input = {}) {
  let text = String(conclusion || "").trim();
  if (!text) return text;
  if (!CTA_CONCLUSION_RE.test(text)) return text;

  const { region, brand, topic } = brandCtx(ctx, input);
  text = text
    .replace(CTA_CONCLUSION_RE, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (text.replace(/\s/g, "").length < 40) {
    return `${region ? `${region}에서 ` : ""}${brand || "브랜드"} ${topic || "이용"}를 고를 때, 본인 기준에 맞는지 체험과 조건으로 확인하는 편이 낫습니다.`.slice(
      0,
      220
    );
  }
  return text.slice(0, 320);
}

/**
 * 본문 완성 후 — 지역·브랜드·주제 자연 배치 (도배 금지)
 */
export function applyNaturalSeoLayer(pack, ctx = {}, input = {}) {
  const { region, brand, topic } = brandCtx(ctx, input);
  if (!pack?.sections?.length) return pack;

  const full = getChannelFullText(pack, "blog");
  const terms = [region, brand, topic].filter(Boolean);
  const missing = terms.filter((term) => !full.includes(term));
  if (!missing.length) return pack;

  const next = { ...pack, sections: [...pack.sections] };
  const last = next.sections[next.sections.length - 1];
  if (!last) return pack;

  const add = missing
    .map((term) => {
      if (term === region) return `${region} 생활권 맥락에서 읽으면 이해가 빨라집니다.`;
      if (term === brand) return `${brand} 기준으로 정리한 내용입니다.`;
      return `${topic} 관련 선택 포인트를 중심으로 썼습니다.`;
    })
    .join(" ");

  if (add && !last.body.includes(add.slice(0, 12))) {
    last.body = `${String(last.body || "").trim()}\n\n${add}`.trim();
  }
  return next;
}

export function applyBrandContentTitles(pack, ctx = {}, input = {}) {
  if (!pack) return pack;
  const perspective = input.contentPerspective || "brand";
  const natural = buildHumanClickTitles(ctx, input, perspective === "auto" ? "brand" : perspective);
  let rep = rewriteMechanicalTitle(
    pack.representativeTitle || pack.title || "",
    ctx,
    input
  );
  if (!rep || isMechanicalListingTitle(rep, ctx, input) || !titleIncludesAllEntities(rep, ctx, input)) {
    rep = natural[0] || rep;
  }

  const titles = (pack.titles || [])
    .map((t) => rewriteMechanicalTitle(t, ctx, input))
    .filter(Boolean);
  for (const n of natural) {
    if (titles.length >= 5) break;
    if (!titles.includes(n)) titles.push(n);
  }
  while (titles.length < 5 && natural[titles.length]) {
    titles.push(natural[titles.length]);
  }

  return {
    ...pack,
    representativeTitle: rep,
    title: rep,
    titles: titles.slice(0, 5),
    conclusion: softenConclusion(pack.conclusion, ctx, input),
    _meta: {
      ...(pack._meta || {}),
      brandContentEngine: true,
      giSeungJeonGyeol: true,
    },
  };
}

/**
 * Writer 프롬프트용 통합 brief
 */
export function buildBrandContentPromptBlock() {
  return [
    BRAND_CONTENT_PHILOSOPHY,
    TITLE_RULES_BRIEF,
    GI_SEUNG_JEON_GYEOL_BRIEF,
    REINTERPRETATION_BRIEF,
  ].join("\n");
}

/**
 * LLM 출력 후 — 제목·결말·SEO 후처리
 */
export function applyBrandContentEngine(pack, ctx = {}, input = {}) {
  if (!pack) return pack;
  let next = applyBrandContentTitles(pack, ctx, input);
  next = humanizeSectionHeadings(next, ctx, input);
  next = applyNaturalSeoLayer(next, ctx, input);
  return next;
}

export function detectBrandContentIssues(pack, ctx = {}, input = {}) {
  const issues = [];
  const title = pack?.representativeTitle || pack?.title || "";
  if (isMechanicalListingTitle(title, ctx, input)) {
    issues.push({ type: "mechanical_title", title });
  }
  if (CTA_CONCLUSION_RE.test(String(pack?.conclusion || ""))) {
    issues.push({ type: "cta_conclusion" });
  }
  const full = getChannelFullText(pack, "blog");
  if (KEYWORD_STUFF_RE.test(full.replace(/\s/g, "").slice(0, 500))) {
    issues.push({ type: "keyword_stuffing" });
  }
  return { ok: issues.length === 0, issues };
}
