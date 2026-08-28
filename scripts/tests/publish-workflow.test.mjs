import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowUrl = new URL(
  "../../.github/workflows/publish.yml",
  import.meta.url,
);

const workflow = await readFile(workflowUrl, "utf8");

test("Publish deploys a successful web build with guarded VPS access", () => {
  assert.match(workflow, /^\s*workflow_dispatch:\s*$/m);
  assert.match(workflow, /^\s{2}deploy-web:\s*$/m);
  assert.match(workflow, /^\s{4}needs:\s*build\s*$/m);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /actions\/download-artifact@v4/);

  for (const secret of ["VPS_HOST", "VPS_USER", "VPS_PASSWORD", "VPS_PORT"]) {
    assert.match(workflow, new RegExp(`secrets\\.${secret}`));
  }

  assert.match(
    workflow,
    /DEST_DIR:\s*\/var\/www\/vndrly\/artifacts\/vndrly\/dist\/public\/?/,
  );
  assert.match(workflow, /test -d ["']?\$DEST_DIR["']?/);
  assert.match(workflow, /test -w ["']?\$DEST_DIR["']?/);
  assert.match(workflow, /rsync[\s\S]*?--archive[\s\S]*?--compress/);
});

test("Publish web deployment cannot rewrite production data or server configuration", () => {
  assert.doesNotMatch(workflow, /\.env\.production/);
  assert.doesNotMatch(workflow, /DATABASE_URL/);
  assert.doesNotMatch(workflow, /\b(?:DROP|TRUNCATE)\b/i);
  assert.doesNotMatch(workflow, /systemctl|nginx|certbot/);
});
