import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { resolveProductionRuntimeCommit } from "../eas-production-runtime-commit.mjs";

const script = fileURLToPath(
  new URL("../eas-production-runtime-commit.mjs", import.meta.url),
);

const FULL = "abcd038d2eb4f645a20b50dd4660b89d27e4f78a";

test("prefers gitCommitHash when EAS recorded one", () => {
  assert.equal(
    resolveProductionRuntimeCommit([
      { gitCommitHash: "46527060fc914ed635d7b0497d13ddc95aa59766", message: `Full ship ${FULL}` },
    ]),
    "46527060fc914ed635d7b0497d13ddc95aa59766",
  );
});

test("falls back to a full SHA in the EAS build message when VCS is disabled", () => {
  assert.equal(
    resolveProductionRuntimeCommit([
      { gitCommitHash: null, message: `Full ship ${FULL}` },
    ]),
    FULL,
  );
});

test("rejects an empty production build list", () => {
  assert.throws(() => resolveProductionRuntimeCommit([]), /No finished production iOS builds/);
});

test("rejects a VCS-less build that has no SHA in the message", () => {
  assert.throws(
    () => resolveProductionRuntimeCommit([{ gitCommitHash: "", message: "Full ship TestFlight" }]),
    /no gitCommitHash/,
  );
});

test("CLI writes the resolved commit and exits 2 when unresolved", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "eas-runtime-commit-"));
  const okFile = path.join(dir, "ok.json");
  const badFile = path.join(dir, "bad.json");
  await writeFile(okFile, JSON.stringify([{ message: `Full ship ${FULL}` }]));
  await writeFile(badFile, JSON.stringify([{ message: "no sha here" }]));

  const ok = spawnSync(process.execPath, [script, okFile], { encoding: "utf8" });
  assert.equal(ok.status, 0);
  assert.equal(ok.stdout, FULL);

  const bad = spawnSync(process.execPath, [script, badFile], { encoding: "utf8" });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /no gitCommitHash/);
});
