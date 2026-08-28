import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const nginx = await readFile(
  new URL("../server/vndrly.ai.nginx.conf", import.meta.url),
  "utf8",
);

const policies = [...nginx.matchAll(/add_header Permissions-Policy "([^"]+)" always;/g)].map(
  (match) => match[1],
);

test("vndrly.ai nginx allows same-origin microphone for Gate voice entry", () => {
  assert.ok(policies.length >= 1, "expected Permissions-Policy headers");
  for (const policy of policies) {
    assert.match(policy, /(?:^|,\s*)microphone=\(self\)(?:\s*,|$)/);
    assert.doesNotMatch(policy, /(?:^|,\s*)microphone=\(\)(?:\s*,|$)/);
    assert.match(policy, /(?:^|,\s*)geolocation=\(self\)(?:\s*,|$)/);
    assert.match(policy, /(?:^|,\s*)camera=\(\)(?:\s*,|$)/);
  }
});
