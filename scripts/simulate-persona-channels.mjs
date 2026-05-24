/**
 * 10 페르소나 × 채널 연계·품질 점수 시뮬레이션 (템플릿/휴리스틱, LLM 없음)
 * Run: node scripts/simulate-persona-channels.mjs
 */

import { resolveDerivationSource, pickLatestSource } from "../lib/content/channelSource.js";
import {
  runPlacePipeline,
  runInstagramPipeline,
  runImagePipeline,
  buildFormBlogProxy,
  normalizePipelineInput,
  buildBaseContentLabel,
} from "../lib/contentPipeline.js";
import { scoreTrainingContent } from "../lib/quality/training/scorer.js";
import { scoreCoreContent } from "../lib/quality/coreQualityEngine.js";
import { scoreContent } from "../lib/editorAI/scoreContent.js";
import { auditPastedDraft } from "../lib/review/auditPastedDraft.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { CORE_TARGET_SCORE } from "../lib/quality/coreQualityEngine.js";

const TARGET_USER = 80;

const PERSONAS = [
  {
    id: "p1_cafe",
    label: "강남 카페 사장",
    v4Speaker: "brand_intro",
    input: {
      brandName: "모닝브루 강남",
      region: "강남",
      industry: "카페",
      topic: "봄 시즌 브런치 메뉴",
      mainKeyword: "강남 브런치 카페",
      purpose: "visitDrive",
      tone: "emotional",
    },
  },
  {
    id: "p2_salon",
    label: "홍대 미용실 원장",
    v4Speaker: "real_use",
    input: {
      brandName: "레이어드살롱",
      region: "홍대",
      industry: "미용실",
      topic: "시즌 컬러 이벤트",
      mainKeyword: "홍대 염색",
      purpose: "season",
      tone: "trust",
    },
  },
  {
    id: "p3_academy",
    label: "대구 학원 원장",
    v4Speaker: "expert_info",
    input: {
      brandName: "수학플러스",
      region: "대구 동성로",
      industry: "학원",
      topic: "여름방학 특강 모집",
      mainKeyword: "대구 수학학원",
      purpose: "info",
      tone: "informative",
    },
  },
  {
    id: "p4_flower",
    label: "꽃집 마케터",
    v4Speaker: "plain_review",
    input: {
      brandName: "플로라하우스",
      region: "부산 해운대",
      industry: "꽃집",
      topic: "어버이날 꽃다발 예약",
      mainKeyword: "해운대 꽃집",
      purpose: "season",
      tone: "emotional",
      instaScene: "매장 픽업 장면",
    },
  },
  {
    id: "p5_pension",
    label: "제주 펜션 운영",
    v4Speaker: "local_blogger",
    input: {
      brandName: "애월바다펜션",
      region: "제주 애월",
      industry: "펜션",
      topic: "비수기 장박 할인",
      mainKeyword: "제주 펜션",
      purpose: "visitDrive",
      tone: "lifestyle",
    },
  },
  {
    id: "p6_clinic",
    label: "병원 마케팅 (민감)",
    v4Speaker: "expert_info",
    input: {
      brandName: "연세정형외과",
      region: "인천 송도",
      industry: "병원",
      topic: "무릎 통증 상담 안내",
      mainKeyword: "송도 정형외과",
      purpose: "info",
      tone: "trust",
      sensitiveCategory: "medical",
    },
  },
  {
    id: "p7_agency",
    label: "광고대행사 B2B",
    v4Speaker: "magazine",
    input: {
      brandName: "브릭애드",
      region: "강남",
      industry: "광고대행사",
      topic: "로컬 브랜드 콘텐츠 패키지",
      mainKeyword: "로컬 마케팅",
      purpose: "brand",
      tone: "premium",
    },
  },
  {
    id: "p8_craft",
    label: "공방 작가",
    v4Speaker: "essay",
    input: {
      brandName: "도자기온",
      region: "전국",
      industry: "공방",
      topic: "원데이 클래스 오픈",
      mainKeyword: "도자기 클래스",
      purpose: "newOpen",
      tone: "emotional",
    },
  },
  {
    id: "p9_restaurant",
    label: "음식점 점주",
    v4Speaker: "plain_review",
    input: {
      brandName: "한상차림",
      region: "강남",
      industry: "음식점",
      topic: "점심 특선 리뉴얼",
      mainKeyword: "강남 한식",
      purpose: "visitDrive",
      tone: "informative",
      placePeriod: "5월 한 달",
      placeOffer: "점심 특선 9,900원",
    },
  },
  {
    id: "p10_shop",
    label: "온라인 쇼핑몰 MD",
    v4Speaker: "column",
    input: {
      brandName: "데일리핏몰",
      region: "전국",
      industry: "온라인 쇼핑몰",
      topic: "여름 운동복 출시",
      mainKeyword: "운동복 추천",
      purpose: "season",
      tone: "lifestyle",
      instaHookAngle: "착샷 비포애프터",
    },
  },
];

