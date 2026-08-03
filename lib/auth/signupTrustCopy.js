/**
 * 가입 화면 — 브릭로그 문자 인증 vs 이메일 링크 안내 SSOT
 */

/**
 * @param {{ phoneRequired: boolean, smsSenderLabel?: string }} input
 */
export function getSignupTrustCopy({ phoneRequired, smsSenderLabel = "070-8844-7209" }) {
  if (phoneRequired) {
    return {
      headline: "휴대폰 문자로 가입 확인",
      body: "가입 확인은 「[브릭로그]」 문자만 사용합니다. 이메일 인증 링크는 보내지 않습니다.",
      emailHint: "이메일은 로그인용입니다. 중복만 확인합니다.",
      smsHint: "휴대폰 번호는 계정당 하나만 등록됩니다. 이미 쓰인 번호는 가입·문자 인증이 차단됩니다.",
      planHint: "무료 플랜: 월 5회 · 하루 2회 생성",
      onboardingHint:
        "가입 후 ①브랜드 ②지역 ③주제만 넣으면 이번 달 운영 계획이 정리됩니다.",
      workshopHint:
        "첫 편집본은 보통 1~2분. 키워드는 비워 두어도 주제에서 자동으로 잡습니다.",
    };
  }

  return {
    headline: "이메일·비밀번호로 가입",
    body: "가입 후 바로 이용할 수 있습니다.",
    emailHint: "",
    smsHint: "",
  };
}
