/** E2E·SLA 스모크 공용 테스트 계정 (ensure-e2e-test-user.mjs 와 동일) */
export const E2E_TEST_EMAIL = "hundred-ux-smoke@briclog.ai";
export const E2E_TEST_PASSWORD = "BriclogUxSmoke9!";

export function applyE2eTestCredentialsToEnv(env = process.env) {
  if (!env.BRICLOG_TEST_EMAIL) env.BRICLOG_TEST_EMAIL = E2E_TEST_EMAIL;
  if (!env.BRICLOG_TEST_PASSWORD) env.BRICLOG_TEST_PASSWORD = E2E_TEST_PASSWORD;
  return env;
}