function scorePack(channel, pack, ctx) {
  const training = scoreTrainingContent(pack, ctx, channel);
  const core = scoreCoreContent(pack, ctx, channel);
  const editor = scoreContent(channel, pack, ctx);
  return {
    training: training.total,
    trainingPass: training.pass,
    blockers: training.blockers,
    core: core.total,
    corePass: core.pass,
    editor: editor.overall,
  };
}

function testDerivationMatrix(blog, place, insta, input) {
  const state = {
    blogContent: blog,
    placeContent: place,
    instagramContent: insta,
    blogInput: input,
    baseContentLabel: "테스트",
    sourceChannel: null,
  };
  const rows = [];
  for (const target of ["place", "instagram", "image", "blog"]) {
    const src = resolveDerivationSource(target, state);
    rows.push({
      target,
      ok: Boolean(src),
      source: src?.sourceChannel,
      standalone: src?.standalone,
      hasProxy: Boolean(src?.blogLike),
    });
  }
  return rows;
}

const results = [];
let blockers = [];
let warnings = [];

for (const persona of PERSONAS) {
  const input = normalizePipelineInput({
    ...persona.input,
    v4Speaker: persona.v4Speaker,
    blogLengthTier: "medium",
  });
  const ctx = {
    brandName: input.brandName,
    region: input.region,
    main: input.mainKeyword,
    industry: input.industry,
  };

  const blogProxy = buildFormBlogProxy(input);
  const blogLabel = buildBaseContentLabel(input, blogProxy);

  let place;
  let insta;
  let image;
  try {
    place = runPlacePipeline(input, blogProxy, blogLabel);
    insta = runInstagramPipeline(input, blogProxy, "emotional", blogLabel);
    image = runImagePipeline(input, blogProxy, {
      purpose: "thumbnail",
      ratio: "16:9",
      tone: "white",
    }, blogLabel);
  } catch (e) {
    blockers.push({ persona: persona.id, error: e.message });
    continue;
  }

  const blogText = getBlogFullText(blogProxy);
  const pasteAudit = {
    blog: auditPastedDraft(blogText, ctx, "blog"),
    place: auditPastedDraft(
      [place.title, place.shortNotice, place.detailBody].filter(Boolean).join("\n\n"),
      ctx,
      "place"
    ),
    insta: auditPastedDraft(
      insta.lineBreakBody || insta.body,
      ctx,
      "instagram"
    ),
  };

  const scores = {
    blog: scorePack("blog", blogProxy, ctx),
    place: scorePack("place", place, ctx),
    instagram: scorePack("instagram", insta, ctx),
  };

  const deriveFromBlog = testDerivationMatrix(blogProxy, null, null, input);
  const deriveFromPlace = testDerivationMatrix(null, place, null, input);
  const deriveFromInsta = testDerivationMatrix(null, null, insta, input);

  const latest = pickLatestSource({
    blogContent: blogProxy,
    placeContent: place,
    instagramContent: insta,
  });

  const row = {
    id: persona.id,
    label: persona.label,
    scores,
    pastePass: {
      blog: pasteAudit.blog.pass,
      place: pasteAudit.place.pass,
      insta: pasteAudit.insta.pass,
    },
    pasteScore: {
      blog: pasteAudit.blog.score,
      place: pasteAudit.place.score,
      insta: pasteAudit.insta.score,
    },
    deriveFromBlog,
    deriveFromPlace,
    deriveFromInsta,
    imageOk: Boolean(image?.thumbnailPrompt),
    latestChannel: latest?.channel,
  };

  for (const ch of ["blog", "place", "instagram"]) {
    const s = scores[ch];
    if (s.training < TARGET_USER) {
      warnings.push(
        `${persona.id} ${ch}: training=${s.training} (<${TARGET_USER}) blockers=${s.blockers.join(",")}`
      );
    }
    if (s.core < TARGET_USER) {
      warnings.push(`${persona.id} ${ch}: core=${s.core}`);
    }
  }

  results.push(row);
}

