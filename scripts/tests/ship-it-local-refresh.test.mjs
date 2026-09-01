import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shipScript = readFileSync(
  new URL("../ship-it.ps1", import.meta.url),
  "utf8",
);

test("full ship replaces both local servers with the deployed checkout", () => {
  assert.match(
    shipScript,
    /ensure-local-dev\.ps1"\) -Recover -Strict/,
    "full ship must force-restart both Vite and the API after deployment",
  );
});
