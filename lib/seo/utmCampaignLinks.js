/** 공지·카페·SNS용 UTM 링크 SSOT — Admin·운영 복사용 */

export const BRICLOG_UTM_BASE = "https://briclog.ai";

export const UTM_CAMPAIGN_PRESETS = [
  {
    id: "naver_cafe_beta",
    label: "네이버 카페 · 베타 공지",
    url: `${BRICLOG_UTM_BASE}/?utm_source=naver_cafe&utm_medium=social&utm_campaign=beta_notice`,
  },
  {
    id: "kakao_openchat",
    label: "카카오 오픈채팅",
    url: `${BRICLOG_UTM_BASE}/?utm_source=kakao&utm_medium=social&utm_campaign=openchat`,
  },
  {
    id: "instagram_bio",
    label: "인스타 프로필 링크",
    url: `${BRICLOG_UTM_BASE}/?utm_source=instagram&utm_medium=social&utm_campaign=profile_link`,
  },
  {
    id: "email_newsletter",
    label: "이메일·뉴스레터",
    url: `${BRICLOG_UTM_BASE}/?utm_source=email&utm_medium=newsletter&utm_campaign=launch`,
  },
  {
    id: "guides_seo",
    label: "가이드 → 무료 테스트",
    url: `${BRICLOG_UTM_BASE}/guides?utm_source=guides&utm_medium=organic&utm_campaign=content`,
  },
];
