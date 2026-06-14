import { CHANNEL_TRENDS } from "@/lib/korean/writingTrends";
import { buildPlatformTrendPromptBlock } from "@/lib/trends/platformTrends2026";
import { getActiveSeasonContext } from "@/lib/season/seasonEngine";
import { getIndustryDNABrief } from "@/lib/prompts/industryDNA";
import { buildConstitutionChannelBrief } from "@/lib/constitution/writingConstitutionV2";
import { buildNaverEnginePromptAddon } from "@/lib/channel/naverBlogEngineRules";
import { buildSmartPlaceVoicePromptBlock } from "@/lib/channel/smartPlaceVoiceProfile";
import { buildInstagramVoicePromptBlock } from "@/lib/channel/instagramVoiceProfile";
import { buildExperienceVoicePromptBlock } from "@/lib/content/experienceVoiceProfile";

const TREND_CHANNEL_MAP = {
  blog: "blog",
  smartplace: "place",
  instagram: "instagram",
};

/** 채널별 생성 목표 (OpenAI·엔진 공통) */
export const CHANNEL_GOALS = {
  blog: {
    id: "blog",
    goal: "체류시간·정보 밀도·네이버 블로그 SEO",
    tone: "인간적인 흐름, 과장 최소, 섹션형 장문",
  },
  smartplace: {
    id: "smartplace",
    goal: "보고 방문 — 사장님 공지·운영·이벤트 (블로그 요약 금지)",
    tone: "공지 유형별 제목·요약·상세(200~520자), 모바일, SEO·설명문 반복 금지",
  },
  instagram: {
    id: "instagram",
    goal: "저장·공유·2026–2027 로컬 브랜드 캡션(Reels·Place 연계)",
    tone: "Hook+짧은 문장+줄바꿈, 분량·해시태그·숏폼 옵션 반영, 블로그체·광고체 금지",
  },
  hashtag: {
    id: "hashtag",
    goal: "지역·SEO·브랜드·트렌드·시즌 분리 조합",
    tone: "실무형 해시태그 세트",
  },
  image: {
    id: "image",
    goal: "브랜드 톤 맞춤 마케팅 비주얼, 텍스트 여백, 자연광",
    tone: "Midjourney/DALL·E 영문 프롬프트, Negative 포함",
  },
};

export function buildChannelBrief(channel, ctx) {
  const ch = CHANNEL_GOALS[channel] || CHANNEL_GOALS.blog;
  const trendKey = TREND_CHANNEL_MAP[channel];
  const trend = trendKey ? CHANNEL_TRENDS[trendKey] : null;
  const trendLines = trend
    ? [
        `문체: ${trend.voice}`,
        `띄어쓰기: ${trend.spacing}`,
        `트렌드: ${trend.trends.slice(0, 4).join(" · ")}`,
        trend.avoid?.length ? `금지 표현: ${trend.avoid.slice(0, 5).join(", ")}` : "",
      ].filter(Boolean)
    : [];

  const channelOptions = [];
  if (channel === "smartplace" && ctx.placePostType) {
    channelOptions.push(
      `플레이스 유형: ${ctx.placePostType}${ctx.placeHeadline ? ` · 제목 힌트: ${ctx.placeHeadline}` : ""}${ctx.placeDetailHint ? ` · 상세: ${ctx.placeDetailHint.slice(0, 80)}` : ""}`
    );
  }
  if (channel === "instagram") {
    if (ctx.instaFormat === "short") {
      channelOptions.push("숏폼: 첫 줄 Hook 강조");
    }
    channelOptions.push(
      `캡션 분량: ${ctx.instaBodyLength || "medium"} · 해시태그 ${ctx.instaHashtagCount ?? 5}개 (${ctx.instaHashtagMode || "auto"})`
    );
  }

  const platformBlock = buildPlatformTrendPromptBlock(channel, ctx);

  return [
    buildConstitutionChannelBrief(channel, ctx),
    channel === "blog" ? buildNaverEnginePromptAddon(ctx) : "",
    channel === "blog" ? buildExperienceVoicePromptBlock() : "",
    channel === "smartplace" ? buildSmartPlaceVoicePromptBlock() : "",
    channel === "instagram" ? buildInstagramVoicePromptBlock() : "",
    platformBlock,
    `[${ch.id}] ${ch.goal}`,
    `톤: ${ch.tone}`,
    ...channelOptions,
    getIndustryDNABrief(ctx.industryKey || ctx.legacyIndustryKey),
    getActiveSeasonContext().promptLine,
    ...trendLines,
    ctx.matrixSummary || "",
    ctx.personalizationAddon || ctx.combinedPersonalizationAddon || "",
    `네이버 스타일: ${ctx.flavor?.naverStyle || "로컬 SEO"}`,
    `목적: ${ctx.purpose.label}`,
    `글유형: ${ctx.articleType.label}`,
    `톤앤매너: ${ctx.tone.label}`,
  ]
    .filter(Boolean)
    .join("\n");
}
