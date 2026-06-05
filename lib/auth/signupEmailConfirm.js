/**
 * 가입 직후 이메일 인증 링크 없이 바로 이용 — Supabase admin으로 확인 처리
 */

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin service role client
 * @param {string} userId
 */
export async function confirmSignupEmail(admin, userId) {
  if (!admin || !userId) {
    throw new Error("confirm_signup_email:missing_args");
  }
  const { error } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  if (error) throw error;
}
