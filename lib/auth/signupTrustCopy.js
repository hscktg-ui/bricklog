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
      smsHint: "휴대폰 번호는 계정당 하나 — 문자 인증으로 중복을 막습니다.",
      planHint: "무료 플랜: 월 5회 · 하루 2회 생성",
    };
  }

  return {
    headline: "이메일·비밀번호로 가입",
    body: "가입 후 바로 이용할 수 있습니다.",
    emailHint: "",
    smsHint: "",
  };
}
