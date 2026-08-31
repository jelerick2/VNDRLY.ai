import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(
  new URL("../../.github/workflows/mobile-testflight.yml", import.meta.url),
  "utf8",
);

test("TestFlight is a dispatchable GitHub Actions job using Expo, not PowerShell", () => {
  assert.match(workflow, /^name:\s*Publish Mobile TestFlight\s*$/m);
  assert.match(workflow, /^\s*workflow_dispatch:\s*$/m);
  assert.match(workflow, /secrets\.EXPO_TOKEN/);
  assert.match(workflow, /eas whoami --non-interactive/);
  assert.match(
    workflow,
    /eas build[\s\S]*--platform ios[\s\S]*--profile production[\s\S]*--non-interactive/,
  );
  assert.match(workflow, /--message "\$\{\{ inputs\.message \}\} \(\$\{\{ github\.sha \}\}\)"/);
  assert.match(workflow, /eas submit[\s\S]*--platform ios[\s\S]*--non-interactive/);
  assert.doesNotMatch(workflow, /testflight-build\.ps1|ship-it\.ps1/);
});

test("TestFlight workflow does not rewrite production data or skip native gates", () => {
  assert.doesNotMatch(workflow, /DATABASE_URL|\.env\.production/);
  assert.doesNotMatch(workflow, /\b(?:DROP|TRUNCATE)\b/i);
  assert.doesNotMatch(workflow, /--skip-tests|AllowNativeChanges/i);
});
