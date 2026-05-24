import { createServiceSupabase } from "@/lib/supabase/server";
import { isSmsConfigured } from "@/lib/sms/sendSms";

export function isSmsDevMode() {
  return process.env.BRICLOG_SMS_DEV_MODE === "true";
}

export function hasServiceRole() {
  return Boolean(createServiceSupabase());
}

/** 로컬 npm run dev — service_role 없어도 OTP 인메모리 허용 */
export function isLocalDevelopment() {
  return process.env.NODE_ENV === "development";
}

/** OTP를 DB 대신 메모리에 둘지 (문자는 Solapi로 그대로 발송 가능) */
export function useInMemoryOtpStore() {
  if (hasServiceRole()) return false;
  return isSmsDevMode() || isLocalDevelopment();
}

/**
 * @returns {{ ready: boolean, code?: string, message: string, devMode: boolean }}
 */
export function getSmsReadiness() {
  const devMode = isSmsDevMode();

  if (!isSmsConfigured()) {
    return {
      ready: false,
      code: "SMS_CONFIG",
      devMode,
      message: devMode
        ? "개발 모드가 켜져 있지만 서버가 인식하지 못했습니다. .env.local에 BRICLOG_SMS_DEV_MODE=true 후 dev 서버를 재시작해 주세요."
        : "문자 발송이 설정되지 않았습니다. BRICLOG_SMS_DEV_MODE(로컬) 또는 Solapi 키(운영)가 필요합니다.",
    };
  }

  if (!hasServiceRole()) {
    if (devMode || isLocalDevelopment()) {
      return {
        ready: true,
        devMode: devMode || false,
        inMemoryOtp: true,
        message: devMode
          ? "개발 모드: 실제 문자 없이 화면에 인증번호가 표시됩니다."
          : "로컬 개발: 인증번호는 DB 대신 서버 메모리에 저장됩니다. 운영·이메일 중복 확인에는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.",
      };
    }
    return {
      ready: false,
      code: "SMS_SERVICE",
      devMode,
      message:
        "인증 서버(SUPABASE_SERVICE_ROLE_KEY)가 설정되지 않았습니다. Supabase → Project Settings → API → Secret keys에서 service_role 키를 .env.local에 넣어 주세요.",
    };
  }

  return {
    ready: true,
    devMode,
    message: devMode
      ? "개발 모드: 실제 문자 없이 인증번호가 화면에 표시됩니다."
      : "문자 발송 준비됨",
  };
}
