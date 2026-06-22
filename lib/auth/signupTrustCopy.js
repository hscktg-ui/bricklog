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
      body: `가입 확인은 브릭로그(${smsSenderLabel})에서 보내는 「[브릭로그]」 문자로만 합니다. 외부 이메일 인증 링크는 보내지 않습니다.`,
      emailHint: "이메일은 로그인용입니다. 인증 메일은 보내지 않습니다.",
      smsHint: "문자가 안 오면 스팸함·수신 차단을 확인해 주세요.",
      planHint: "가입 후 무료 플랜은 월 5회·하루 2회까지 생성할 수 있어요.",
    };
  }

  return {
    headline: "이메일·비밀번호로 가입",
    body: "가입 후 바로 이용할 수 있습니다.",
    emailHint: "",
    smsHint: "",
  };
}
