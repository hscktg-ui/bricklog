import { isAdminEmail } from "@/lib/api/auth";

/** Admin/owner accounts — studio features, quota bypass (server-only) */
export function hasOwnerFullAccess(email) {
  return isAdminEmail(email);
}

export function ownerPlanOverride(email) {
  if (!hasOwnerFullAccess(email)) return null;
  return {
    planId: "studio",
    source: "admin_email",
    bypassQuotas: true,
  };
}
