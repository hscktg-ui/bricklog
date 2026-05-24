import { sanitizeText } from "@/utils/sanitizeInput";
import {
  BRAND_COUNT_BANDS,
  PREFERRED_TITLES,
  ROLE_TYPES,
  brandCountFromBand,
} from "@/lib/auth/profileOptions";
import { validateMinimalProfilePayload } from "@/lib/auth/profileSetupMinimal";

const NICKNAME_RE = /^[\p{L}\p{N}_]{2,20}$/u;

export function normalizeNickname(value) {
  return String(value || "").trim();
}

export function validateNickname(value) {
  const nickname = normalizeNickname(value);
  if (!nickname) {
    return { ok: false, message: "희망 닉네임을 입력해 주세요." };
  }
  if (nickname.length < 2 || nickname.length > 20) {
    return { ok: false, message: "닉네임은 2~20자로 입력해 주세요." };
  }
  if (!NICKNAME_RE.test(nickname)) {
    return {
      ok: false,
      message: "닉네임은 한글·영문·숫자·_(언더스코어)만 사용할 수 있습니다.",
    };
  }
  return { ok: true, value: nickname };
}

export function validateContactPhone(value, { required = false } = {}) {
  const raw = String(value || "").trim();
  if (!raw) {
    if (required) {
      return { ok: false, message: "연락처를 입력해 주세요." };
    }
    return { ok: true, value: null };
  }

  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("82") && digits.length >= 10) {
    digits = `0${digits.slice(2)}`;
  }
  if (!/^01[016789]\d{7,8}$/.test(digits)) {
    return {
      ok: false,
      message: "연락처 형식을 확인해 주세요. (예: 010-1234-5678)",
    };
  }
  if (digits.length === 11) {
    return {
      ok: true,
      value: `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`,
    };
  }
  return {
    ok: true,
    value: `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`,
  };
}

export function validatePreferredTitle(preferredTitle, customTitle) {
  const pt = String(preferredTitle || "").trim();
  if (!pt) {
    return { ok: false, message: "호칭을 선택해 주세요." };
  }
  if (!PREFERRED_TITLES.some((t) => t.value === pt)) {
    return { ok: false, message: "호칭을 선택해 주세요." };
  }
  if (pt === "custom") {
    const custom = sanitizeText(customTitle);
    if (!custom || custom.length < 2) {
      return { ok: false, message: "직접 입력 호칭을 2자 이상 입력해 주세요." };
    }
    return { ok: true, value: pt, customTitle: custom };
  }
  return { ok: true, value: pt, customTitle: null };
}

export function validateRoleType(value) {
  const v = String(value || "").trim();
  if (!v || !ROLE_TYPES.some((r) => r.value === v)) {
    return { ok: false, message: "직책 / 역할을 선택해 주세요." };
  }
  return { ok: true, value: v };
}

export function validateBrandCountBand(value) {
  const v = String(value || "").trim();
  if (!v || !BRAND_COUNT_BANDS.some((b) => b.value === v)) {
    return { ok: false, message: "사용 예정 브랜드 수를 선택해 주세요." };
  }
  return { ok: true, value: v, numericHint: brandCountFromBand(v) };
}

export function validatePrimaryUseCase(value) {
  const v = String(value || "").trim();
  if (!v) return { ok: true, value: "" };
  return { ok: true, value: v };
}

export function sanitizeSignupProfileFields(raw = {}) {
  return {
    nickname: normalizeNickname(raw.nickname),
    fullName: sanitizeText(raw.fullName) || "",
    contactPhone: sanitizeText(raw.contactPhone) || "",
    companyName: sanitizeText(raw.companyName) || "",
    roleType: sanitizeText(raw.roleType) || "",
    preferredTitle: sanitizeText(raw.preferredTitle) || "디렉터님",
    customTitle: sanitizeText(raw.customTitle) || "",
    mainBrandName: sanitizeText(raw.mainBrandName) || "",
    mainIndustry: sanitizeText(raw.mainIndustry) || "",
    brandCountBand: sanitizeText(raw.brandCountBand) || "",
    primaryUseCase: sanitizeText(raw.primaryUseCase) || "",
  };
}

/**
 * STEP 2 프로필 (건너뛰기 가능 — 닉네임만 있으면 완료로 간주)
 * @param {Record<string, unknown>} raw
 * @param {{ strict?: boolean }} [opts]
 */
/** 기본: 닉네임 + 호칭만 필수 (opts.strict=true 시 구버전 전체 검증) */
export function validateSignupProfilePayload(raw = {}, opts = {}) {
  if (opts.strict === true) {
    return validateSignupProfilePayloadLegacy(raw);
  }
  return validateMinimalProfilePayload(raw);
}

function validateSignupProfilePayloadLegacy(raw = {}) {
  const nicknameCheck = validateNickname(raw.nickname);
  if (!nicknameCheck.ok) return nicknameCheck;

  const fullName = sanitizeText(raw.fullName);
  if (!fullName) {
    return { ok: false, message: "이름을 입력해 주세요." };
  }

  const phoneCheck = validateContactPhone(raw.contactPhone, { required: true });
  if (!phoneCheck.ok) return phoneCheck;

  const roleCheck = validateRoleType(raw.roleType);
  if (!roleCheck.ok) return roleCheck;

  const titleCheck = validatePreferredTitle(
    raw.preferredTitle,
    raw.customTitle
  );
  if (!titleCheck.ok) return titleCheck;

  const bandCheck = validateBrandCountBand(raw.brandCountBand);
  if (!bandCheck.ok) return bandCheck;

  const useCheck = validatePrimaryUseCase(raw.primaryUseCase);

  return {
    ok: true,
    value: {
      nickname: nicknameCheck.value,
      fullName: fullName || nicknameCheck.value,
      contactPhone: phoneCheck.value,
      companyName: sanitizeText(raw.companyName) || "",
      roleType: roleCheck.ok ? roleCheck.value : "",
      preferredTitle: titleCheck.ok ? titleCheck.value : "디렉터님",
      customTitle: titleCheck.ok ? titleCheck.customTitle : null,
      mainBrandName: sanitizeText(raw.mainBrandName) || "",
      mainIndustry: sanitizeText(raw.mainIndustry) || "",
      brandCountBand: bandCheck.ok ? bandCheck.value : "",
      intendedBrandCount: bandCheck.ok ? bandCheck.numericHint : null,
      primaryUseCase: useCheck.value,
    },
  };
}

/** @deprecated use profileNeedsSetup from profilePersonalization */
export function profileNeedsSignupCompletion(profile) {
  return !normalizeNickname(profile?.nickname);
}

export function onboardingHintFromProfile(profile) {
  const band = profile?.brandCountBand;
  if (band === "agency_multi" || band === "10_plus") {
    return "브랜드를 여러 개 운영하신다면 브랜드별로 나눠 두면 톤이 훨씬 편해요.";
  }
  if (band === "2_3" || band === "4_10") {
    return "브랜드 플레이북을 먼저 만들어 두면 채널별 초안이 빨라집니다.";
  }
  return null;
}