// 요약 통계
function avg(arr) {
  return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
}

const summary = {
  targetUser: TARGET_USER,
  coreTargetCode: CORE_TARGET_SCORE,
  personas: results.length,
  avgTraining: {
    blog: avg(results.map((r) => r.scores.blog.training)),
    place: avg(results.map((r) => r.scores.place.training)),
    insta: avg(results.map((r) => r.scores.instagram.training)),
  },
  avgCore: {
    blog: avg(results.map((r) => r.scores.blog.core)),
    place: avg(results.map((r) => r.scores.place.core)),
    insta: avg(results.map((r) => r.scores.instagram.core)),
  },
  under80Training: warnings.length,
  deriveBlogToPlace: results.filter((r) =>
    r.deriveFromBlog.find((d) => d.target === "place" && d.ok)
  ).length,
  derivePlaceToInsta: results.filter((r) =>
    r.deriveFromPlace.find((d) => d.target === "instagram" && d.ok)
  ).length,
  deriveInstaToImage: results.filter((r) =>
    r.deriveFromInsta.find((d) => d.target === "image" && d.ok)
  ).length,
};

console.log("=== BRICLOG 채널 연계·품질 시뮬레이션 (10 페르소나) ===\n");
console.log(JSON.stringify(summary, null, 2));
console.log("\n--- 페르소나별 점수 ---");
for (const r of results) {
  console.log(
    `${r.label}: blog T${r.scores.blog.training}/C${r.scores.blog.core} | place T${r.scores.place.training}/C${r.scores.place.core} | insta T${r.scores.instagram.training}/C${r.scores.instagram.core} | paste ${r.pasteScore.blog}/${r.pasteScore.place}/${r.pasteScore.insta}`
  );
}
if (warnings.length) {
  console.log("\n--- 80점 미만·주의 ---");
  warnings.slice(0, 30).forEach((w) => console.log(w));
  if (warnings.length > 30) console.log(`… 외 ${warnings.length - 30}건`);
}
if (blockers.length) {
  console.log("\n--- 실행 오류 ---");
  blockers.forEach((b) => console.log(b));
}

// 연계 매트릭스 샘플 (첫 페르소나)
const sample = results[0];
if (sample) {
  console.log("\n--- 연계 해석 (첫 페르소나 기준) ---");
  console.log("blog만 있을 때:", sample.deriveFromBlog.map((d) => `${d.target}←${d.source || "—"}`).join(", "));
  console.log("place만 있을 때:", sample.deriveFromPlace.map((d) => `${d.target}←${d.source || "—"}`).join(", "));
  console.log("insta만 있을 때:", sample.deriveFromInsta.map((d) => `${d.target}←${d.source || "—"}`).join(", "));
}

process.exit(blockers.length ? 1 : 0);
