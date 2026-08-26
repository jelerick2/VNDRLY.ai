import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowUrl = new URL(
  "../../.github/workflows/mobile-ota.yml",
  import.meta.url,
);

const workflow = await readFile(workflowUrl, "utf8");

test("mobile OTA is a manual, guarded iOS production release", () => {
  assert.match(workflow, /^\s*workflow_dispatch:\s*$/m);
  assert.doesNotMatch(workflow, /^\s*push:\s*$/m);
  assert.match(workflow, /secrets\.EXPO_TOKEN/);
  assert.match(workflow, /eas build:list/);
  assert.match(workflow, /node scripts\/mobile-release-impact\.mjs/);
  assert.match(workflow, /--base-ref/);
  assert.match(
    workflow,
    /pnpm --filter @workspace\/vndrly-mobile run typecheck/,
  );
  assert.match(workflow, /pnpm --filter @workspace\/vndrly-mobile run test/);
  assert.match(
    workflow,
    /eas update[\s\S]*--channel production[\s\S]*--environment production[\s\S]*--platform ios/,
  );
  assert.match(workflow, /--non-interactive/);
});

test("mobile OTA cannot bypass validation or mutate production data", () => {
  assert.doesNotMatch(workflow, /AllowNativeChanges|--skip-tests/i);
  assert.doesNotMatch(workflow, /DATABASE_URL|\.env\.production/);
  assert.doesNotMatch(workflow, /\b(?:DROP|TRUNCATE|DELETE)\b/i);
  assert.doesNotMatch(workflow, /eas (?:build(?!:)|submit)\b/);
});
