import { requireAdminApi } from "@/lib/api/adminGuard";

export async function requireAdmin(request) {
  const gate = await requireAdminApi(request);
  if (gate.denied || gate.rateLimited) {
    return {
      error: {
        status: 404,
        message: "Not found",
      },
    };
  }
  return gate.auth;
}
