/**
 * QA용 가상 유저 4명 — 프로필·계정 습관·브랜드 1개씩
 */
import { personalizationBriefFromProfile } from "@/lib/auth/profilePersonalization";
import { buildBrandMemoryBundleFromLayers } from "@/lib/memory/brandMemoryBundle";
import { formatUserWritingBrief } from "@/lib/memory/userWritingProfile";
import { formatBrandHabitsBrief } from "@/lib/brands/brandHabits";

export const VIRTUAL_USERS = [
  {
    id: "vu_agency_01",
    label: "김대행 — 광고대행 AE",
    profile: {
      nickname: "김대행",
      roleType: "agency",
      brandCountBand: "agency_multi",
      primaryUseCase: "agency_work",
      mainIndustry: "광고·마케팅",
      preferredTitle: "담당자님",
    },
    writingProfile: {
      traits: {
        preferredChannels: ["blog", "place", "instagram"],
        preferredPersonas: ["brand_intro", "magazine"],
        preferredEmotions: ["informative", "premium"],
        topFeedbackTags: ["톤_통일", "클라이언트명_분리"],
        userOverrides: {
          defaultSpeechStyle: "informative",
          defaultEmojiDensity: "low",
          writingNote: "클라이언트별 톤 분리",
          dislikedPhrases: ["최저가", "1등", "무조건"],
          frequentPhrases: ["시즌 메뉴", "예약"],
          preferredContentLength: "medium",
        },
      },
      style_fingerprint: { sentenceLengthBand: "medium", emojiDensity: "low" },
    },
    brand: {
      id: "brand_agency_client_a",
      brandName: "모닝브루 강남",
      region: "강남",
      industry: "카페",
      tone: "premium",
      mainKeyword: "강남 브런치",
      excludePhrases: "최저가, 1등",
      rewriteHints: "클라이언트 톤 유지, 과장 금지",
      frequentlyUsedExpressions: ["시즌 메뉴", "예약"],
      speechStyle: "informative",
    },
  },
  {
    id: "vu_cafe_owner",
    label: "이사장 — 단일 카페",
    profile: {
      nickname: "이사장",
      roleType: "owner",
      brandCountBand: "1",
      primaryUseCase: "blog",
      mainIndustry: "카페",
      preferredTitle: "사장님",
    },
    writingProfile: {
      traits: {
        preferredChannels: ["blog", "place"],
        preferredPersonas: ["brand_intro"],
        preferredEmotions: ["emotional"],
        topFeedbackTags: ["따뜻하게", "짧은_플레이스"],
        userOverrides: {
          defaultSpeechStyle: "emotional",
          defaultEmojiDensity: "medium",
          writingNote: "손님 이야기처럼",
          preferredContentLength: "short",
        },
      },
      style_fingerprint: { sentenceLengthBand: "short", emojiDensity: "medium" },
    },
    brand: {
      id: "brand_cafe_single",
      brandName: "골목로스터리",
      region: "성수",
      industry: "카페",
      tone: "emotional",
      mainKeyword: "성수 카페",
      brandDescription: "성수 골목에서 매일 로스팅하는 카페",
      includePhrases: "골목로스터리, 성수",
      rewriteHints: "손님 이야기처럼, SEO 나열 금지",
      preferredSentenceStyle: "short",
      targetAudience: "성수·뚝섬 직장인",
      speechStyle: "emotional",
    },
  },
  {
    id: "vu_clinic_dir",
    label: "박원장 — 의료 클리닉",
    profile: {
      nickname: "박원장",
      roleType: "professional",
      brandCountBand: "2_3",
      primaryUseCase: "place",
      mainIndustry: "병원·의료",
      preferredTitle: "custom",
      customTitle: "원장님",
    },
    writingProfile: {
      traits: {
        preferredChannels: ["place", "blog"],
        preferredPersonas: ["expert_info"],
        preferredEmotions: ["trust"],
        topFeedbackTags: ["과장_금지", "키워드_완화"],
        userOverrides: {
          defaultSpeechStyle: "trust",
          defaultEmojiDensity: "low",
          dislikedPhrases: ["완치", "100%", "최고"],
          preferredContentLength: "medium",
        },
      },
      style_fingerprint: { sentenceLengthBand: "medium", emojiDensity: "none" },
    },
    brand: {
      id: "brand_clinic_songdo",
      brandName: "연세정형외과",
      region: "인천 송도",
      industry: "병원",
      tone: "trust",
      mainKeyword: "송도 정형외과",
      excludePhrases: "완치, 100%, 최고, 무조건",
      forbiddenWords: "완치, 100%, 최고",
      brandDescription: "송도 무릎·어깨 정형외과",
      targetAudience: "30~50대 직장인",
      rewriteHints: "상담 안내만, 광고 문구 금지",
      speechStyle: "trust",
      sensitiveCategory: "medical",
    },
  },
  {
    id: "vu_creator_01",
    label: "수아 — 인스타·꽃집 MD",
    profile: {
      nickname: "수아",
      roleType: "marketer",
      brandCountBand: "4_10",
      primaryUseCase: "instagram",
      mainIndustry: "꽃집·리테일",
      preferredTitle: "마케터님",
    },
    writingProfile: {
      traits: {
        preferredChannels: ["instagram", "blog"],
        preferredPersonas: ["plain_review", "visit_review"],
        preferredEmotions: ["emotional", "lifestyle"],
        topFeedbackTags: ["해시_로컬", "hook_강화"],
        userOverrides: {
          defaultSpeechStyle: "emotional",
          defaultEmojiDensity: "high",
          frequentPhrases: ["픽업", "어버이날"],
          preferredContentLength: "short",
        },
      },
      style_fingerprint: { sentenceLengthBand: "short", emojiDensity: "high" },
    },
    brand: {
      id: "brand_flower_haeundae",
      brandName: "꽃담",
      region: "부산 해운대",
      industry: "꽃집",
      tone: "emotional",
      mainKeyword: "해운대 꽃집",
      instaLocalTagsHint: "부산",
      rewriteHints: "캡션 Hook 먼저, 블로그는 정보형",
      successfulHooks: ["어버이날 마감 임박", "해운대 픽업"],
      speechStyle: "emotional",
    },
  },
];

export function simulateLayersForVirtualUser(vu) {
  const accountBrief = personalizationBriefFromProfile(vu.profile);
  const userBrief = formatUserWritingBrief(vu.writingProfile);
  const brandBrief = formatBrandHabitsBrief(vu.brand);
  const feedbackBrief = vu.brand.rewriteHints
    ? `수정 패턴: ${vu.brand.rewriteHints}`
    : "";

  const styleContinuityBrief = vu.brand.successfulHooks?.length
    ? `최근 Hook: ${vu.brand.successfulHooks.slice(0, 2).join(", ")}`
    : vu.brand.tone
      ? `톤 유지: ${vu.brand.tone}`
      : "";

  return buildBrandMemoryBundleFromLayers({
    accountBrief,
    userBrief,
    brandBrief,
    feedbackBrief,
    styleContinuityBrief,
    dataAssetBrief: "",
    brandKnowledgeBrief: "",
    userId: vu.id,
    brandId: vu.brand.id,
  });
}
