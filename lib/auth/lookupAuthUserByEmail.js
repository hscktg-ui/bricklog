import { validateEmailFormat } from "@/lib/auth/emailFormat";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} service
 * @param {string} emailRaw
 * @returns {Promise<{ user: import('@supabase/supabase-js').User | null, error: Error | null }>}
 */
export async function lookupAuthUserByEmail(service, emailRaw) {
  const check = validateEmailFormat(emailRaw);
  if (!check.ok) return { user: null, error: null };
  if (!service) {
    return { user: null, error: new Error("missing_service_client") };
  }

  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  if (url && serviceKey) {
    const filter = `email.eq.${check.value}`;
    try {
      const res = await fetch(
        `${url}/auth/v1/admin/users?per_page=1&page=1&filter=${encodeURIComponent(filter)}`,
        {
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          cache: "no-store",
        }
      );
      if (res.ok) {
        const payload = await res.json().catch(() => ({}));
        const user = payload?.users?.[0] ?? null;
        if (user?.email?.toLowerCase() === check.value) {
          return { user, error: null };
        }
        if (Array.isArray(payload?.users) && payload.users.length === 0) {
          return { user: null, error: null };
        }
      }
    } catch (err) {
      console.warn("[lookupAuthUserByEmail] filter lookup failed", err);
    }
  }

  return lookupAuthUserByEmailPaged(service, check.value);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} service
 * @param {string} email
 */
async function lookupAuthUserByEmailPaged(service, email) {
  const target = email.toLowerCase();
  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) return { user: null, error };
    const users = data?.users ?? [];
    const hit = users.find((u) => u.email?.toLowerCase() === target) ?? null;
    if (hit) return { user: hit, error: null };
    if (users.length < 200) break;
  }
  return { user: null, error: null };
}
