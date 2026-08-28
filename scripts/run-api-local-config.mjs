export function shouldLoadLocalEnvironment(env) {
  return env.VNDRLY_ISOLATED_TEST_DB !== "1";
}
