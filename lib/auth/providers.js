/** Supabase Auth OAuth providers (대시보드에서 활성화 + .env 플래그 필요) */

export const OAUTH_PROVIDERS = [
  {
    id: "google",
    label: "Google로 계속하기",
    className: "border-[#E8EBED] bg-white text-[#191F28] hover:bg-[#FAFBFC]",
  },
  {
    id: "kakao",
    label: "Kakao로 계속하기",
    className: "border-[#FEE500] bg-[#FEE500] text-[#191F28] hover:bg-[#F5DC00]",
  },
  {
    id: "naver",
    label: "Naver로 계속하기",
    className: "border-[#03C75A] bg-[#03C75A] text-white hover:bg-[#02B350]",
  },
];

/** NEXT_PUBLIC_OAUTH_GOOGLE=true 형식 — 미설정 시 버튼 숨김 */
export function isOAuthProviderEnabled(id) {
  const key = `NEXT_PUBLIC_OAUTH_${String(id).toUpperCase()}`;
  const flag = process.env[key];
  return flag === "true" || flag === "1";
}

export function getEnabledOAuthProviders() {
  return OAUTH_PROVIDERS.filter((p) => isOAuthProviderEnabled(p.id));
}

export function resolveAuthProvider(user) {
  if (!user) return "email";
  const app = user.app_metadata?.provider;
  if (app && app !== "email") return app;
  const fromIdentities = user.identities?.[0]?.provider;
  return fromIdentities || "email";
}
