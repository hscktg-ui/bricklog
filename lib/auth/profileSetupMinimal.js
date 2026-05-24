/**
 * 가입·프로필 — 최소 필드 (닉네임 + 호칭, 연락처 선택)
 */
import { sanitizeText } from "@/utils/sanitizeInput";
import {
  normalizeNickname,
  validateNickname,
  validateContactPhone,
  validatePreferredTitle,
} from "@/lib/auth/signupProfile";

export const PROFILE_SETUP_DEFAULTS = {
  preferredTitle: "디렉터님",
  brandCountBand: "1",
  roleType: "",
  companyName: "",
  primaryUseCase: "",
  mainIndustry: "",
};

export function validateMinimalProfilePayload(raw = {}) {
  const nicknameCheck = validateNickname(raw.nickname);
  if (!nicknameCheck.ok) return nicknameCheck;

  const titleCheck = validatePreferredTitle(
    raw.preferredTitle || PROFILE_SETUP_DEFAULTS.preferredTitle,
    raw.customTitle
  );
  if (!titleCheck.ok) return titleCheck;

  const phoneCheck = validateContactPhone(raw.contactPhone, { required: false });
  if (!phoneCheck.ok) return phoneCheck;

  const fullName = sanitizeText(raw.fullName);

  return {
    ok: true,
    value: {
      nickname: nicknameCheck.value,
      fullName: fullName || nicknameCheck.value,
      contactPhone: phoneCheck.value,
      companyName: "",
      roleType: "",
      preferredTitle: titleCheck.value,
      customTitle: titleCheck.customTitle,
      mainBrandName: sanitizeText(raw.mainBrandName) || "",
      mainIndustry: "",
      brandCountBand: PROFILE_SETUP_DEFAULTS.brandCountBand,
      intendedBrandCount: 1,
      primaryUseCase: "",
    },
  };
}
