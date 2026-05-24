/** Client UI helper — role is set server-side from BRICLOG_ADMIN_EMAILS only. */

export function isProfileAdmin(profile) {
  return profile?.role === "ADMIN";
}
